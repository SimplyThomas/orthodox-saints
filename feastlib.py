"""feastlib.py — the Feasts & Fasts database (FF-####).

Sibling of the saints pipeline: data/feasts.csv is SOURCE OF TRUTH, this module
loads it, assigns blank FF-#### ids (writing them back), validates fail-loud,
and emits public/feasts.json. Orchestrated by build.py; never run directly.

Date-token grammar (columns Begins / Ends / Forefeast / Apodosis; complete for
the Orthodox calendar — spec docs/superpowers/specs/2026-07-05-feasts-fasts-
database-design.md):
  fixed     'Dec 25'
  paschal   'P+49' / 'P-48'        (offset in days from Pascha; Pascha = P+0)
  anchored  'Sun before Dec 25'    (nearest such weekday strictly within 7 days)
The CYCLE (fixed/paschal/hybrid) is derived from the tokens, never authored.
"""

from __future__ import annotations

import csv
import json
import re
import urllib.parse
from pathlib import Path

import pascha as pascha_mod

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
PUBLIC = ROOT / "public"
FEASTS_CSV = DATA / "feasts.csv"
FEAST_PROFILES_DIR = ROOT / "src" / "content" / "feasts"

FEASTS_HEADER = [
    "Feast ID", "Name", "Also Known As", "Category", "Dedication",
    "Begins", "Ends", "Forefeast", "Apodosis",
    "Fasting Discipline", "Fasting Notes", "Brief", "Customs & Traditions",
    "Tradition of Observance", "Related Saints", "Related Feasts",
    "Icon", "Notes", "Sources",
]

# Controlled columns -> vocabulary category. Tradition of Observance reuses the
# existing Tradition of Veneration terms (blank = pan-Orthodox).
CONTROLLED = {
    "Category": "Feast Category",
    "Dedication": "Dedication",
    "Fasting Discipline": "Fasting Discipline",
    "Tradition of Observance": "Tradition of Veneration",
}
SINGLE_VALUE = {"Category", "Dedication", "Fasting Discipline"}
REQUIRED = ["Name", "Category", "Begins", "Brief", "Sources"]
DATE_COLUMNS = ["Begins", "Ends", "Forefeast", "Apodosis"]
MULTI_SEP = "; "

FF_ID_RE = re.compile(r"^FF-\d{4,}$")
OS_ID_RE = re.compile(r"^OS-\d{4,}$")

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH_INDEX = {m: i + 1 for i, m in enumerate(MONTHS)}
# Feb 29 is allowed, as in the saints table (leap-day commemorations).
MONTH_MAX_DAY = {"Jan": 31, "Feb": 29, "Mar": 31, "Apr": 30, "May": 31,
                 "Jun": 30, "Jul": 31, "Aug": 31, "Sep": 30, "Oct": 31,
                 "Nov": 30, "Dec": 31}

# Day-of-week index follows the JS Date.getDay() convention (0=Sun..6=Sat) so
# the frontend consumes `dow` without translation.
DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
DOW_INDEX = {d: i for i, d in enumerate(DOW)}

FIXED_TOKEN_RE = re.compile(rf"^({'|'.join(MONTHS)}) (\d{{1,2}})$")
PASCHAL_TOKEN_RE = re.compile(r"^P([+-]\d{1,3})$")
ANCHORED_TOKEN_RE = re.compile(
    rf"^({'|'.join(DOW)}) (before|after) ({'|'.join(MONTHS)}) (\d{{1,2}})$")

# Zacchaeus Sunday (P-77) .. the local All-Saints Sundays (P+63, the second
# Sunday after Pentecost — the latest entry in the paschal cycle).
PASCHAL_OFFSET_MIN, PASCHAL_OFFSET_MAX = -78, 63

# Short JSON keys, stable (the saints data.json convention). Maps CSV column ->
# json key; date columns are handled structurally in to_record().
JSON_KEYS = {
    "Feast ID": "id", "Name": "name", "Also Known As": "aka",
    "Category": "category", "Dedication": "dedication",
    "Fasting Discipline": "fasting", "Fasting Notes": "fastingNotes",
    "Brief": "brief", "Customs & Traditions": "customs",
    "Tradition of Observance": "observance",
    "Related Saints": "relatedSaints", "Related Feasts": "relatedFeasts",
    "Icon": "icon", "Notes": "notes", "Sources": "sources",
}
ARRAY_COLUMNS = {"Also Known As", "Tradition of Observance",
                 "Related Saints", "Related Feasts", "Sources"}

# Span-shaped categories are expected to carry an Ends; fasts a discipline.
SPAN_CATEGORIES = {"Fast Season", "Fast-Free Week"}
FAST_CATEGORIES = {"Fast Season", "Fast Day"}


def split_multi(value: str) -> list[str]:
    return [v.strip() for v in value.split(MULTI_SEP) if v.strip()]


