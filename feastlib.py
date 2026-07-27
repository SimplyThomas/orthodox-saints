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
STATIC = ROOT / "static"  # Astro publicDir; self-hosted icons live in static/icons/

# Self-hosted festal imagery — same shape + §9 licensing gate as data/saint_images
# and data/host_images. One hero per feast (feast_images) + MANY carousel cards
# (feast_depictions), keyed by FF-####. (#350)
FEAST_IMAGES_CSV = DATA / "feast_images.csv"
FEAST_IMAGES_HEADER = ["feast_id", "image_path", "license", "credit", "source"]
FEAST_DEPICTIONS_CSV = DATA / "feast_depictions.csv"
FEAST_DEPICTIONS_HEADER = ["feast_id", "image_path", "license", "credit", "source",
                           "kind", "tag", "title", "era", "by"]
IMAGE_PERMISSIONS_CSV = DATA / "image_permissions.csv"
IMAGE_PERMISSIONS_HEADER = ["vendor_slug", "vendor_name", "attribution",
                            "homepage", "granted", "status", "terms"]
DEPICTION_KINDS = {"museum", "iconographer", "shop"}
OPEN_LICENSES = {"PD", "PD-art", "PD-old", "CC0"}
OPEN_LICENSE_LIST = "PD / PD-art / PD-old / CC0 / CC-BY / CC-BY-SA"
PERMISSION_LICENSE_RE = re.compile(r"^Permission:([a-z0-9]+(?:-[a-z0-9]+)*)$")

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
# Festal imagery (data/feast_images.csv + data/feast_depictions.csv) — mirrors
# the saint_images / host_images pipeline verbatim (§9 licence gate). (#350)
# --------------------------------------------------------------------------- #
def license_ok(lic: str) -> bool:
    lic = lic.strip()
    return lic in OPEN_LICENSES or bool(re.match(r"^CC-BY(-SA)?(-\d(\.\d)?)?$", lic))


def license_requires_credit(lic: str) -> bool:
    return lic.strip().upper().startswith("CC-BY")


def permission_slug(lic: str) -> str | None:
    m = PERMISSION_LICENSE_RE.match(lic.strip())
    return m.group(1) if m else None


def load_image_permissions() -> dict[str, dict[str, str]]:
    """vendor_slug -> row. Empty if the registry is absent."""
    out: dict[str, dict[str, str]] = {}
    if not IMAGE_PERMISSIONS_CSV.exists():
        return out
    with IMAGE_PERMISSIONS_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            slug = (row.get("vendor_slug") or "").strip()
            if slug:
                out[slug] = {k: (row.get(k) or "").strip()
                             for k in IMAGE_PERMISSIONS_HEADER}
    return out


def load_feast_images() -> dict[str, dict[str, str]]:
    """feast_id -> {path, license, credit, source}. Empty if the file is absent."""
    out: dict[str, dict[str, str]] = {}
    if not FEAST_IMAGES_CSV.exists():
        return out
    with FEAST_IMAGES_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != FEAST_IMAGES_HEADER:
            raise SystemExit(f"FATAL: {FEAST_IMAGES_CSV} header must be "
                             f"{FEAST_IMAGES_HEADER}, got {reader.fieldnames!r}")
        for row in reader:
            fid = (row.get("feast_id") or "").strip()
            if not fid:
                continue
            out[fid] = {
                "path": (row.get("image_path") or "").strip(),
                "license": (row.get("license") or "").strip(),
                "credit": (row.get("credit") or "").strip(),
                "source": (row.get("source") or "").strip(),
            }
    return out


def image_thumb(path: str) -> str | None:
    """static/-relative avatar thumb for a festal icon, or None (missing → degrade
    to the full image, never a 404). Thumbs mirror icons/ under icons/thumbs/."""
    if re.match(r"^(https?:)?//", path) or not path.startswith("icons/"):
        return None
    rel = path[len("icons/"):]
    stem, _, _ = rel.rpartition(".")
    thumb = f"icons/thumbs/{stem or rel}.jpg"
    return thumb if (STATIC / thumb).is_file() else None


