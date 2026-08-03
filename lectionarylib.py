"""lectionarylib.py — the daily lectionary (the appointed scripture readings).

Sibling of feastlib/hostlib, with one deliberate difference: this table is not
authored, it is HARVESTED. Which pericope is appointed on which day is the
product of two interleaved cycles — the movable Paschal cycle (shifted each
autumn by the Lukan jump) and the fixed Menaion cycle of feasts and saints —
and reckoning it is a large piece of liturgical computation we do not
reimplement. `scripts/harvest_lectionary.py` pulls a resolved table from
orthocal.info and writes data/lectionary/<year>.csv; those files are COMMITTED
and are the source of truth, so this module (and therefore `python build.py`)
never touches the network. Credit, tradition mapping and the known limits are
in docs/lectionary.md.

TWO TRADITIONS, keyed to the calendar page's New/Old toggle:
    greek   — Byzantine-Greek usage on Revised Julian dates  (the New toggle)
    slavic  — Slavic usage on Julian dates                   (the Old toggle)
They diverge on roughly two days in three: Greek usage layers the commemorated
saint's readings onto ordinary weekdays far more often, and the Julian shift
puts a different saint on the day to begin with. Neither is "the" Orthodox
lectionary — which is why the frontend always names the one it is showing.

Dates are always CIVIL (Gregorian). Only references are carried, never the
scripture text (§9): a citation is a fact of the Church's ordering, a
translation is somebody's copyright.

Emits public/lectionary/<year>.json, one shard per year, fetched on demand.
"""

from __future__ import annotations

import csv
import json
import re
from calendar import isleap, monthrange
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
PUBLIC = ROOT / "public"
LECTIONARY_DIR = DATA / "lectionary"

HEADER = ["date", "tradition", "title", "epistle", "gospel",
          "matins", "vespers", "other"]

TRADITIONS = ("greek", "slavic")

# The reading columns, in the order the frontend reads them.
READING_COLS = ("epistle", "gospel", "matins", "vespers", "other")

# DELIMITERS — deliberately NOT the house "; ", for the same reason hymn
# stanzas split on "||" (CLAUDE.md §5): ONE appointed reading routinely spans
# discontinuous passages printed semicolon-separated ("Micah 4.6-7; 5.2-4" is
# a single Vespers reading), and a book name can carry parentheses
# ("Jeremiah (Baruch 3.35-4.4)"), so splitting on "; " or reading "(...)" as
# an annotation would tear real citations in half. Kept in lockstep with
# scripts/harvest_lectionary.py, which fails loudly if a source string ever
# contains one of these tokens.
ENTRY_SEP = "||"
SERVICE_SEP = "::"
FOR_SEP = "~"

DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")

# A citation names a book and then a number. We check that SHAPE, not the
# canon: the harvest is a third-party table, so an unfamiliar book should warn,
# never fail a build. Real forms it must accept:
#   Colossians 2.8-12          ordinary
#   1 Peter 1.1-2.6            numbered book
#   4[2] Kings 2.6-14          the Septuagint's dual numbering of the Kingdoms
#   3 [1] Kings 7:51-8:1       … and the spaced variant of it
#   Jude 1-10                  single-chapter book, cited by verse alone
#   Wisdom of Solomon 4.7-15   lowercase particle inside the name
#   Jeremiah (Baruch 3.35-4.4) parenthesised book name
# What it must REJECT is a bare fragment like "5.2-4" — that is the signature
# of a cell torn at the wrong delimiter (see ENTRY_SEP above), which is the
# actual bug this check exists to catch.
CITATION_RE = re.compile(r"^[1-4]?\s?(\[[1-4]\]\s?)?[A-Z][A-Za-z'’()\s]*\d")
COMPOSITE_RE = re.compile(r"^Composite\s+\d+\b")


def split_multi(value: str) -> list[str]:
    return [p.strip() for p in value.split(ENTRY_SEP) if p.strip()]


# --------------------------------------------------------------------------- #
# Load
# --------------------------------------------------------------------------- #
def available_years() -> list[int]:
    """Years with a committed lectionary file, ascending."""
    if not LECTIONARY_DIR.is_dir():
        return []
    years = []
    for path in LECTIONARY_DIR.glob("*.csv"):
        if path.stem.isdigit():
            years.append(int(path.stem))
    return sorted(years)


def load_lectionary() -> dict[int, list[dict[str, str]]]:
    """{year: [row, ...]} straight off disk, unvalidated."""
    out: dict[int, list[dict[str, str]]] = {}
    for year in available_years():
        with open(LECTIONARY_DIR / f"{year}.csv", encoding="utf-8-sig",
                  newline="") as f:
            out[year] = list(csv.DictReader(f))
    return out


# --------------------------------------------------------------------------- #
# Parse one cell into structured readings
# --------------------------------------------------------------------------- #
def parse_reading(entry: str) -> dict[str, str]:
    """'Galatians 4.4-7 ~ Nativity' -> {'ref': ..., 'for': 'Nativity'}.

    '6th Hour :: Isaiah 5.16-25' -> {'service': '6th Hour', 'ref': ...}.
    """
    text = entry.strip()
    out: dict[str, str] = {}

    if SERVICE_SEP in text:
        service, _, text = text.partition(SERVICE_SEP)
        out["service"] = service.strip()

    if FOR_SEP in text:
        text, _, commemoration = text.partition(FOR_SEP)
        out["for"] = commemoration.strip()

    out["ref"] = text.strip()
    return out


