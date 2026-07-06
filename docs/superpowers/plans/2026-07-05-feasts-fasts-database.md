# Feasts & Fasts Database (`FF-####`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A second structured database (`data/feasts.csv`, `FF-####` ids) of every Orthodox liturgical feast, fast, and observance, validated and emitted by the build (`public/feasts.json`), with a rich-prose content collection and a feastgen research pipeline — backend only.

**Architecture:** Mirrors the saints pipeline: CSV source of truth → `feastlib.py` (load / assign IDs / validate / emit), orchestrated by `build.py`; a three-form date-token grammar (`Mon D`, `P±n`, `Dow before|after Mon D`) covers the whole calendar with the cycle *derived*; `pascha.py` implements the Julian computus; rich prose lives in a `feasts` Astro content collection with the same draft/reviewed gate; `tools/feastgen/` mirrors `tools/profilegen/`.

**Tech Stack:** Python 3.11 stdlib (csv, re, json, datetime), unittest; Astro content collections + Zod (TS); Claude agents for research.

**Spec:** `docs/superpowers/specs/2026-07-05-feasts-fasts-database-design.md`

---

### Task 1: `pascha.py` — Orthodox Pascha computus

**Files:**
- Create: `pascha.py`
- Test: `tests/test_pascha.py`

- [ ] **Step 1: Write the failing tests**

```python
"""Unit tests for pascha.py — the Orthodox Pascha computus."""

import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pascha  # noqa: E402


class TestPascha(unittest.TestCase):
    # Known Orthodox Pascha dates on the civil (Gregorian) calendar.
    KNOWN = {
        2020: date(2020, 4, 19),
        2021: date(2021, 5, 2),
        2022: date(2022, 4, 24),
        2023: date(2023, 4, 16),
        2024: date(2024, 5, 5),
        2025: date(2025, 4, 20),   # coincided with Western Easter
        2026: date(2026, 4, 12),
        2027: date(2027, 5, 2),
    }

    def test_known_years(self):
        for year, expected in self.KNOWN.items():
            self.assertEqual(pascha.pascha(year), expected, f"Pascha {year}")

    def test_range_guard(self):
        with self.assertRaises(ValueError):
            pascha.pascha(1899)
        with self.assertRaises(ValueError):
            pascha.pascha(2100)

    def test_pascha_table(self):
        table = pascha.pascha_table(2024, 2026)
        self.assertEqual(table, {"2024": "2024-05-05",
                                 "2025": "2025-04-20",
                                 "2026": "2026-04-12"})
```

- [ ] **Step 2: Run to verify failure** — `python -m unittest tests.test_pascha -v` → FAIL (`ModuleNotFoundError: pascha`)

- [ ] **Step 3: Implement `pascha.py`**

```python
"""Orthodox Pascha computus (Meeus' Julian algorithm).

Pascha is computed on the JULIAN calendar and mapped to the Gregorian civil
calendar by adding the Julian–Gregorian offset, which is a constant 13 days
for 1900-03-14 .. 2100-02-28 — hence the hard validity window 1900–2099.
The frontend gets a resolved table (pascha_table) inside public/feasts.json,
so it never needs to run the computus for the years that matter.
"""

from __future__ import annotations

from datetime import date, timedelta

JULIAN_GREGORIAN_OFFSET_DAYS = 13  # valid 1900–2099


def pascha(year: int) -> date:
    """Orthodox Pascha for `year`, as a Gregorian (civil-calendar) date."""
    if not 1900 <= year <= 2099:
        raise ValueError(f"pascha(): year {year} outside the 13-day-offset "
                         "validity window 1900–2099")
    a = year % 4
    b = year % 7
    c = year % 19
    d = (19 * c + 15) % 30
    e = (2 * a + 4 * b - d + 34) % 7
    month = (d + e + 114) // 31
    day = ((d + e + 114) % 31) + 1
    return date(year, month, day) + timedelta(days=JULIAN_GREGORIAN_OFFSET_DAYS)


def pascha_table(start: int = 2020, end: int = 2040) -> dict[str, str]:
    """{'2024': '2024-05-05', ...} for start..end inclusive (feasts.json)."""
    return {str(y): pascha(y).isoformat() for y in range(start, end + 1)}
```