def load_feast_depictions() -> dict[str, list[dict[str, str]]]:
    """feast_id -> ordered list of {path, license, credit, source, kind, tag,
    title, era, by} (the carousel cards). MANY rows per feast, in file order."""
    out: dict[str, list[dict[str, str]]] = {}
    if not FEAST_DEPICTIONS_CSV.exists():
        return out
    with FEAST_DEPICTIONS_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != FEAST_DEPICTIONS_HEADER:
            raise SystemExit(f"FATAL: {FEAST_DEPICTIONS_CSV} header must be "
                             f"{FEAST_DEPICTIONS_HEADER}, got {reader.fieldnames!r}")
        for row in reader:
            fid = (row.get("feast_id") or "").strip()
            if not fid:
                continue
            out.setdefault(fid, []).append(
                {k: (row.get(c) or "").strip() for k, c in (
                    ("path", "image_path"), ("license", "license"),
                    ("credit", "credit"), ("source", "source"),
                    ("kind", "kind"), ("tag", "tag"), ("title", "title"),
                    ("era", "era"), ("by", "by"))})
    return out


def validate_feast_images(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """§9 gate: known feast, an existing local file under static/, and either an
    accepted open license (with a credit when CC-BY* requires one) OR a
    Permission:<vendor> token validated against data/image_permissions.csv
    (revoked vendor warns + is excluded from output, not an error)."""
    errors: list[str] = []
    warnings: list[str] = []
    images = load_feast_images()
    permissions = load_image_permissions()
    for fid, img in images.items():
        where = f"feast_images {fid}"
        if fid not in valid_ids:
            errors.append(f"{where}: not a known Feast ID")
        path, lic, credit, source = (img["path"], img["license"],
                                     img["credit"], img["source"])
        if not path:
            errors.append(f"{where}: empty image_path")
        elif not re.match(r"^(https?:)?//", path) and not (STATIC / path).is_file():
            errors.append(f"{where}: image_path {path!r} not found under "
                          f"static/ (expected {(STATIC / path)})")
        slug = permission_slug(lic)
        if not lic:
            errors.append(f"{where}: empty license — must be an open license "
                          f"({OPEN_LICENSE_LIST}) or a Permission:<vendor> token")
        elif slug is not None:
            vendor = permissions.get(slug)
            if vendor is None:
                errors.append(f"{where}: permission vendor {slug!r} is not in "
                              f"data/image_permissions.csv")
            elif vendor.get("status") == "revoked":
                warnings.append(f"{where}: vendor {slug!r} permission is REVOKED "
                                f"— image excluded; delete the file under "
                                f"static/icons/permission/{slug}/")
            elif not source:
                errors.append(f"{where}: permission image requires a 'source' "
                              f"linking the specific vendor icon page (§9)")
        elif not license_ok(lic):
            errors.append(f"{where}: license {lic!r} is not an accepted open "
                          f"license ({OPEN_LICENSE_LIST}) or a Permission:<vendor> "
                          f"token")
        elif license_requires_credit(lic) and not credit:
            errors.append(f"{where}: license {lic} requires a credit")
        if not source and slug is None:
            warnings.append(f"{where}: no source link for provenance review")
    return errors, warnings


def validate_feast_depictions(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """Same §9 licensing gate as feast_images (open license OR Permission:<vendor>),
    but MANY rows per feast, each with a `title` and a `kind` in
    {museum, iconographer, shop}."""
    errors: list[str] = []
    warnings: list[str] = []
    permissions = load_image_permissions()
    for fid, cards in load_feast_depictions().items():
        if fid not in valid_ids:
            errors.append(f"feast_depictions {fid}: not a known Feast ID")
        for d in cards:
            where = f"feast_depictions {fid} ({d['title'] or d['path']})"
            path, lic, credit, source, kind, title = (
                d["path"], d["license"], d["credit"], d["source"],
                d["kind"], d["title"])
            if not path:
                errors.append(f"{where}: empty image_path")
            elif not re.match(r"^(https?:)?//", path) and not (STATIC / path).is_file():
                errors.append(f"{where}: image_path {path!r} not found under static/")
            if not title:
                errors.append(f"{where}: a depiction requires a title")
            if kind and kind not in DEPICTION_KINDS:
                errors.append(f"{where}: kind {kind!r} not in "
                              f"{sorted(DEPICTION_KINDS)}")
            slug = permission_slug(lic)
            if not lic:
                errors.append(f"{where}: empty license (open license or "
                              f"Permission:<vendor>)")
            elif slug is not None:
                vendor = permissions.get(slug)
                if vendor is None:
                    errors.append(f"{where}: permission vendor {slug!r} not in "
                                  f"data/image_permissions.csv")
                elif vendor.get("status") == "revoked":
                    warnings.append(f"{where}: vendor {slug!r} REVOKED — depiction "
                                    f"excluded")
                elif not source:
                    errors.append(f"{where}: permission depiction requires a "
                                  f"'source' (§9)")
            elif not license_ok(lic):
                errors.append(f"{where}: license {lic!r} is not an accepted open "
                              f"license ({OPEN_LICENSE_LIST}) or Permission:<vendor>")
            elif license_requires_credit(lic) and not credit:
                errors.append(f"{where}: license {lic} requires a credit")
    return errors, warnings


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
    i_errors, i_warnings = validate_feast_images(id_set)
    d_errors, d_warnings = validate_feast_depictions(id_set)
    errors.extend(i_errors + d_errors)
    warnings.extend(i_warnings + d_warnings)
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


def to_record(r: dict[str, str],
              images: dict[str, dict[str, str]] | None = None,
              depictions: dict[str, list[dict[str, str]]] | None = None,
              permissions: dict[str, dict[str, str]] | None = None) -> dict:
    if images is None:
        images = load_feast_images()
    if depictions is None:
        depictions = load_feast_depictions()
    if permissions is None:
        permissions = load_image_permissions()
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

    fid = r["Feast ID"].strip()
    # Hero festal icon (data/feast_images.csv). A permission hero emits
    # image/imageThumb/imageCredit(=vendor)/imageSource + imagePermission/
    # imageVendor/imageAttribution and is dropped if the grant is revoked; an
    # open image keeps its own license/credit. (#350)
    img = images.get(fid)
    if img and img["path"]:
        slug = permission_slug(img["license"])
        if slug is not None:
            vendor = permissions.get(slug)
            if vendor and vendor.get("status") != "revoked":
                rec["image"] = img["path"]
                thumb = image_thumb(img["path"])
                if thumb:
                    rec["imageThumb"] = thumb
                rec["imagePermission"] = True
                rec["imageVendor"] = vendor.get("vendor_name", "")
                rec["imageAttribution"] = vendor.get("attribution", "")
                rec["imageCredit"] = vendor.get("vendor_name", "")
                if img["source"]:
                    rec["imageSource"] = img["source"]
            # revoked / unknown vendor -> no image key (placeholder hero)
        else:
            rec["image"] = img["path"]
            thumb = image_thumb(img["path"])
            if thumb:
                rec["imageThumb"] = thumb
            if img["credit"]:
                rec["imageCredit"] = img["credit"]
            if img["source"]:
                rec["imageSource"] = img["source"]

    # "Depictions & Icons" carousel (data/feast_depictions.csv). The feast page's
    # FeastDepiction renders {image, title, credit, source, license}: a permission
    # card emits credit=vendor name + source (grant backlink) and NO license token;
    # an open card keeps license/credit.
    deps = depictions.get(fid)
    if deps:
        cards: list[dict] = []
        for d in deps:
            if not d.get("path"):
                continue
            card: dict = {"image": d["path"], "title": d.get("title", "")}
            if d.get("source"):
                card["source"] = d["source"]
            dslug = permission_slug(d.get("license", ""))
            if dslug is not None:
                vendor = permissions.get(dslug)
                if not vendor or vendor.get("status") == "revoked":
                    continue  # unknown / revoked vendor -> exclude card
                card["credit"] = vendor.get("vendor_name", "")
            else:
                if d.get("license"):
                    card["license"] = d["license"]
                if d.get("credit"):
                    card["credit"] = d["credit"]
            cards.append(card)
        if cards:
            rec["depictions"] = cards
    return rec


def emit_feasts_json(rows: list[dict[str, str]]) -> list[dict]:
    images = load_feast_images()
    depictions = load_feast_depictions()
    permissions = load_image_permissions()
    records = sorted((to_record(r, images, depictions, permissions) for r in rows),
                     key=_sort_key)
    payload = {"feasts": records, "pascha": pascha_mod.pascha_table(2020, 2040)}
    PUBLIC.mkdir(exist_ok=True)
    with open(PUBLIC / "feasts.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  wrote public/feasts.json ({len(records)} feasts)")
    return records
