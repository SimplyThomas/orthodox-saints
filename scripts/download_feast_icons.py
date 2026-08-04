#!/usr/bin/env python3
"""
Fetch festal icons for data/feast_images.csv + data/feast_depictions.csv from a
CURATED manifest of vendor product URLs.

This is the feast sibling of scripts/download_legacy_icons.py, and it is a much
smaller program for one reason: THE MATCH IS ALREADY MADE. That script has to
guess which of 2,908 saints a product title means, and everything hard about it
— the scoring, the margin rule, the review CSV, the rejects file — exists to
keep a wrong guess from shipping. Here a human has already written down which
product URL belongs to which FF-####, in scripts/feast_icon_manifest.csv. There
is nothing left to infer, so there is no review queue: the manifest IS the
review.

What it does: for each manifest row, fetch the product page, lift the full-size
image off the og:image tag, resize it exactly as the Legacy Icons harvester does
(trim the white product staging, fit inside 800x800, emit a thumb), and write
proposed CSV rows to dist/feast_icon_rows.csv for a human to paste in.

It still PROPOSES rather than writing data/. Same reason as every other harvest
here: the data CSVs are the source of truth and they change under review, not
under a script.

Politeness is inherited verbatim from the sibling (CLAUDE.md, and the note in
download_legacy_icons.py): one request at a time, a descriptive User-Agent with
a contact address, and a 10s delay. An earlier harvest in this repo got this
machine IP-blocked by the very people who granted the permission. DO NOT LOWER
THE DELAY. Pages and images are cached under dist/feast_icons/, so a re-run
after an interruption costs nothing.

Both vendors run BigCommerce, so one og:image rewrite serves both.

Usage:
    python3 scripts/download_feast_icons.py --limit 4    # ALWAYS start here
    python3 scripts/download_feast_icons.py              # the whole manifest
    python3 scripts/download_feast_icons.py --rows-only  # re-emit from cache
"""

import argparse
import csv
import html as htmllib
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DIST = ROOT / "dist"
CACHE = DIST / "feast_icons"
MANIFEST = Path(__file__).resolve().parent / "feast_icon_manifest.csv"
ROWS_OUT = DIST / "feast_icon_rows.csv"
STATIC = ROOT / "static"
ICONS = STATIC / "icons"

UA = ("CloudOfWitnesses/1.0 (+https://orthodoxsaintfinder.com; "
      "thomas.m.krug@gmail.com)")

# Each vendor's grant is per-vendor and its files live in its own tree
# (CLAUDE.md §9). Keyed by hostname so the manifest can mix the two freely.
VENDORS = {
    "legacyicons.com": ("legacy-icons", "Legacy Icons"),
    "theophanyworks.com": ("theophany-works", "Theophany Works"),
}

# Reuse the sibling's image pipeline rather than restating it. Its resize() is
# tuned to exactly this photography (trim the white sweep, fit inside the box
# instead of top-cropping, keep the vendor watermark intact) and that reasoning
# should live in one place.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from download_legacy_icons import resize, slugify  # noqa: E402

# og:image  .../products/<pid>/images/<iid>/<file>.<w>.<h>.jpg
# full-size .../images/stencil/1280x1280/products/<pid>/<iid>/<file>.jpg
OG_IMAGE_RE = re.compile(r'og:image"\s+content="([^"]+)"')
OG_TITLE_RE = re.compile(r'og:title"\s+content="([^"]+)"')
PRODUCT_IMG_RE = re.compile(
    r"^(https://cdn11\.bigcommerce\.com/[^/]+)/products/(\d+)/images/(\d+)/"
    r"(.+?)\.\d+\.\d+(\.\w+)$")

# Vendor SKU noise in the product title: "... Icon - F174", "- 00FTR001".
TITLE_NOISE = re.compile(
    r"\s*[-–]\s*(?:[A-Z]{1,2}\d{2,4}|00[A-Z]{2,5}\d{2,3})\s*$", re.I)
ICON_WORD_RE = re.compile(r"\s*\bIcon\b\s*$", re.I)
LEADING_RE = re.compile(r"^\s*Icon of (?:The |the )?", re.I)
# "(XXIc)" in the title says the same thing as the era dateline the card
# already prints beside it. Drop it from the heading, keep it in `era`.
PAREN_CENTURY_RE = re.compile(r"\s*\(\s*[IVX]{1,6}c\s*\)", re.I)