def parse_cell(value: str) -> list[dict[str, str]]:
    return [parse_reading(e) for e in split_multi(value)]


def _citation_ok(ref: str) -> bool:
    """Does this look like a scripture citation at all?"""
    if COMPOSITE_RE.match(ref):
        # "Composite 2 - Proverbs 10, 3, 8" — a stitched Vespers paremia; the
        # books follow the dash and are not individually addressable.
        return True
    return bool(CITATION_RE.match(ref))


# --------------------------------------------------------------------------- #
# Validate (fail loud; same (errors, warnings) contract as build.py)
# --------------------------------------------------------------------------- #
def validate(by_year: dict[int, list[dict[str, str]]]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    if not by_year:
        # Not an error: a checkout that has never run the harvester still
        # builds, and the calendar simply shows no readings.
        warnings.append("lectionary: no data/lectionary/<year>.csv files — "
                        "the calendar will show no readings "
                        "(run scripts/harvest_lectionary.py)")
        return errors, warnings

    for year, rows in sorted(by_year.items()):
        where = f"lectionary {year}"

        if rows and list(rows[0].keys()) != HEADER:
            errors.append(f"{where}: header must be exactly {','.join(HEADER)}")
            continue

        seen: set[tuple[str, str]] = set()
        dates_by_tradition: dict[str, set[str]] = {t: set() for t in TRADITIONS}

        for row in rows:
            date = (row.get("date") or "").strip()
            tradition = (row.get("tradition") or "").strip()
            spot = f"{where} {date or '(no date)'}/{tradition or '(no tradition)'}"

            match = DATE_RE.match(date)
            if not match:
                errors.append(f"{spot}: date must be YYYY-MM-DD")
                continue
            row_year, month, day = (int(g) for g in match.groups())
            if row_year != year:
                errors.append(f"{spot}: date is not in the file's year {year}")
                continue
            if not 1 <= month <= 12 or not 1 <= day <= monthrange(year, month)[1]:
                errors.append(f"{spot}: date is not a real calendar day")
                continue

            if tradition not in TRADITIONS:
                errors.append(f"{spot}: tradition must be one of "
                              f"{', '.join(TRADITIONS)}")
                continue

            key = (date, tradition)
            if key in seen:
                errors.append(f"{spot}: duplicate row")
                continue
            seen.add(key)
            dates_by_tradition[tradition].add(date)

            for col in READING_COLS:
                for entry in split_multi(row.get(col) or ""):
                    parsed = parse_reading(entry)
                    if not parsed["ref"]:
                        errors.append(f"{spot}: empty reading in '{col}'")
                    elif not _citation_ok(parsed["ref"]):
                        warnings.append(f"{spot}: '{col}' entry does not look "
                                        f"like a citation: {entry!r}")

        # Every civil day of the year, in both traditions. A gap here would
        # silently show "no readings" on a real day, which reads as a claim
        # that none are appointed.
        expected = 366 if isleap(year) else 365
        for tradition in TRADITIONS:
            have = len(dates_by_tradition[tradition])
            if have != expected:
                errors.append(f"{where}: {tradition} has {have} days, "
                              f"expected {expected} — re-run "
                              f"scripts/harvest_lectionary.py --force")

    years = sorted(by_year)
    gaps = [y for y in range(years[0], years[-1] + 1) if y not in by_year]
    if gaps:
        errors.append("lectionary: missing year file(s) "
                      f"{', '.join(str(g) for g in gaps)} — the range must be "
                      "contiguous so the calendar can state where it ends")

    return errors, warnings


# --------------------------------------------------------------------------- #
# Emit — one shard per year, fetched on demand by the calendar island
# --------------------------------------------------------------------------- #
def to_record(row: dict[str, str]) -> dict:
    rec: dict = {}
    title = (row.get("title") or "").strip()
    if title:
        rec["title"] = title
    for col in READING_COLS:
        parsed = parse_cell(row.get(col) or "")
        if parsed:
            rec[col] = parsed
    return rec


def emit_lectionary_json(by_year: dict[int, list[dict[str, str]]]) -> int:
    """Write public/lectionary/<year>.json. Returns the number of shards."""
    if not by_year:
        return 0
    out_dir = PUBLIC / "lectionary"
    out_dir.mkdir(parents=True, exist_ok=True)

    for year, rows in sorted(by_year.items()):
        days: dict[str, dict[str, dict]] = {}
        for row in rows:
            date = (row.get("date") or "").strip()
            tradition = (row.get("tradition") or "").strip()
            if not DATE_RE.match(date) or tradition not in TRADITIONS:
                continue
            record = to_record(row)
            if record:
                days.setdefault(date[5:], {})[tradition] = record
        payload = {"year": year, "days": days}
        with open(out_dir / f"{year}.json", "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    years = sorted(by_year)
    # The index tells the frontend which years exist, so it can degrade
    # honestly outside the harvested range instead of 404ing a shard.
    with open(out_dir / "index.json", "w", encoding="utf-8") as f:
        json.dump({"years": years}, f, separators=(",", ":"))

    print(f"  wrote public/lectionary/ ({len(years)} years, "
          f"{years[0]}-{years[-1]})")
    return len(years)
