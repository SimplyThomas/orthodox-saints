#!/usr/bin/env python3
"""
Fetch saint and heavenly-host icons from a CURATED manifest of vendor product
URLs — the OS-####/HH-#### sibling of scripts/download_feast_icons.py.

WHY A MANIFEST AND NOT A MATCHER. scripts/download_legacy_icons.py has to guess
which of ~2,900 saints a product title means, and everything hard about it (the
scoring, the margin rule, the review queue) exists to stop a wrong guess from
shipping. This script is for the other case: a human has already decided that
THIS product is THIS record — usually because the subject is not a portrait at
all (the Mystical Supper, the Hospitality of Abraham) or because the name alone
is ambiguous in the data (there are five Barlaams, two Phocases of Sinope, and
three Alypii). The manifest IS the review, exactly as it is for the feasts.

It still PROPOSES rather than writing data/: rows land in
dist/subject_icon_rows.csv for a human to paste into data/saint_images.csv,
data/saint_depictions.csv, data/host_images.csv or data/host_depictions.csv.

Politeness is inherited verbatim from the siblings (CLAUDE.md §9, and the note
at the top of download_legacy_icons.py): one request at a time, a descriptive
User-Agent carrying a contact address, and a 10s delay. An earlier harvest in
this repo fetched hard while every request was failing and got this machine
IP-blocked by the very people who granted the permission. DO NOT LOWER THE
DELAY. Pages and images cache under dist/subject_icons/, so an interrupted run
resumes for free.

Both vendors run BigCommerce, so one og:image rewrite serves both.

Usage:
    python3 scripts/download_subject_icons.py --limit 4    # ALWAYS start here
    python3 scripts/download_subject_icons.py              # the whole manifest
    python3 scripts/download_subject_icons.py --rows-only  # re-emit from cache
"""

import argparse
import csv
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
CACHE = DIST / "subject_icons"
MANIFEST = Path(__file__).resolve().parent / "subject_icon_manifest.csv"
ROWS_OUT = DIST / "subject_icon_rows.csv"
STATIC = ROOT / "static"
ICONS = STATIC / "icons"

UA = ("CloudOfWitnesses/1.0 (+https://orthodoxsaintfinder.com; "
      "thomas.m.krug@gmail.com) permitted-partner-image-harvest")

# The image pipeline, the og:image rewrite and the title/era cleaning all live
# in the siblings; this script is the manifest walker, not a second copy of
# them. (Both vendors' photography is the same product staging, so `resize`
# is tuned for it once.)
sys.path.insert(0, str(Path(__file__).resolve().parent))
from download_legacy_icons import resize, slugify  # noqa: E402
from download_feast_icons import (  # noqa: E402
    OG_IMAGE_RE, OG_TITLE_RE, VENDORS, clean_title, era_of, full_size,
)

ID_RE = re.compile(r"^(OS|HH)-\d{4,}$")


def vendor_of(url: str) -> tuple[str, str]:
    for host, v in VENDORS.items():
        if host in url:
            return v
    sys.exit(f"FATAL: no permission grant on record for {url}\n"
             "Every vendor image needs a row in data/image_permissions.csv "
             "(CLAUDE.md §9).")


