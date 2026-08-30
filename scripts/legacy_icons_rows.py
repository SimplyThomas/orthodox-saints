#!/usr/bin/env python3
"""Turn dist/legacy_icons_rows.csv into image + depiction rows.

Companion to scripts/download_legacy_icons.py. That script proposes and fetches;
this one writes the proposals into the joins.

It began as host/feast only, on the reasoning that those two have more columns
than the saint join and so are worth doing by rule rather than by hand. That
holds for five rows and not for three hundred: the saint join takes the same
shape, and typing it out is where a wrong id gets in. All four files are
written here now. The `christ` routing bucket is the saint join too — OS-0000
and OS-0001 are saint rows like any other.

Usage:  python3 scripts/legacy_icons_rows.py .

Heroes go to <db>_images.csv; cards to <db>_depictions.csv with the card fields
the carousel needs. The parenthetical in a Legacy Icons product title is doing
one of three jobs, and they belong in three different columns:

  (XXIc)          -> era, spelled out ("21st c.")
  (Whirledge)     -> by, the iconographer
  (Athos)/(Sinai) -> left in the title; it names the source icon, not a person

Guessing wrong here is cheap to fix but ugly on the page, so anything that is
not clearly a century or a known iconographer stays in the title.
"""
import csv
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
ROWS = ROOT / "dist" / "legacy_icons_rows.csv"

CENTURY = {
    "XXI": "21st", "XX": "20th", "XIX": "19th", "XVIII": "18th", "XVII": "17th",
    "XVI": "16th", "XV": "15th", "XIV": "14th", "XIII": "13th", "XII": "12th",
    "XI": "11th", "X": "10th", "IX": "9th", "VIII": "8th", "VII": "7th",
    "VI": "6th", "V": "5th", "IV": "4th",
}
# Iconographers seen in this catalog. A name not on this list stays in the
# title rather than being asserted as an artist.
ICONOGRAPHERS = {
    "whirledge", "koufos", "clark", "fiorenzo", "stryzhak", "poulakis",
    "davidovskiy", "grygorenko", "chimev", "kratovo",
}
# Which join each routing bucket writes into. `christ` is not a fourth
# database — OS-0000 and OS-0001 are rows in saints.csv.
TABLE = {"saint": "saint", "christ": "saint", "host": "host", "feast": "feast"}
SKU_TAIL = re.compile(r"\s*-\s*[A-Z]{1,2}\d{2,4}\s*$")
PAREN = re.compile(r"\s*\(([^)]{1,28})\)")


def split_title(raw: str) -> tuple[str, str, str]:
    """product title -> (title, era, by)"""
    t = SKU_TAIL.sub("", raw).strip()
    era, by = "", ""
    for m in list(PAREN.finditer(t)):
        inner = m.group(1).strip()
        cm = re.fullmatch(r"([IVXL]+)c", inner)
        if cm and cm.group(1) in CENTURY:
            era = f"{CENTURY[cm.group(1)]} c."
            t = t.replace(m.group(0), "")
        elif inner.lower() in ICONOGRAPHERS:
            by = inner
            t = t.replace(m.group(0), "")
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"\s*\bIcon(?:\s+Set)?\b\s*$", "", t, flags=re.I).strip()
    return t, era, by or "Legacy Icons"


def main() -> int:
    rows = list(csv.DictReader(ROWS.open(encoding="utf-8")))
    # The proposed-rows file carries an ALREADY-CLEANED title, which has had its
    # parenthetical stripped — so "Annunciation (Rublev)" arrives as plain
    # "Annunciation", and a record's four cards all end up with one name. Join
    # back to the review queue on the product URL for the raw title.
    review = ROOT / "dist" / "legacy_icons_review.csv"
    raw = {r["product_url"]: r["product_title"]
           for r in csv.DictReader(review.open(encoding="utf-8"))}
    out: dict[str, list] = {}
    # Seed the label set from what the carousels ALREADY hold, not just from
    # this run. The rule below is "one card per distinct label per record", and
    # a run that only remembers itself re-adds a card the file has carried
    # since the last batch.
    labels: set = set()
    for db in sorted(set(TABLE.values())):
        p_ = ROOT / "data" / f"{db}_depictions.csv"
        if not p_.exists():
            continue
        for row in csv.reader(p_.open(encoding="utf-8-sig")):
            if len(row) >= 10 and row[0] and row[0] != f"{db}_id":
                labels.add((row[0], row[7], row[8], row[9]))
    for r in rows:
        db, rid = TABLE.get(r["db"]), r["id"]
        if db is None:
            print(f"  SKIP (unknown db {r['db']!r}): {rid}", file=sys.stderr)
            continue
        if r["kind"] == "accept":
            out.setdefault(f"{db}_images", []).append(
                [rid, r["image_path"], r["license"], "", r["source"]])
        else:
            title, era, by = split_title(raw.get(r["source"], r["title"]))
            # One card per DISTINCT LABEL within a record. Two cards reading
            # "Guardian Angel / Legacy Icons" are two different icons, but a
            # visitor cannot tell which is which — and a carousel that repeats
            # itself looks broken rather than rich. If we cannot say how a card
            # differs, it does not earn its own slot.
            label = (rid, title, era, by)
            if label in labels:
                continue
            labels.add(label)
            out.setdefault(f"{db}_depictions", []).append(
                [rid, r["image_path"], r["license"], "", r["source"],
                 "shop", "Available to order", title, era, by])
    for name, lines in sorted(out.items()):
        p = ROOT / "data" / f"{name}.csv"
        blob = p.read_bytes()
        have = {ln.split(b",")[1] for ln in blob.split(b"\r\n") if ln.count(b",") > 1}
        add = []
        for row in lines:
            if row[1].encode() in have:
                continue
            buf = csv.StringIO() if hasattr(csv, "StringIO") else None
            import io
            s = io.StringIO()
            csv.writer(s, lineterminator="").writerow(row)
            add.append(s.getvalue().encode() + b"\r\n")
        if not blob.endswith(b"\r\n"):
            blob += b"\r\n"
        p.write_bytes(blob + b"".join(add))
        print(f"{name}.csv  +{len(add)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