# --------------------------------------------------------------------------- #
# Date tokens
# --------------------------------------------------------------------------- #
def _check_month_day(mon: str, day: int) -> str | None:
    if not 1 <= day <= MONTH_MAX_DAY[mon]:
        return f"day {day} out of range for {mon}"
    return None


def parse_date_token(tok: str) -> tuple[dict | None, str | None]:
    """Parse one date token -> (parsed, error). Exactly one is non-None."""
    tok = tok.strip()
    m = FIXED_TOKEN_RE.match(tok)
    if m:
        mon, day = m.group(1), int(m.group(2))
        err = _check_month_day(mon, day)
        if err:
            return None, f"{tok!r}: {err}"
        return {"type": "fixed", "month": MONTH_INDEX[mon], "day": day}, None
    m = PASCHAL_TOKEN_RE.match(tok)
    if m:
        offset = int(m.group(1))
        if not PASCHAL_OFFSET_MIN <= offset <= PASCHAL_OFFSET_MAX:
            return None, (f"{tok!r}: paschal offset outside "
                          f"[{PASCHAL_OFFSET_MIN}, {PASCHAL_OFFSET_MAX}]")
        return {"type": "paschal", "offset": offset}, None
    m = ANCHORED_TOKEN_RE.match(tok)
    if m:
        dow, rel, mon, day = m.group(1), m.group(2), m.group(3), int(m.group(4))
        err = _check_month_day(mon, day)
        if err:
            return None, f"{tok!r}: {err}"
        return {"type": "anchored", "dow": DOW_INDEX[dow], "rel": rel,
                "month": MONTH_INDEX[mon], "day": day}, None
    return None, (f"{tok!r}: not a date token (want 'Mon D', 'P+n'/'P-n', "
                  f"or 'Dow before|after Mon D')")


def derive_cycle(parsed: dict[str, dict | None]) -> str:
    """fixed | paschal | hybrid, from the row's parsed date tokens.
    Anchored tokens resolve from the fixed calendar, so they count as fixed."""
    kinds = {p["type"] for p in parsed.values() if p}
    has_paschal = "paschal" in kinds
    has_fixed = bool(kinds & {"fixed", "anchored"})
    if has_paschal and has_fixed:
        return "hybrid"
    return "paschal" if has_paschal else "fixed"


