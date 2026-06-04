#!/usr/bin/env python3
"""Search-before-add helper (CLAUDE.md §6).

Given a name (and optionally a century/region word), list existing saints that
might be the same person under a variant spelling, so you reconcile instead of
creating a duplicate. Matches on a normalized form of Name + Also Known As, by
substring and by shared word-tokens, ranked by overlap.

Usage:
    python tools/find_saint.py "Gregory of Nyssa"
    python tools/find_saint.py Maximus 7th        # extra words narrow the rank
    make find NAME="Sava of Serbia"
"""
import csv
import re
import sys
from pathlib import Path

SAINTS_CSV = Path(__file__).resolve().parent.parent / "data" / "saints.csv"

# Common honorifics/stopwords that add noise to name matching.
STOP = {
    "st", "saint", "the", "of", "venerable", "blessed", "holy", "martyr",
    "martyrs", "hieromartyr", "new", "great", "righteous", "father", "mother",
    "bishop", "archbishop", "patriarch", "and", "his", "her", "their", "wonderworker",
}


def norm_tokens(s: str) -> set[str]:
    words = re.sub(r"[^a-z0-9 ]", " ", s.lower()).split()
    return {w for w in words if w not in STOP and len(w) > 1}


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    query = " ".join(argv)
    qtokens = norm_tokens(query)
    qnorm = re.sub(r"[^a-z0-9]", "", query.lower())

    rows = list(csv.DictReader(SAINTS_CSV.open(encoding="utf-8")))
    scored = []
    for r in rows:
        hay = r["Name"] + " " + r["Also Known As"]
        htokens = norm_tokens(hay)
        hnorm = re.sub(r"[^a-z0-9]", "", hay.lower())
        overlap = len(qtokens & htokens)
        substr = qnorm and (qnorm in hnorm or hnorm in qnorm)
        score = overlap + (3 if substr else 0)
        if score > 0:
            scored.append((score, r))

    scored.sort(key=lambda t: (-t[0], t[1]["Saint ID"]))
    if not scored:
        print(f"No existing saint resembles {query!r}. Safe to add a new row.")
        return 0

    print(f"{len(scored)} possible match(es) for {query!r} "
          "— reconcile (enrich) rather than duplicate if it's the same saint:\n")
    for score, r in scored[:15]:
        aka = f"  [aka: {r['Also Known As']}]" if r["Also Known As"] else ""
        print(f"  {r['Saint ID']}  ({r['Feast Day(s)']})  {r['Name']}{aka}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