def fetch(url: str, cache_name: str, delay: float, binary: bool = False):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / cache_name
    if path.exists():
        return path.read_bytes() if binary else path.read_text(
            encoding="utf-8", errors="replace")
    if not shutil.which("curl"):
        sys.exit("FATAL: curl not found — this script fetches via curl.")
    print(f"  fetch {url}", flush=True)
    time.sleep(delay)
    cmd = ["curl", "-sS", "--compressed", "--max-time", "90", "-A", UA]
    try:
        if binary:
            r = subprocess.run(cmd + ["-w", "%{http_code}", "-o", str(path),
                                      url],
                               capture_output=True, text=True, timeout=120)
            code = r.stdout.strip()
        else:
            r = subprocess.run(cmd + ["-w", "\n%{http_code}", url],
                               capture_output=True, text=True, timeout=120)
            body, _, code = r.stdout.rpartition("\n")
            code = code.strip()
    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT {url}", file=sys.stderr)
        path.unlink(missing_ok=True)
        return None
    if code != "200":
        print(f"  HTTP {code or '???'} {url}", file=sys.stderr)
        path.unlink(missing_ok=True)
        return None
    if binary:
        return path.read_bytes()
    path.write_text(body, encoding="utf-8")
    return body


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--delay", type=float, default=10.0,
                    help="seconds between requests (default 10.0 — DO NOT "
                         "LOWER; their robots.txt asks for 10)")
    ap.add_argument("--limit", type=int, default=0, metavar="N",
                    help="stop after N manifest rows (start with --limit 4)")
    ap.add_argument("--rows-only", action="store_true",
                    help="re-emit proposed rows from the cache, no fetching")
    args = ap.parse_args()

    if not MANIFEST.exists():
        sys.exit(f"FATAL: {MANIFEST} not found.")
    with MANIFEST.open(encoding="utf-8", newline="") as f:
        rows = [r for r in csv.DictReader(f)
                if (r.get("record_id") or "").strip()
                and not (r.get("record_id") or "").lstrip().startswith("#")]
    for r in rows:
        if not ID_RE.match(r["record_id"].strip()):
            sys.exit(f"FATAL: {r['record_id']!r} is not an OS-#### or HH-#### "
                     "id. The join is BY ID, never by name (CLAUDE.md §6).")
    if args.limit:
        rows = rows[:args.limit]
    print(f"{len(rows)} manifest row(s).")

    # One product may serve several records — a pair icon (Aquila and
    # Priscilla) is a card on both their rows, and a scene belongs to everyone
    # standing in it. Download once, reference as often as the manifest says.
    files: dict[str, str] = {}              # product_url -> image_path
    meta: dict[str, tuple[str, str]] = {}   # product_url -> (title, era)
    proposed, failed = [], 0

    for r in rows:
        rid = r["record_id"].strip()
        role = r["role"].strip().lower()
        url = r["product_url"].strip()
        slug, vendor_name = vendor_of(url)
        # Saints and hosts share one directory per vendor — the grant is per
        # vendor, and the id prefix already says which database a file serves.
        dest_dir = ICONS / "permission" / slug
        stem = f"{rid}-{slugify(url.split('/')[-2])[:44]}"

        if url not in files:
            page = fetch(url, f"page-{slugify(url.split('/')[-2])}.html",
                         args.delay)
            if page is None:
                failed += 1
                continue
            og = OG_IMAGE_RE.search(page)
            ot = OG_TITLE_RE.search(page)
            if not og:
                print(f"  NO og:image on {url}", file=sys.stderr)
                failed += 1
                continue
            img_url = full_size(og.group(1))
            if not img_url:
                print(f"  UNPARSEABLE og:image {og.group(1)}", file=sys.stderr)
                failed += 1
                continue
            raw_title = ot.group(1) if ot else url.split("/")[-2]
            dest = dest_dir / f"{stem}.jpg"
            if not dest.exists():
                if args.rows_only:
                    print(f"  MISSING (rows-only): {dest.name}",
                          file=sys.stderr)
                    failed += 1
                    continue
                blob = fetch(img_url, f"img-{stem}.bin", args.delay,
                             binary=True)
                if blob is None or not resize(blob, dest):
                    failed += 1
                    continue
                print(f"  wrote {dest.relative_to(ROOT)}")
            else:
                print(f"  have {dest.name}")
            files[url] = dest.relative_to(STATIC).as_posix()
            meta[url] = (clean_title(raw_title), era_of(raw_title))

        if url not in files:
            continue
        # A second record reusing the same product keeps the first record's
        # file: the id prefix on the filename names the record it was fetched
        # for, not the only one allowed to point at it.
        title, era = meta[url]
        proposed.append({
            "role": role,
            "record_id": rid,
            "image_path": files[url],
            "license": f"Permission:{slug}",
            "credit": "",
            "source": url,
            "kind": "shop",
            "tag": "Available to order",
            "title": title,
            "era": era,
            "by": vendor_name,
            "note": (r.get("note") or "").strip(),
        })

    DIST.mkdir(parents=True, exist_ok=True)
    with ROWS_OUT.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "role", "record_id", "image_path", "license", "credit", "source",
            "kind", "tag", "title", "era", "by", "note"])
        w.writeheader()
        w.writerows(proposed)

    print(f"\n{len(proposed)} row(s) ready; {failed} failed.")
    print(f"Proposed rows -> {ROWS_OUT.relative_to(ROOT)}")
    print("These are PROPOSALS. role=hero goes to data/saint_images.csv or\n"
          "data/host_images.csv (saint_id,image_path,license,credit,source);\n"
          "role=card to data/saint_depictions.csv or data/host_depictions.csv\n"
          "(+kind,tag,title,era,by). Then run `python3 build.py --check-only`.\n"
          "Mind the CRLF line endings (CLAUDE.md §7).")
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