- [ ] **Step 4: Run to verify pass** — `python -m unittest tests.test_pascha -v` → all PASS
- [ ] **Step 5: Commit** — `git add pascha.py tests/test_pascha.py && git commit -m "feat: Orthodox Pascha computus (Meeus Julian algorithm, 1900-2099)"`

---

### Task 2: `feastlib.py` — grammar, load, ID assignment, validation, emit

**Files:**
- Create: `feastlib.py`
- Test: `tests/test_feastlib.py`

The module follows build.py idioms exactly: module constants, `(errors, warnings)` validators, blank-ID assignment written back, JSON with short stable keys.

- [ ] **Step 1: Write failing tests for the date-token grammar**

```python
"""Unit tests for feastlib.py — the Feasts & Fasts pipeline."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import feastlib  # noqa: E402


FEAST_VOCAB = {
    "Feast Category": {"Feast of Feasts", "Great Feast", "Feast", "Fast Season",
                       "Fast Day", "Fast-Free Week", "Observance"},
    "Dedication": {"Lord", "Theotokos", "Cross", "Forerunner", "Apostles",
                   "Angels", "Saints", "Departed"},
    "Fasting Discipline": {"Strict Fast", "Wine & Oil", "Fish Allowed",
                           "Dairy Allowed", "Fast-Free", "Varies"},
    "Tradition of Veneration": {"Russian", "Greek", "Serbian"},
}


def valid_feast(**overrides):
    row = {col: "" for col in feastlib.FEASTS_HEADER}
    row.update({
        "Feast ID": "FF-0001",
        "Name": "Nativity of Christ",
        "Category": "Great Feast",
        "Dedication": "Lord",
        "Begins": "Dec 25",
        "Brief": "The feast of the Incarnation.",
        "Sources": "OCA",
    })
    row.update(overrides)
    return row


class TestDateTokens(unittest.TestCase):
    def test_fixed(self):
        parsed, err = feastlib.parse_date_token("Dec 25")
        self.assertIsNone(err)
        self.assertEqual(parsed, {"type": "fixed", "month": 12, "day": 25})

    def test_paschal(self):
        parsed, err = feastlib.parse_date_token("P+49")
        self.assertIsNone(err)
        self.assertEqual(parsed, {"type": "paschal", "offset": 49})
        parsed, err = feastlib.parse_date_token("P-48")
        self.assertEqual(parsed["offset"], -48)

    def test_anchored(self):
        parsed, err = feastlib.parse_date_token("Sun before Dec 25")
        self.assertIsNone(err)
        self.assertEqual(parsed, {"type": "anchored", "dow": 0,
                                  "rel": "before", "month": 12, "day": 25})

    def test_bad_tokens(self):
        for tok in ("Dec 32", "P+90", "P-100", "Funday before Dec 25",
                    "25 Dec", "P49", "Sun near Dec 25", "Feb 30"):
            parsed, err = feastlib.parse_date_token(tok)
            self.assertIsNotNone(err, f"{tok!r} should be rejected")

    def test_feb_29_allowed(self):
        parsed, err = feastlib.parse_date_token("Feb 29")
        self.assertIsNone(err)


class TestCycle(unittest.TestCase):
    def test_fixed(self):
        self.assertEqual(feastlib.derive_cycle(
            {"Begins": {"type": "fixed", "month": 12, "day": 25}}), "fixed")

    def test_anchored_counts_as_fixed(self):
        self.assertEqual(feastlib.derive_cycle(
            {"Begins": {"type": "anchored", "dow": 0, "rel": "before",
                        "month": 12, "day": 25}}), "fixed")

    def test_paschal(self):
        self.assertEqual(feastlib.derive_cycle(
            {"Begins": {"type": "paschal", "offset": -48},
             "Ends": {"type": "paschal", "offset": -9}}), "paschal")

    def test_hybrid_apostles_fast(self):
        self.assertEqual(feastlib.derive_cycle(
            {"Begins": {"type": "paschal", "offset": 57},
             "Ends": {"type": "fixed", "month": 6, "day": 28}}), "hybrid")


class TestValidate(unittest.TestCase):
    def _validate(self, rows, saint_ids=frozenset({"OS-0001"})):
        return feastlib.validate(rows, FEAST_VOCAB, set(saint_ids))

    def test_valid_row_clean(self):
        errors, _ = self._validate([valid_feast()])
        self.assertEqual(errors, [])

    def test_required_fields(self):
        errors, _ = self._validate([valid_feast(Brief="")])
        self.assertTrue(any("Brief" in e for e in errors))

    def test_unknown_vocab_term(self):
        errors, _ = self._validate([valid_feast(Category="Mega Feast")])
        self.assertTrue(any("Mega Feast" in e for e in errors))

    def test_single_value_no_multi(self):
        errors, _ = self._validate([valid_feast(Category="Great Feast; Feast")])
        self.assertTrue(any("single-value" in e for e in errors))

    def test_bad_date_token(self):
        errors, _ = self._validate([valid_feast(Begins="Dec 32")])
        self.assertTrue(any("Dec 32" in e for e in errors))

    def test_related_saint_must_exist(self):
        errors, _ = self._validate([valid_feast(**{"Related Saints": "OS-9999"})])
        self.assertTrue(any("OS-9999" in e for e in errors))

    def test_related_feast_must_exist_and_not_self(self):
        rows = [valid_feast(),
                valid_feast(**{"Feast ID": "FF-0002", "Name": "Theophany",
                               "Begins": "Jan 6",
                               "Related Feasts": "FF-0002; FF-0777"})]
        errors, _ = self._validate(rows)
        self.assertTrue(any("itself" in e for e in errors))
        self.assertTrue(any("FF-0777" in e for e in errors))

    def test_duplicate_id(self):
        rows = [valid_feast(), valid_feast(Name="Other")]
        errors, _ = self._validate(rows)
        self.assertTrue(any("duplicate" in e.lower() for e in errors))

    def test_duplicate_name_warns(self):
        rows = [valid_feast(),
                valid_feast(**{"Feast ID": "FF-0002"})]
        _, warnings = self._validate(rows)
        self.assertTrue(any("duplicate" in w.lower() for w in warnings))

    def test_span_category_without_ends_warns(self):
        _, warnings = self._validate(
            [valid_feast(Category="Fast Season", Name="Great Lent",
                         Begins="P-48")])
        self.assertTrue(any("Ends" in w for w in warnings))


class TestAssignIds(unittest.TestCase):
    def test_assigns_sequential_after_max(self):
        rows = [valid_feast(),
                valid_feast(**{"Feast ID": "FF-0007", "Name": "B"}),
                valid_feast(**{"Feast ID": "", "Name": "C"})]
        changed = feastlib.assign_ids(rows)
        self.assertTrue(changed)
        self.assertEqual(rows[2]["Feast ID"], "FF-0008")

    def test_no_change_when_all_assigned(self):
        rows = [valid_feast()]
        self.assertFalse(feastlib.assign_ids(rows))


class TestRecord(unittest.TestCase):
    def test_to_record_shapes(self):
        rec = feastlib.to_record(valid_feast(**{
            "Also Known As": "Christmas; Winter Pascha",
            "Related Saints": "OS-0001",
            "Ends": "",
            "Forefeast": "Dec 20",
            "Apodosis": "Dec 31",
        }))
        self.assertEqual(rec["id"], "FF-0001")
        self.assertEqual(rec["aka"], ["Christmas", "Winter Pascha"])
        self.assertEqual(rec["begins"], {"type": "fixed", "month": 12, "day": 25})
        self.assertEqual(rec["forefeast"], {"type": "fixed", "month": 12, "day": 20})
        self.assertNotIn("ends", rec)          # empty optionals are omitted
        self.assertEqual(rec["cycle"], "fixed")
        self.assertIn("orthodox+icon", rec["icon"])
        self.assertEqual(rec["relatedSaints"], ["OS-0001"])
```

