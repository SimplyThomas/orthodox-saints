#!/usr/bin/env python3
"""
Rewrite the Related Feasts column of data/feasts.csv from a designed,
RECIPROCAL graph of the liturgical year.

Why this exists. The column was authored as a one-way forward chain: each day
pointed at the next and nothing ever pointed back, so 57 of the 72 links in the
file were one-way and 11 rows had no links at all. Two consequences, both
visible on the site:

  * A reader on the Sunday of the Prodigal Son was never told it follows the
    Publican and the Pharisee, because only the earlier page carried the link.
  * The chain skipped the days it passed over. Prodigal Son pointed straight at
    Meatfare Sunday, stepping over the Saturday of Souls between them; Meatfare
    pointed straight at Forgiveness Sunday, stepping over Cheesefare Saturday.

And the pair that prompted this: "Week after the Publican and the Pharisee" did
not link to "Sunday of the Publican and the Pharisee" — the very Sunday it is
named after. Two adjacent index entries with nearly the same name and no stated
relationship between them read as a duplicated row rather than as a Sunday and
the week that follows it. THE FIX FOR THAT COMPLAINT IS A LINK, not a deletion:
they are genuinely different observances (P-70, one day; P-69..P-63, a week).

Edges are declared ONCE, undirected, and symmetrized here. That is the whole
point: a relationship stated in one direction is how the file drifted before.

Run: python3 scripts/relink_feasts.py [--check]
"""

import argparse
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEASTS = ROOT / "data" / "feasts.csv"

# --------------------------------------------------------------------------- #
# The graph. Each tuple is one undirected relationship; both directions are
# written out below. Grouped by the cycle a reader is actually moving through.
# --------------------------------------------------------------------------- #
EDGES: list[tuple[str, str]] = []


def chain(*ids: str) -> None:
    """Consecutive days/observances, each linked to its neighbour."""
    EDGES.extend(zip(ids, ids[1:]))


def hub(centre: str, *spokes: str) -> None:
    """A season or feast and everything that belongs to it."""
    EDGES.extend((centre, s) for s in spokes)


# --- The Triodion: pre-Lent --------------------------------------------------
# The full walk, INCLUDING the Saturdays the old chain stepped over.
chain("FF-0025", "FF-0026", "FF-0027", "FF-0028", "FF-0029",
      "FF-0030", "FF-0031", "FF-0032")
# Each pre-Lenten week and the Sunday it takes its name from. These are the
# links whose absence made the two "Publican and the Pharisee" rows and the two
# "Cheesefare" rows look like duplicates of each other.
hub("FF-0022", "FF-0026", "FF-0027", "FF-0024", "FF-0014")
hub("FF-0024", "FF-0029", "FF-0030", "FF-0031", "FF-0014")

# --- Great Lent --------------------------------------------------------------
hub("FF-0014", "FF-0032", "FF-0033", "FF-0034", "FF-0035", "FF-0036",
    "FF-0037", "FF-0038", "FF-0039", "FF-0040", "FF-0041", "FF-0042",
    "FF-0043", "FF-0015")
chain("FF-0032", "FF-0033", "FF-0034", "FF-0035", "FF-0036", "FF-0037",
      "FF-0038", "FF-0039", "FF-0040", "FF-0041", "FF-0042", "FF-0043",
      "FF-0009")

# --- Holy Week and Pascha ----------------------------------------------------
hub("FF-0015", "FF-0009", "FF-0044", "FF-0045", "FF-0046", "FF-0047",
    "FF-0048", "FF-0049", "FF-0001")
chain("FF-0009", "FF-0044", "FF-0045", "FF-0046", "FF-0047", "FF-0048",
      "FF-0049", "FF-0001")

# --- The Paschal season ------------------------------------------------------
chain("FF-0001", "FF-0050", "FF-0052", "FF-0053", "FF-0054", "FF-0055",
      "FF-0056", "FF-0057", "FF-0058", "FF-0059", "FF-0010", "FF-0060",
      "FF-0061", "FF-0011", "FF-0062", "FF-0063", "FF-0064")
