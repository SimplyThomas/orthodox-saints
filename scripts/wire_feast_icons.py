#!/usr/bin/env python3
"""
Merge dist/feast_icon_rows.csv (the proposals from download_feast_icons.py) into
data/feast_images.csv and data/feast_depictions.csv.

Kept separate from the downloader on purpose: fetching is a network job that can
half-finish, and writing the source-of-truth CSVs is a reviewed step. This runs
only over rows whose image file is actually on disk.

Rules it enforces, all of them from CLAUDE.md §5a/§9:
  * one hero per feast — an existing hero is NEVER overwritten, it is demoted to
    a card, because the hero already there was chosen by someone
  * NO DUPLICATE ICONS, judged by the vendor PRODUCT URL rather than by our own
    filename. Two harvests of the same catalog name the same icon differently
    (`FF-0012.jpg` and `FF-0012-transfiguration-of-christ-xxic-icon-f216.jpg` are
    one icon), so a path-based check would ship it twice on the same page. The
    `source` URL is the icon's identity; our filename is an implementation detail.
  * every permission row keeps its `source`, which is the grant's condition
  * CRLF out, like every other data CSV here

Run: python3 scripts/wire_feast_icons.py [--dry-run]
"""

import argparse
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"
ROWS = ROOT / "dist" / "feast_icon_rows.csv"
IMAGES = ROOT / "data" / "feast_images.csv"
DEPICTIONS = ROOT / "data" / "feast_depictions.csv"

IMG_FIELDS = ["feast_id", "image_path", "license", "credit", "source"]
DEP_FIELDS = ["feast_id", "image_path", "license", "credit", "source", "kind",
              "tag", "title", "era", "by"]


def read(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write(path: Path, fields: list[str], rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator="\r\n",
                           extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not ROWS.exists():
        sys.exit(f"FATAL: {ROWS} not found — run download_feast_icons.py first.")
    proposals = read(ROWS)
    images, depictions = read(IMAGES), read(DEPICTIONS)

    have_hero = {r["feast_id"] for r in images}
    # Identity is the product URL, not our filename — see the module docstring.
    # A feast already showing an icon as its hero must not also show it as a card.
    have_icon = {(r["feast_id"], (r.get("source") or "").rstrip("/"))
                 for r in images + depictions}

    added_h = added_c = skipped = dupes = 0
    for p in proposals:
        fid, path = p["feast_id"], p["image_path"]
        key = (fid, (p.get("source") or "").rstrip("/"))
        if not (STATIC / path).exists():
            print(f"  SKIP (file missing): {path}", file=sys.stderr)
            skipped += 1
            continue
        if key in have_icon:
            print(f"  {fid}: already shown from {key[1]} — skipping duplicate")
            dupes += 1
            continue
        if p["role"] == "hero":
            if fid in have_hero:
                print(f"  {fid}: hero already set — adding as a card instead")
                p = dict(p, role="card")
            else:
                images.append({k: p[k] for k in IMG_FIELDS})
                have_hero.add(fid)
                have_icon.add(key)
                added_h += 1
                continue
        depictions.append({k: p[k] for k in DEP_FIELDS})
        have_icon.add(key)
        added_c += 1

    # Keep both files grouped by feast so a human can read them.
    images.sort(key=lambda r: r["feast_id"])
    depictions.sort(key=lambda r: (r["feast_id"], r["image_path"]))

    print(f"\n+{added_h} hero(es), +{added_c} card(s), "
          f"{dupes} already-present, {skipped} skipped.")
    print(f"feast_images.csv: {len(images)} rows | "
          f"feast_depictions.csv: {len(depictions)} rows")
    if args.dry_run:
        print("(dry run — nothing written)")
        return 0
    write(IMAGES, IMG_FIELDS, images)
    write(DEPICTIONS, DEP_FIELDS, depictions)
    print("written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