- [ ] **Step 2: Run to verify failure** — `python -m unittest tests.test_feastlib -v` → FAIL (`ModuleNotFoundError: feastlib`)

- [ ] **Step 3: Implement `feastlib.py`**

```python
"""feastlib.py — the Feasts & Fasts database (FF-####).

Sibling of the saints pipeline: data/feasts.csv is SOURCE OF TRUTH, this module
loads it, assigns blank FF-#### ids (writing them back), validates fail-loud,
and emits public/feasts.json. Orchestrated by build.py; never run directly.

Date-token grammar (columns Begins / Ends / Forefeast / Apodosis; complete for
the Orthodox calendar — spec docs/superpowers/specs/2026-07-05-*.md):
  fixed     'Dec 25'
  paschal   'P+49' / 'P-48'        (offset in days from Pascha)
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

# Zacchaeus Sunday (P-77) .. start of the Apostles' Fast (P+57).
PASCHAL_OFFSET_MIN, PASCHAL_OFFSET_MAX = -78, 57

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
                f"FATAL: {FEASTS_CSV} header must be {FEASTS_HEADER}, got {header!r}")
        rows = [dict(zip(header, r)) for r in reader if any(c.strip() for c in r)]
    return FEASTS_HEADER, rows


def assign_ids(rows: list[dict[str, str]]) -> bool:
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
    all_ids = [r["Feast ID"].strip() for r in rows]
    id_set = set(all_ids)
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
            terms = split_multi(val) if col not in SINGLE_VALUE else [val]
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

        # Span-shaped categories are expected to carry an Ends.
        if r["Category"].strip() in {"Fast Season", "Fast-Free Week"} \
                and not r["Ends"].strip():
            warnings.append(f"{where}: Category '{r['Category'].strip()}' "
                            f"usually spans days — no 'Ends' set")
        if r["Category"].strip() in {"Fast Season", "Fast Day"} \
                and not r["Fasting Discipline"].strip():
            warnings.append(f"{where}: fast entry without a Fasting Discipline")

        for sid in split_multi(r["Related Saints"]):
            if not OS_ID_RE.match(sid):
                errors.append(f"{where}: Related Saints entry {sid!r} is not OS-####")
            elif sid not in saint_ids:
                errors.append(f"{where}: Related Saints {sid} not in data/saints.csv")
        for rfid in split_multi(r["Related Feasts"]):
            if rfid == fid:
                errors.append(f"{where}: Related Feasts references itself")
            elif rfid not in id_set:
                errors.append(f"{where}: Related Feasts {rfid} not in data/feasts.csv")

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
    Shape validation is Zod's job at astro build."""
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
            rec[key] = val or f"https://www.google.com/search?tbm=isch&q={q}+orthodox+icon"
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
```