hub("FF-0050", "FF-0051", "FF-0001")
# The three pillars of the movable year stay directly linked to each other, not
# merely strung together through the twelve Sundays between them.
hub("FF-0001", "FF-0059", "FF-0009", "FF-0010", "FF-0011")
hub("FF-0010", "FF-0011")
hub("FF-0011", "FF-0023", "FF-0062", "FF-0061")
hub("FF-0023", "FF-0063", "FF-0016")         # the fast-free week, then the fast
hub("FF-0016", "FF-0063")                    # the Apostles' Fast begins after
chain("FF-0063", "FF-0064")

# --- The Nativity cycle ------------------------------------------------------
hub("FF-0018", "FF-0005", "FF-0004", "FF-0074", "FF-0075")
chain("FF-0074", "FF-0075", "FF-0005", "FF-0076", "FF-0084")
hub("FF-0005", "FF-0021", "FF-0084", "FF-0065", "FF-0006", "FF-0008")
chain("FF-0021", "FF-0019", "FF-0006")
hub("FF-0006", "FF-0019", "FF-0077", "FF-0078", "FF-0065", "FF-0020")
chain("FF-0077", "FF-0078")          # the Sunday before and the Sunday after
hub("FF-0021", "FF-0006", "FF-0065")
# The Meeting is the fortieth day of the Nativity — it belongs to that cycle,
# not to the Cross or the Theotokos feasts it sits between in the file.
hub("FF-0007", "FF-0005", "FF-0002")

# --- The Cross ---------------------------------------------------------------
hub("FF-0003", "FF-0079", "FF-0080", "FF-0068", "FF-0038")
chain("FF-0079", "FF-0080")          # the Sunday before and the Sunday after
hub("FF-0068", "FF-0017")                    # Aug 1 opens the Dormition Fast

# --- The Theotokos -----------------------------------------------------------
chain("FF-0002", "FF-0004", "FF-0008", "FF-0013")
hub("FF-0002", "FF-0013")            # her nativity and her dormition, paired
# The Transfiguration (Aug 6) falls inside the DORMITION fast, not the Nativity
# fast — the fish-allowed relaxation on its feast is a rule of that season.
hub("FF-0017", "FF-0012", "FF-0013")
hub("FF-0002", "FF-0066")                    # first Great Feast of the new year
hub("FF-0069", "FF-0070", "FF-0067", "FF-0083")
hub("FF-0067", "FF-0002", "FF-0013")
hub("FF-0008", "FF-0072")                    # Gabriel's synaxis, the next day

# --- The bodiless powers -----------------------------------------------------
hub("FF-0071", "FF-0072", "FF-0073")

# --- The Saturdays of Souls, as one family -----------------------------------
# They are scattered across the year and a reader on one should be able to find
# the rest; the old file linked each only to the day that happened to follow it.
SOULS = ["FF-0028", "FF-0035", "FF-0037", "FF-0039", "FF-0061", "FF-0081"]
EDGES.extend((a, b) for i, a in enumerate(SOULS) for b in SOULS[i + 1:])

# --- Local commemorations ----------------------------------------------------
hub("FF-0082", "FF-0064")


def build() -> dict[str, list[str]]:
    adj: dict[str, set[str]] = {}
    for a, b in EDGES:
        if a == b:
            sys.exit(f"FATAL: self-reference {a}")
        adj.setdefault(a, set()).add(b)
        adj.setdefault(b, set()).add(a)
    return {k: sorted(v) for k, v in adj.items()}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="report what would change, write nothing")
    args = ap.parse_args()

    adj = build()
    with FEASTS.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        rows = list(reader)
    ids = {r["Feast ID"] for r in rows}

    unknown = sorted(set(adj) - ids)
    if unknown:
        sys.exit(f"FATAL: graph names feasts that do not exist: {unknown}")

    changed = 0
    for r in rows:
        new = "; ".join(adj.get(r["Feast ID"], []))
        if new != r["Related Feasts"]:
            changed += 1
            if args.check:
                print(f"  {r['Feast ID']} {r['Name'][:42]:44}")
                print(f"      was: {r['Related Feasts'] or '(none)'}")
                print(f"      now: {new or '(none)'}")
            r["Related Feasts"] = new

    print(f"{changed} row(s) change; {len(rows) - changed} unchanged.")
    orphans = sorted(ids - set(adj))
    if orphans:
        print(f"WARNING: {len(orphans)} feast(s) still unlinked: {orphans}")
    if args.check:
        return 0

    # CRLF, like every other data CSV here (CLAUDE.md §7).
    with FEASTS.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator="\r\n")
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {FEASTS.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