# Roman-numeral century in a Legacy Icons title ("XVIc", "XXIc") -> the era
# dateline the depiction card prints. Their own convention, so decode it here
# rather than hand-typing 71 datelines.
ROMAN = {"IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10,
         "XI": 11, "XII": 12, "XIII": 13, "XIV": 14, "XV": 15, "XVI": 16,
         "XVII": 17, "XVIII": 18, "XIX": 19, "XX": 20, "XXI": 21}
CENTURY_RE = re.compile(r"\b([IVX]{1,6})c\b", re.I)
# Theophany Works spells it out: "- 20th c.", "21st c.".
CENTURY_WORD_RE = re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)\s*c\.?", re.I)


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


def full_size(og_image: str) -> str:
    """og:image -> the 1280px original.

    We take 1280 and resize locally rather than asking the CDN for 800: the
    CDN's resize does not trim the product staging, and trimming is what makes
    the icon fill the frame instead of floating in a white box.
    """
    m = PRODUCT_IMG_RE.match(og_image.split("?")[0])
    if not m:
        return ""
    base, pid, iid, name, ext = m.groups()
    return (f"{base}/images/stencil/1280x1280/products/{pid}/{iid}/{name}{ext}"
            "?c=1&imbypass=on")


def clean_title(raw: str) -> str:
    t = htmllib.unescape(raw).strip()
    t = TITLE_NOISE.sub("", t)
    t = LEADING_RE.sub("", t)
    t = ICON_WORD_RE.sub("", t)
    t = PAREN_CENTURY_RE.sub("", t)
    return t.strip(" -–")


def era_of(raw: str) -> str:
    m = CENTURY_WORD_RE.search(raw)
    if m:
        return f"{m.group(1)}th c." if not m.group(0).lower().startswith(
            m.group(1) + "s") else f"{m.group(1)}th c."
    m = CENTURY_RE.search(raw)
    if m:
        n = ROMAN.get(m.group(1).upper())
        if n:
            suffix = "th" if 11 <= n % 100 <= 13 else \
                {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
            return f"{n}{suffix} c."
    return ""


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
                if (r.get("feast_id") or "").strip()]
    if args.limit:
        rows = rows[:args.limit]
    print(f"{len(rows)} manifest row(s).")

    # One product may serve two feasts (the Dormition icons carry both the
    # feast and its fast; the Publican and the Pharisee icon carries both the
    # Sunday and the week named from it). Download once, reference twice.
    files: dict[str, str] = {}          # product_url -> image_path
    meta: dict[str, tuple[str, str]] = {}   # product_url -> (title, era)
    proposed, failed = [], 0

    for r in rows:
        fid = r["feast_id"].strip()
        role = r["role"].strip().lower()
        url = r["product_url"].strip()
        slug, vendor_name = vendor_of(url)
        dest_dir = ICONS / "permission" / slug / "feasts"

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
            stem = f"{fid}-{slugify(url.split('/')[-2])[:44]}"
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
        title, era = meta[url]
        proposed.append({
            "role": role,
            "feast_id": fid,
            "image_path": files[url],
            "license": f"Permission:{slug}",
            "credit": "",
            "source": url,
            "kind": "shop",
            "tag": "Available to order",
            "title": title,
            "era": era,
            "by": vendor_name,
        })

    DIST.mkdir(parents=True, exist_ok=True)
    with ROWS_OUT.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "role", "feast_id", "image_path", "license", "credit", "source",
            "kind", "tag", "title", "era", "by"])
        w.writeheader()
        w.writerows(proposed)

    print(f"\n{len(proposed)} row(s) ready; {failed} failed.")
    print(f"Proposed rows -> {ROWS_OUT.relative_to(ROOT)}")
    print("These are PROPOSALS. Paste role=hero into data/feast_images.csv and "
          "role=card\ninto data/feast_depictions.csv, then run "
          "`python3 build.py --check-only`.\nMind the CRLF line endings "
          "(CLAUDE.md §7).")
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