- [ ] **Step 4: Run to verify pass** — `python -m unittest tests.test_feastlib -v` → all PASS
- [ ] **Step 5: Run the whole suite** — `make test` → PASS (no regressions)
- [ ] **Step 6: Commit** — `git commit -m "feat: feastlib — FF-#### load/validate/emit with the date-token grammar"`

---

### Task 3: Vocabulary terms + `build.py` orchestration + xlsx sheet

**Files:**
- Modify: `data/vocabulary.csv` (append)
- Modify: `build.py` (`main()` at ~line 1609; `emit_xlsx` at ~line 1551; import block)
- Test: extend `tests/test_feastlib.py` (integration smoke via `make validate`)

- [ ] **Step 1: Append vocabulary terms** to `data/vocabulary.csv` (exact rows):

```csv
Feast Category,Feast of Feasts
Feast Category,Great Feast
Feast Category,Feast
Feast Category,Fast Season
Feast Category,Fast Day
Feast Category,Fast-Free Week
Feast Category,Observance
Dedication,Lord
Dedication,Theotokos
Dedication,Cross
Dedication,Forerunner
Dedication,Apostles
Dedication,Angels
Dedication,Saints
Dedication,Departed
Fasting Discipline,Strict Fast
Fasting Discipline,Wine & Oil
Fasting Discipline,Fish Allowed
Fasting Discipline,Dairy Allowed
Fasting Discipline,Fast-Free
Fasting Discipline,Varies
```

