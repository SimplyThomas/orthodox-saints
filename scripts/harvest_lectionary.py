#!/usr/bin/env python3
"""
Harvest the Orthodox daily lectionary into committed data.

The appointed Epistle and Gospel for a given day are the product of two
interleaved cycles — the movable Paschal cycle (indexed by distance from
Pascha, and shifted each autumn by the Lukan jump) and the fixed Menaion
cycle of the feasts and saints. Reckoning that correctly is a substantial
piece of liturgical computation, so we do not reimplement it: we harvest a
resolved day-by-day table from orthocal.info and COMMIT it, the way
data/saints.csv is committed.

That keeps `python build.py` fully offline — the build only reads and
validates data/lectionary/<year>.csv, exactly as it reads the other CSVs.
This script is an authoring aid (like scripts/download_saint_icons.py); it is
the only part of the pipeline that touches the network, and it is re-run only
to extend the year range or refresh the table.

SOURCE — orthocal.info, by Brian Glass (MIT licensed; the reckoning descends
from Paul Kachur's orthodox_calendar). See docs/lectionary.md for the credit,
the tradition mapping, and the known limits. Scripture *citations* — which
pericope is appointed on which day — are facts of the Church's ordering, not
a copyrightable work; we harvest only the references, never the scripture
text (`passage` comes back null on the month endpoint we use).

TWO TRADITIONS, keyed to the site's New/Old calendar toggle:

    new  ->  greek/gregorian   (Byzantine-Greek usage, Revised Julian dates)
    old  ->  slavic/julian     (Slavic usage, Julian dates)

They genuinely diverge: Greek usage layers the commemorated saint's readings
onto ordinary weekdays far more often, and the two traditions replay the
Sunday Gospels displaced by the Lukan jump differently (the Slavic books
reserve and re-read them between Theophany and the Triodion; the Greek books
do not). Both are real usage — neither is "the" Orthodox lectionary, which is
why the panel names which one it is showing.

Dates in the output are always CIVIL (Gregorian) dates. For the slavic/julian
harvest the request is still made by civil date; the Julian church date is
what the server resolves internally.

Usage:
    python scripts/harvest_lectionary.py                 # 2020-2040, both
    python scripts/harvest_lectionary.py --years 2026 2030
    python scripts/harvest_lectionary.py --tradition greek
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, Iterable, List, Optional

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "lectionary"

API = "https://orthocal.info/api"
USER_AGENT = (
    "CloudOfWitnesses/1.0 (https://orthodoxsaintfinder.com; "
    "lectionary harvest, run rarely)"
)

# The site's New/Old toggle -> (orthocal tradition, orthocal calendar).
TRADITIONS = {
    "greek": ("greek", "gregorian"),
    "slavic": ("slavic", "julian"),
}

# Matches pascha_table() in pascha.py — the frontend degrades gracefully
# outside this window, showing no readings rather than a wrong one.
DEFAULT_START, DEFAULT_END = 2020, 2040

FIELDNAMES = [
    "date",
    "tradition",
    "title",
    "epistle",
    "gospel",
    "matins",
    "vespers",
    "other",
]

# DELIMITERS — deliberately NOT the house "; " (see CLAUDE.md §5 on hymn
# stanzas splitting on "||" for the same reason). A single appointed reading
# routinely spans discontinuous passages and prints them semicolon-separated
# ("Micah 4.6-7; 5.2-4" is ONE Vespers reading of Micah, not two), and a book
# name can itself carry parentheses ("Jeremiah (Baruch 3.35-4.4)"), so both
# "; " and "(...)" would tear real data in half. These three tokens are
# verified absent from every source string, and _assert_clean() fails the
# harvest loudly if that ever stops being true.
ENTRY_SEP = " || "      # between readings in one cell
SERVICE_SEP = " :: "    # "6th Hour :: Micah 5.2-4"
FOR_SEP = " ~ "         # "Galatians 4.4-7 ~ Nativity"
RESERVED = (ENTRY_SEP.strip(), SERVICE_SEP.strip(), FOR_SEP.strip())

# How each orthocal `source` is bucketed into our columns. Anything not named
# here lands in `other` carrying its own source label, so a service we have not
# anticipated is preserved rather than dropped.
EPISTLE_SOURCES = {"Epistle"}
GOSPEL_SOURCES = {"Gospel"}
VESPERS_SOURCES = {"Vespers", "Vespers Gospel"}

log = logging.getLogger("harvest_lectionary")


# --------------------------------------------------------------------------- #
# Fetching
# --------------------------------------------------------------------------- #
def fetch_month(tradition: str, calendar: str, year: int, month: int,
                *, retries: int = 4, pause: float = 0.7) -> List[dict]:
    """One month of resolved days. Retries with backoff; raises on give-up."""
    url = f"{API}/{tradition}/{calendar}/{year}/{month}/"
    last: Optional[Exception] = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.load(resp)
            if not isinstance(data, list) or not data:
                raise ValueError(f"empty month payload for {url}")
            time.sleep(pause)  # be a good guest: ~1 request/second
            return data
        except (urllib.error.URLError, ValueError, TimeoutError) as exc:
            last = exc
            wait = pause * (2 ** attempt)
            log.warning("  %s failed (%s); retrying in %.1fs", url, exc, wait)
            time.sleep(wait)
    raise RuntimeError(f"giving up on {url}: {last}")


# --------------------------------------------------------------------------- #
# Shaping
# --------------------------------------------------------------------------- #
def _clean(value: str) -> str:
    """Normalize a source string: strip zero-width junk and collapse spaces.

    A handful of Composite paremias come back prefixed with U+200B, which is
    invisible in a diff and would sort and match strangely forever after.
    """
    return " ".join(value.replace("​", "").replace("﻿", "").split())


def _assert_clean(value: str, field: str) -> str:
    """Refuse to write a source string that would collide with a delimiter."""
    for token in RESERVED:
        if token in value:
            raise RuntimeError(
                f"source {field} {value!r} contains the reserved delimiter "
                f"{token!r} — pick new delimiters in harvest_lectionary.py and "
                "lectionarylib.py before harvesting, or the cell will be "
                "parsed wrong")
    return value


def _ref(reading: dict) -> str:
    """A citation, annotated with the commemoration it belongs to.

    A blank `description` means the reading belongs to the continuous daily
    cycle; a named one means it is the appointed reading of a saint or feast
    kept that day. Keeping the annotation is what lets the panel say *why* a
    second Gospel is listed instead of stacking two bare references.
    """
    display = _assert_clean(_clean(reading.get("display") or ""), "display")
    if not display:
        return ""
    desc = _assert_clean(_clean(reading.get("description") or ""), "description")
    return f"{display}{FOR_SEP}{desc}" if desc else display


def _join(refs: Iterable[str]) -> str:
    """Multi-value cell, order-preserving and deduped.

    orthocal legitimately lists the same pericope twice when two
    commemorations on one day are each appointed it (16 Nov 2026 lists Matt
    9.9-13 for both "St Matthew" and "Matthew the Apostle"); the reader wants
    to see it once.
    """
    out: List[str] = []
    seen = set()
    for r in refs:
        if not r or r in seen:
            continue
        seen.add(r)
        out.append(r)
    return ENTRY_SEP.join(out)


def shape_day(day: dict, tradition: str) -> Dict[str, str]:
    """One orthocal day -> one CSV row."""
    epistle, gospel, matins, vespers, other = [], [], [], [], []
    for reading in day.get("readings") or []:
        source = _clean(reading.get("source") or "")
        ref = _ref(reading)
        if not ref:
            continue
        _assert_clean(source, "source")
        if source in EPISTLE_SOURCES:
            epistle.append(ref)
        elif source in GOSPEL_SOURCES:
            gospel.append(ref)
        elif source in VESPERS_SOURCES:
            vespers.append(ref)
        elif "Matins" in source:
            # "Matins Gospel", "1st Matins Gospel" … the numbered resurrectional
            # gospels; keep the ordinal, it is how they are named in the books.
            matins.append(ref if source == "Matins Gospel"
                          else f"{source}{SERVICE_SEP}{ref}")
        else:
            # Royal Hours, the Twelve Passion Gospels, the Great Blessing of
            # Waters, the Cross Procession — each keeps its own service label.
            other.append(f"{source}{SERVICE_SEP}{ref}")

    titles = day.get("titles") or []
    return {
        # `date` is filled by the caller: the response carries the CHURCH date,
        # and we key on the civil one.
        "date": "",
        "tradition": tradition,
        "title": "; ".join(_clean(t) for t in titles if _clean(t)),
        "epistle": _join(epistle),
        "gospel": _join(gospel),
        "matins": _join(matins),
        "vespers": _join(vespers),
        "other": _join(other),
    }


def harvest_year(year: int, traditions: List[str]) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for key in traditions:
        tradition, calendar = TRADITIONS[key]
        for month in range(1, 13):
            log.info("  %s %04d-%02d", key, year, month)
            days = fetch_month(tradition, calendar, year, month)
            # The response carries the CHURCH date (Julian, for the slavic
            # harvest); the civil date is the one we requested, and the one the
            # calendar page keys on. Days come back in civil order, so the
            # index is the civil day of month.
            for index, day in enumerate(days, start=1):
                row = shape_day(day, key)
                row["date"] = f"{year:04d}-{month:02d}-{index:02d}"
                rows.append(row)
    rows.sort(key=lambda r: (r["date"], r["tradition"]))
    return rows


def write_year(year: int, rows: List[Dict[str, str]]) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{year}.csv"
    # CRLF, like the other data CSVs (see CLAUDE.md §7).
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDNAMES, lineterminator="\r\n")
        writer.writeheader()
        writer.writerows(rows)
    return path


# --------------------------------------------------------------------------- #
def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--years", nargs=2, type=int, metavar=("START", "END"),
                        default=[DEFAULT_START, DEFAULT_END],
                        help=f"inclusive year range (default {DEFAULT_START} {DEFAULT_END})")
    parser.add_argument("--tradition", choices=sorted(TRADITIONS), action="append",
                        help="harvest only this tradition (repeatable; default both)")
    parser.add_argument("--force", action="store_true",
                        help="re-fetch years whose CSV already exists")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    traditions = args.tradition or sorted(TRADITIONS)
    start, end = args.years
    if start > end:
        parser.error("START must not be after END")

    written = 0
    for year in range(start, end + 1):
        path = OUT_DIR / f"{year}.csv"
        if path.exists() and not args.force:
            log.info("%d — already harvested (--force to refresh)", year)
            continue
        log.info("%d", year)
        try:
            rows = harvest_year(year, traditions)
        except RuntimeError as exc:
            log.error("%d — %s", year, exc)
            return 1
        write_year(year, rows)
        written += 1
        log.info("%d — wrote %d rows", year, len(rows))

    log.info("done: %d year file(s) written into %s",
             written, OUT_DIR.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