# --------------------------------------------------------------------------- #
# Load / assign ids / write back (same contract as build.py's saints handling)
# --------------------------------------------------------------------------- #
def load_feasts() -> tuple[list[str], list[dict[str, str]]]:
    if not FEASTS_CSV.exists():
        return FEASTS_HEADER, []
    with open(FEASTS_CSV, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if header != FEASTS_HEADER:
            raise SystemExit(
                f"FATAL: {FEASTS_CSV} header must be {FEASTS_HEADER}, "
                f"got {header!r}")
        rows = [dict(zip(header, r)) for r in reader if any(c.strip() for c in r)]
    return FEASTS_HEADER, rows


def assign_ids(rows: list[dict[str, str]]) -> bool:
    """Assign the next sequential FF-#### to any blank Feast ID. Mutates rows
    in place; returns True if any ID was assigned. Pure (no file I/O)."""
    max_num = 0
    for r in rows:
        m = re.match(r"^FF-(\d+)$", r["Feast ID"].strip())
        if m:
            max_num = max(max_num, int(m.group(1)))
    assigned = False
    for r in rows:
        if not r["Feast ID"].strip():
            max_num += 1
            r["Feast ID"] = f"FF-{max_num:04d}"
            assigned = True
            print(f"  assigned {r['Feast ID']}  {r['Name']}")
    return assigned


def write_feasts(header: list[str], rows: list[dict[str, str]]) -> None:
    with open(FEASTS_CSV, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)
    print(f"  wrote stable IDs back to {FEASTS_CSV.relative_to(ROOT)}")


# --------------------------------------------------------------------------- #
# Validate (fail loud; same (errors, warnings) contract as build.py)
# --------------------------------------------------------------------------- #
def validate(rows: list[dict[str, str]], vocab: dict[str, set[str]],
             saint_ids: set[str]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    id_set = {r["Feast ID"].strip() for r in rows}
    seen_names: dict[str, str] = {}
    seen_ids: set[str] = set()

    for r in rows:
        fid = r["Feast ID"].strip()
        name = r["Name"].strip()
        where = f"{fid or '(no id)'} {name or '(no name)'}"

        if fid and not FF_ID_RE.match(fid):
            errors.append(f"{where}: Feast ID must be FF-#### (4+ digits)")
        if fid in seen_ids:
            errors.append(f"{where}: duplicate Feast ID")
        seen_ids.add(fid)

        for col in REQUIRED:
            if not r[col].strip():
                errors.append(f"{where}: required column '{col}' is empty")

        for col, cat in CONTROLLED.items():
            val = r[col].strip()
            if not val:
                continue
            if col in SINGLE_VALUE and MULTI_SEP in val:
                errors.append(f"{where}: '{col}' is single-value, got {val!r}")
                continue
            terms = [val] if col in SINGLE_VALUE else split_multi(val)
            for t in terms:
                if t not in vocab.get(cat, set()):
                    errors.append(f"{where}: '{t}' not in vocabulary "
                                  f"category '{cat}' (column '{col}')")

        parsed: dict[str, dict | None] = {}
        for col in DATE_COLUMNS:
            val = r[col].strip()
            if not val:
                parsed[col] = None
                continue
            p, err = parse_date_token(val)
            parsed[col] = p
            if err:
                errors.append(f"{where}: {col}: {err}")

        category = r["Category"].strip()
        if category in SPAN_CATEGORIES and not r["Ends"].strip():
            warnings.append(f"{where}: Category '{category}' usually spans "
                            f"days — no 'Ends' set")
        if category in FAST_CATEGORIES and not r["Fasting Discipline"].strip():
            warnings.append(f"{where}: fast entry without a Fasting Discipline")

        for sid in split_multi(r["Related Saints"]):
            if not OS_ID_RE.match(sid):
                errors.append(f"{where}: Related Saints entry {sid!r} "
                              f"is not OS-####")
            elif sid not in saint_ids:
                errors.append(f"{where}: Related Saints {sid} not in "
                              f"data/saints.csv")
        for rfid in split_multi(r["Related Feasts"]):
            if rfid == fid:
                errors.append(f"{where}: Related Feasts references itself")
            elif rfid not in id_set:
                errors.append(f"{where}: Related Feasts {rfid} not in "
                              f"data/feasts.csv")

        if name:
            if name in seen_names:
                warnings.append(f"duplicate feast name {name!r} "
                                f"({seen_names[name]} and {fid})")
            seen_names[name] = fid

    p_errors, p_warnings = validate_feast_profiles(id_set)
    errors.extend(p_errors)
    warnings.extend(p_warnings)
    return errors, warnings


FEAST_PROFILE_FILE_RE = re.compile(r"^(FF-\d{4,})\.yaml$")
FEAST_PROFILE_ID_RE = re.compile(r"^id:\s*(FF-\d{4,})\s*$", re.M)


def validate_feast_profiles(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """Cross-check src/content/feasts/*.yaml (the saints-profile pattern):
    filename is FF-####.yaml, names a real feast, `id:` matches the filename.
    Shape validation is Zod's job at astro build; this is the Python data gate.
    Empty/missing dir is allowed (no profiles yet)."""
    errors: list[str] = []
    warnings: list[str] = []
    if not FEAST_PROFILES_DIR.is_dir():
        return errors, warnings
    for path in sorted(FEAST_PROFILES_DIR.glob("*.yaml")):
        m = FEAST_PROFILE_FILE_RE.match(path.name)
        if not m:
            errors.append(f"feasts/{path.name}: name must be FF-####.yaml")
            continue
        fid = m.group(1)
        if fid not in valid_ids:
            errors.append(f"feasts/{path.name}: {fid} is not a known Feast ID")
        body_id = FEAST_PROFILE_ID_RE.search(path.read_text(encoding="utf-8"))
        if not body_id:
            errors.append(f"feasts/{path.name}: missing an `id:` field")
        elif body_id.group(1) != fid:
            errors.append(f"feasts/{path.name}: id {body_id.group(1)} != "
                          f"filename {fid}")
    return errors, warnings


# --------------------------------------------------------------------------- #
# Emit
# --------------------------------------------------------------------------- #
def _sort_key(rec: dict) -> tuple[int, int]:
    """Fixed-calendar entries first in date order, then the paschal cycle in
    offset order (mirrors the saints' movable-sorts-last convention)."""
    b = rec["begins"]
    if b["type"] == "paschal":
        return (1, b["offset"])
    return (0, b["month"] * 100 + b["day"])


def to_record(r: dict[str, str]) -> dict:
    rec: dict = {}
    for col, key in JSON_KEYS.items():
        val = r[col].strip()
        if col == "Icon":
            q = urllib.parse.quote_plus(r["Name"].strip())
            rec[key] = val or (f"https://www.google.com/search?tbm=isch&q={q}"
                               f"+orthodox+icon")
            continue
        if not val:
            continue  # empty optionals are omitted from the JSON
        rec[key] = split_multi(val) if col in ARRAY_COLUMNS else val
    parsed: dict[str, dict | None] = {}
    for col in DATE_COLUMNS:
        val = r[col].strip()
        if val:
            p, _err = parse_date_token(val)
            parsed[col] = p
            if p:
                rec[col.lower()] = p
        else:
            parsed[col] = None
    rec["cycle"] = derive_cycle(parsed)
    return rec


def emit_feasts_json(rows: list[dict[str, str]]) -> list[dict]:
    records = sorted((to_record(r) for r in rows), key=_sort_key)
    payload = {"feasts": records, "pascha": pascha_mod.pascha_table(2020, 2040)}
    PUBLIC.mkdir(exist_ok=True)
    with open(PUBLIC / "feasts.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  wrote public/feasts.json ({len(records)} feasts)")
    return records