- [ ] **Step 2: Wire into `build.py`.** Add `import feastlib` after `import themes as themes_mod`. In `main()`:
  - after `header, rows = load_saints()`: add `f_header, f_rows = feastlib.load_feasts()`
  - inside `if not args.check_only:` next to saints ID assignment:
    ```python
    if feastlib.assign_ids(f_rows):
        feastlib.write_feasts(f_header, f_rows)
    ```
  - after `errors, warnings = validate(header, rows, vocab)`:
    ```python
    saint_ids = {r["Saint ID"].strip() for r in rows}
    f_errors, f_warnings = feastlib.validate(f_rows, vocab, saint_ids)
    errors.extend(f_errors)
    warnings.extend(f_warnings)
    ```
  - change the clean print to include feasts: `print(f"VALIDATION CLEAN — {len(rows)} saints, {len(f_rows)} feasts, ...")`
  - after `emit_groups_json()`: add `feastlib.emit_feasts_json(f_rows)`
  - `emit_xlsx(header, rows, vocab)` → `emit_xlsx(header, rows, vocab, f_header, f_rows)` (both call sites).
- [ ] **Step 3: Add the worksheet in `emit_xlsx`** — new signature
  `def emit_xlsx(header, rows, vocab, feasts_header=None, feasts_rows=None):`, and after the saints sheet:
    ```python
    if feasts_rows:
        fs = wb.create_sheet("Feasts & Fasts")
        fs.append(feasts_header)
        for cell in fs[1]:
            cell.font = Font(bold=True)
        for r in feasts_rows:
            fs.append([r[c] for c in feasts_header])
        fs.freeze_panes = "A2"
    ```
- [ ] **Step 4: Verify** — `python build.py --check-only` → CLEAN (0 feasts yet, no errors); `make test` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: wire feastlib into build.py + vocabulary + xlsx sheet"`

---

### Task 4: `feasts` content collection in `src/content.config.ts`

**Files:**
- Modify: `src/content.config.ts`
- Create: `src/content/feasts/.gitkeep` (dir exists before calibration drafts land)

- [ ] **Step 1: Extract the shared timeline shape and add the collection.** In `content.config.ts`, add after `relatedFigure`:

```ts
const timelineEntry = z.object({
  when: z.string(),
  title: z.string(),
  body: z.string(),
  figures: z
    .array(z.object({ name: z.string(), href: z.string().optional() }))
    .optional(),
  source: z.string().optional(),
});
```

(and replace the inline object inside `profileSchema`'s `timeline: z.array(...)` with `timeline: z.array(timelineEntry).optional()`).

Then add the feast schema + collection:

```ts
// Rich feast/fast profiles (src/content/feasts/FF-####.yaml) — the history and
// meaning of each liturgical feast/fast. Same status gate as saint profiles:
// production ships only `reviewed`. §9 guardrails: hymnography is DESCRIBED,
// never reproduced from copyrighted translations; customs are church-blessed.
const feastProfileSchema = z
  .object({
    id: z.string().regex(/^FF-\d{4,}$/),
    status: z.enum(["draft", "reviewed", "flagged"]).default("draft"),
    flagReasons: z
      .array(z.object({ claim: z.string(), detail: z.string() }))
      .optional(),
    sources: z.array(z.string()).optional(),
    generated: z.string().optional(), // ISO date
    humanReviewed: z.boolean().optional().default(false),
    overview: z.array(z.string()).min(1),
    // The two first-class prose axes of the database (spec): how the feast
    // arose and developed, and what it means theologically/spiritually.
    history: z.array(z.string()).optional(),
    meaning: z.array(z.string()).optional(),
    timeline: z.array(timelineEntry).optional(),
    scripture: z
      .array(z.object({ ref: z.string(), note: z.string().optional() }))
      .optional(),
    iconography: z.array(z.string()).optional(),
    hymnography: z.array(z.string()).optional(), // describes, never quotes (§9)
    fastingPractice: z.array(z.string()).optional(), // frontend adds pastoral disclaimer
    customs: z.array(z.string()).optional(),
    sections: z
      .array(z.object({ heading: z.string(), body: z.array(z.string()) }))
      .optional(),
    related: z.array(relatedFigure).optional(),
  })
  .superRefine((p, ctx) => {
    if (p.status !== "reviewed" && !(p.sources && p.sources.length)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${p.id}: ${p.status} profiles must list at least one source`,
      });
    }
  });

const feasts = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/feasts" }),
  schema: feastProfileSchema,
});
```

and `export const collections = { profiles, feasts };`

- [ ] **Step 2: Verify** — `make web-lint` → clean; `python build.py --no-xlsx && npm run build` → builds (collection loads, no page consumes it yet).
- [ ] **Step 3: Commit** — `git commit -m "feat: feasts content collection (FF-#### rich profiles, draft/reviewed gate)"`

---

### Task 5: Research & author `data/feasts.csv`

**Files:**
- Create: `data/feasts.csv`
- Working dir (git-ignored): `dist/feast-research/*.csv`

Orchestration (the spine-walk pattern: research agents persist to files, one merge agent assembles):

- [ ] **Step 1: Fan out 6 research agents**, one per calendar section, each writing CSV-fragment rows (no Feast ID column value — blank; exact 19-column schema; date tokens in the grammar; only vocabulary terms from Task 3) to `dist/feast-research/<section>.csv`:
  1. **great-feasts** — Pascha + the 12 Great Feasts (with Forefeast/Apodosis dates)
  2. **fasts** — 4 fast seasons, one-day strict fasts (Eve of Theophany, Beheading, Exaltation), Holy Week as a fast span, the 4 fast-free weeks
  3. **triodion** — Zacchaeus Sunday through Lazarus Saturday (named Sundays, Clean Monday, Lenten Soul Saturdays, Akathist Saturday, Lenten Sundays 1–5)
  4. **holy-week-bright** — Lazarus Saturday, Holy Mon–Sat, Bright Week days of note, Bright Friday (Life-giving Spring)
  5. **pentecostarion** — Thomas Sunday through All Saints (+ Radonitsa, Mid-Pentecost, Apodosis of Pascha, Fathers of Nicaea, Trinity Soul Saturday, All Saints of local lands)
  6. **fixed-observances** — Circumcision, Synaxes (Theotokos Dec 26, John the Baptist Jan 7, Archangels Nov 8, Gabriel, Miracle at Chonae Sep 6), Protection, Procession of the Cross Aug 1, Deposition of the Robe/Cincture, anchored Sundays (Forefathers, Fathers before/after Nativity & Theophany & Exaltation), Demetrius Soul Saturday, New Martyrs of Russia Sunday
  Every agent: cite Sources per row (OCA/GOARCH); Related Saints must be verified OS-ids (grep `data/saints.csv` and confirm the row's Name matches before citing — ids from memory are often off); leave Related Feasts as names in Notes for the merge agent to resolve (ids don't exist yet).
- [ ] **Step 2: Merge agent** assembles `data/feasts.csv` (exact header, CRLF, blank Feast IDs), dedups across sections (e.g. Lazarus Saturday appears in two sections — one row), resolves cross-references AFTER ids are assigned.
- [ ] **Step 3: Assign IDs** — `python build.py --no-xlsx` → ids written back. Then a follow-up pass fills `Related Feasts` with the now-real FF-ids; re-run `make validate` → CLEAN.
- [ ] **Step 4: Sanity-check** `public/feasts.json` (record count, spot-check Pascha `{"type":"paschal","offset":0}`, Apostles' Fast hybrid).
- [ ] **Step 5: Commit** — `git commit -m "data: the Feasts & Fasts database — <N> entries (FF-0001..)"`

---

### Task 6: `tools/feastgen/` research pipeline + calibration

**Files:**
- Create: `tools/feastgen/__init__.py`, `dossier.py`, `emit_one.py`, `prompts/` (`gather.md`, `write.md`, `verify.md`), `prioritize.py`, `run.py`
- Modify: `Makefile` (feast-run / feast-batch / feast-status / feast-stop targets)
- Test: `tests/test_feastgen.py` (dossier + emit_one round-trip)

Adapt each file from its `tools/profilegen/` sibling (same stage contract, same
run.py loop/state/rate-limit handling, state under `dist/feastgen/`), with these
feast-specific changes:

- [ ] **Step 1: `dossier.py`** — the trusted anchor is the FF CSV row: name, aka, category, dedication, dates (tokens + human-readable rendering), fasting, brief, customs, related saints (joined to their Names from saints.csv), sources.
- [ ] **Step 2: `prompts/`** — gather: fetch OCA/GOARCH/Wikipedia coverage of the feast's origin, historical development, theology, hymnographic themes (describe only), iconography, customs; write: produce the YAML fields of the `feasts` schema (overview/history/meaning/timeline/scripture/iconography/hymnography/fastingPractice/customs/sections/related) — **history and meaning are the priority fields**; NEVER quote modern hymn translations; fastingPractice stays descriptive, never prescriptive; verify: adversarially check each claim against the anchor + gathered sources, quoting the draft verbatim.
- [ ] **Step 3: `emit_one.py`** — writes `src/content/feasts/FF-####.yaml` at `status: draft` (or `flagged` + flagReasons), validating shape against the Zod field list; `generated:` stamped.
- [ ] **Step 4: `prioritize.py`** — ranks profile-less feasts: Great Feasts first, then fast seasons, then by category weight.
- [ ] **Step 5: Makefile targets** (mirror the profile-* block):
```make
feast-batch:    ; python -m tools.feastgen.prioritize $(or $(N),10)
feast-run:      ; python -m tools.feastgen.run
feast-stop:     ; @if [ -f dist/feastgen/run.pid ]; then kill -TERM "$$(cat dist/feastgen/run.pid)"; else echo "feastgen is not running"; fi
feast-status:   ; @if [ -f dist/feastgen/state.json ]; then cat dist/feastgen/state.json; else echo "No state file"; fi
```
- [ ] **Step 6: Tests** — dossier renders a known row; emit_one writes schema-valid YAML (`make test` green).
- [ ] **Step 7: Calibrate on ~5 feasts** (Pascha, Nativity, Great Lent, Pentecost, Protection) via per-feast Agent subagents running gather→write→verify, then emit_one; `make validate` + `npm run build` green (drafts render only in previews).
- [ ] **Step 8: Commit** — `git commit -m "feat: feastgen pipeline + 5 calibration draft profiles"`

---

### Task 7: Documentation + PR

**Files:**
- Modify: `CLAUDE.md` (new §5-adjacent subsection "The Feasts & Fasts database", repo-layout tree, commands)
- Modify: `README.md` (one paragraph + data file mention)

- [ ] **Step 1: CLAUDE.md** — document: feasts.csv 19 columns, the date-token grammar with examples, derived cycle, FF-#### numbering (build is sole authority), vocabulary categories, the feasts content collection + status gate, feastgen targets, and the §9 carve-outs (hymnography described-only; fasting summary-level with pastoral disclaimer; New-Calendar date convention).
- [ ] **Step 2: Full gates** — `make validate`, `make test`, `make web-lint`, `python build.py --no-xlsx && npm run build`, `make web-unit`.
- [ ] **Step 3: Push + PR** with the template; note canonization-adjacent judgment calls (none expected — feasts are uncontroversial, but flag any jurisdiction-specific observances marked by Tradition of Observance); include the Cloudflare Pages preview link once the check is green.

---

## Self-Review

- **Spec coverage:** grammar ✓ (Task 2), computus + table ✓ (Task 1), feastlib + build wiring + xlsx ✓ (Tasks 2–3), vocabulary ✓ (Task 3), content collection ✓ (Task 4), CSV research ✓ (Task 5), feastgen + calibration ✓ (Task 6), docs/PR ✓ (Task 7).
- **Type consistency:** `parse_date_token` returns `(dict|None, str|None)` everywhere; `validate(rows, vocab, saint_ids)`; JSON keys match spec (`begins`/`ends`/`forefeast`/`apodosis`/`cycle` + short keys). `assign_ids`/`write_feasts` mirror build.py naming.
- **Placeholders:** none; Task 5/6 steps are orchestration instructions with concrete inputs/outputs by design.
