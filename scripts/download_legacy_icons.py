#!/usr/bin/env python3
"""
Harvest Legacy Icons product images into a REVIEW QUEUE.

Legacy Icons has granted permission to display their icons with a visible credit
and a link back to each icon's own product page (docs/permissions/legacy-icons.md,
CLAUDE.md §9). This script gathers the catalog and proposes matches; it does NOT
write data/saint_images.csv.

It writes dist/legacy_icons_review.csv, which a human promotes — the same
propose-only pattern as the Wikimedia icon downloader, the OCA hymn harvester,
and profilegen, and for the same reason: THE JOIN IS BY SAINT IDENTITY, and
identity is exactly what an automated name match gets wrong. There are five
Barlaams in saints.csv. A portrait filed against the wrong man is worse than no
portrait, because it looks right.

*** THE MATCH HERE IS WEAKER THAN THE HYMN HARVESTER'S. READ THIS. ***

The OCA harvester could restrict its candidate pool to the saints commemorated on
one calendar day, and that restriction is what made name matching tractable at
all. This script has no such anchor: ~650 product titles against 2,908 saints,
with nothing but the name to go on. Three things compensate, none of them a
substitute for a human:

  * The product titles are unusually specific ("Saint John Maximovitch of
    Shanghai and San Francisco Icon - S208"), because they have to sell the icon.
  * Every card carries a descriptive alt text, which often names the saint's
    office or attribute, and is emitted into the review CSV as extra evidence.
  * A match must beat the runner-up BY A MARGIN. Where it does not, the row is
    marked `ambiguous` and the top three candidates are all written out, so the
    reviewer picks rather than rubber-stamps.

Confidence is a sorting aid for the reviewer. It is not a promotion gate.

How it works:

  1. Fetch the category pages at ?limit=100 — seven requests covers all 651
     saints products, instead of 651 product-page hits for titles the category
     page already lists. Cached under dist/legacy_icons/, so re-runs are free
     and re-parsing never re-fetches.
  2. Classify each product BEFORE matching, because they do not all belong to
     the same database: saints -> OS-####, angels -> HH-#### (heavenly_hosts),
     feasts and scenes -> FF-#### (feasts), Christ -> OS-0000, the Theotokos ->
     OS-0001. Not-yet-glorified figures are dropped outright (§9).
  3. Score every candidate in the routed database and emit the top three.
  4. --download then fetches full-size images for rows a human marked accept.

Politeness. Their robots.txt permits category and product pages but gives named
AI crawlers Crawl-delay: 10. We are a permitted partner rather than a training
bot, and that is not a licence to be fast: requests go one at a time, with a
descriptive User-Agent carrying a contact address, and the default delay is 10s.
An earlier harvest in this repo fetched hard while every request was failing and
got this machine IP-blocked by the very people who had granted the permission.
Do not lower the delay. If requests start failing, STOP and wait.

Usage:
    python3 scripts/download_legacy_icons.py --limit 20   # ALWAYS start here
    python3 scripts/download_legacy_icons.py              # full catalog
    python3 scripts/download_legacy_icons.py --no-fetch   # re-match the cache
    python3 scripts/download_legacy_icons.py --download   # after human review
"""

import argparse
import csv
import html as htmllib
import re
import shutil
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DIST = ROOT / "dist"
CACHE = DIST / "legacy_icons"
REVIEW = DIST / "legacy_icons_review.csv"
# Rejected matches, COMMITTED (unlike the queue, which lives in git-ignored
# dist/ and is rebuilt from scratch on every harvest). Without this a match a
# human examined and threw out is simply re-proposed next run.
REJECTS = Path(__file__).resolve().parent / "legacy_icons_rejects.txt"
ICONS = ROOT / "static" / "icons"
DEST_DIR = ICONS / "permission" / "legacy-icons"
THUMBS = ICONS / "thumbs"

VENDOR_SLUG = "legacy-icons"
UA = ("CloudOfWitnesses/1.0 (+https://orthodoxsaintfinder.com; "
      "contact@orthodoxsaintfinder.com) permitted-partner-image-harvest")

# Category paths to walk. The saints category is the bulk of it (651 products);
# the others feed OS-0000/OS-0001 and the feasts database.
CATEGORIES = [
    "/icons/saints/",
    "/icons/jesus-christ/",
    "/icons/virgin-mary/",
    "/icons/holy-trinity/",
]
BASE = "https://legacyicons.com"
PER_PAGE = 100
MAX_PAGES = 12          # backstop; 651 products is 7 pages at limit=100

MAX_DIM = 800           # ingest resize, CLAUDE.md §5
THUMB_WIDTH = 200
THUMB_MAX_HEIGHT = 250
JPEG_QUALITY = 80
# Trim the white photographic sweep and drop shadow around the mounted plaque.
# See _resize_node for what this does and does not touch — the watermark stays.
TRIM_STAGING = True

# --------------------------------------------------------------------------- #
# Name folding — shared idiom with scripts/download_saint_hymns.py.
# --------------------------------------------------------------------------- #
STOPWORDS = {
    "saint", "saints", "st", "sts", "holy", "venerable", "blessed", "righteous",
    "martyr", "martyrs", "hieromartyr", "hieromartyrs", "greatmartyr",
    "great", "new", "virgin", "virginmartyr", "passionbearer", "confessor",
    "confessors", "wonderworker", "wonderworkers", "unmercenary", "unmercenaries",
    "prophet", "apostle", "apostles", "equal", "bishop", "archbishop",
    "patriarch", "metropolitan", "abbot", "abbess", "monk", "nun", "priest",
    "deacon", "hierarch", "the", "of", "and", "his", "her", "their", "with",
    "at", "in", "who", "de", "fool", "christ", "foolforchrist", "prince",
    "princess", "king", "queen", "emperor", "empress", "child", "children",
    "mother", "father", "son", "daughter", "brother", "sister", "companions",
    "enlightener", "wonder", "worker", "elder", "eldress", "ascetic", "recluse",
    "icon", "orthodox", "hand", "crafted", "handcrafted",
}

# Product-title noise: the SKU tail, the size/mount words, and the parenthetical
# iconographer or century marks — "(Whirledge)", "(XXIc)", "(Fiorenzo)".
TITLE_NOISE = re.compile(
    r"\s*-\s*[A-Z]{1,2}\d{2,4}\s*$"                 # " - S220"
    r"|\s*\((?:[IVXLC]+c|[^)]{1,28})\)"             # "(XXIc)", "(Whirledge)"
    r"|\b(?:micro|mini|small|medium|large|mounted|plaque|prayer\s+card|"
    r"gold\s+leaf|silver\s+leaf|wall\s+hanging|pendant|magnet|sticker|"
    r"bookmark|triptych|diptych)\b",
    re.I,
)

# Products that must never be auto-routed to a saint row.
#   * §9 canonization caution — figures the Church has not glorified. Legacy
#     Icons sells icons of some; we do not record them as saints. (Fr Seraphim
#     Rose has a Witnesses-of-Our-Time page, which is a memorial section with
#     no liturgical address — deliberately not a saint row, CLAUDE.md §11.)
NOT_GLORIFIED = [
    "seraphim rose", "father seraphim", "fr seraphim rose", "platina",
]
# Merchandise that is not an icon reproduction worth wiring.
NON_ICON = [
    "gift card", "incense", "censer", "charcoal", "candle", "oil lamp",
    "vigil lamp", "prayer rope", "komboskini", "book", "cross necklace",
]


def fold(s: str) -> str:
    """Accent-naive, punctuation-free lowercase — the comparison form."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def tokens(name: str) -> set[str]:
    """Distinguishing tokens of a name: folded, stopworded, deduped."""
    return {t for t in fold(name).split() if t and t not in STOPWORDS}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def score(ptok: set[str], name: set[str], full: set[str]) -> float:
    """How well a product title matches one of our records.

    Three readings, best wins, because they fail in different places — the same
    scoring as the hymn harvester, and the same caveat: containment is
    discounted because it is the loosest of the three and must never on its own
    beat a real jaccard agreement.
    """
    inter = len(ptok & full)
    contain = inter / min(len(ptok), len(full)) if ptok and full else 0.0
    return max(jaccard(ptok, name), jaccard(ptok, full), 0.9 * contain)


# --------------------------------------------------------------------------- #
# Fetching. curl, not urllib/requests: the sibling harvester learned that some
# of these storefronts sit behind a WAF that rejects on TLS fingerprint alone,
# and curl is what was verified working against this host.
# --------------------------------------------------------------------------- #
def fetch(url: str, cache_name: str, delay: float, force: bool) -> str | None:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / cache_name
    if path.exists() and not force:
        return path.read_text(encoding="utf-8", errors="replace")
    if not shutil.which("curl"):
        sys.exit("FATAL: curl not found — this script fetches via curl.")
    print(f"  fetch {url}", flush=True)
    time.sleep(delay)
    try:
        r = subprocess.run(
            ["curl", "-sS", "--compressed", "--max-time", "60",
             "-A", UA, "-w", "\n%{http_code}", url],
            capture_output=True, text=True, timeout=90,
        )
    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT {url}", file=sys.stderr)
        return None
    body, _, code = r.stdout.rpartition("\n")
    if code.strip() != "200":
        print(f"  HTTP {code.strip() or '???'} {url}", file=sys.stderr)
        return None
    path.write_text(body, encoding="utf-8")
    return body


# --------------------------------------------------------------------------- #
# Parsing. BigCommerce Stencil product cards. No JSON-LD Product schema on this
# storefront, so read the card markup: the anchor carries the product URL, the
# <img> the CDN path, and alt/title a descriptive sentence that is often the
# best disambiguator available.
# --------------------------------------------------------------------------- #
CARD_RE = re.compile(r'<article class="card\s*"(.*?)</article>', re.S)
HREF_RE = re.compile(r'<a href="(https://legacyicons\.com/[^"]+)"')
IMG_RE = re.compile(r'<img src="(https://cdn11\.bigcommerce\.com/[^"]+)"')
ALT_RE = re.compile(r'<img[^>]*\salt="([^"]*)"')
TITLE_RE = re.compile(r'<h3 class="card-title">\s*<a[^>]*>(.*?)</a>', re.S)
SKU_RE = re.compile(r"-\s*([A-Z]{1,2}\d{2,4})\s*$")
# .../images/stencil/<size>/products/<pid>/<iid>/<file>.jpg -> full-size form
STENCIL_RE = re.compile(r"/images/stencil/[^/]+/products/")


def parse_cards(body: str) -> list[dict]:
    out = []
    for m in CARD_RE.finditer(body):
        block = m.group(1)
        t = TITLE_RE.search(block)
        h = HREF_RE.search(block)
        i = IMG_RE.search(block)
        if not (t and h):
            continue
        title = htmllib.unescape(re.sub(r"<[^>]+>", "", t.group(1))).strip()
        a = ALT_RE.search(block)
        sku = SKU_RE.search(title)
        img = i.group(1) if i else ""
        out.append({
            "title": title,
            "url": h.group(1),
            "sku": sku.group(1) if sku else "",
            "image_url": full_size(img),
            "alt": htmllib.unescape(a.group(1)).strip() if a else "",
        })
    return out


def full_size(thumb_url: str) -> str:
    """Rewrite a stencil thumbnail URL to the 1280px original.

    We fetch 1280 and resize locally rather than asking the CDN for 800: the
    CDN's resize does not top-crop, and the top crop is what preserves the face
    (CLAUDE.md §5).
    """
    if not thumb_url:
        return ""
    url = STENCIL_RE.sub("/images/stencil/1280x1280/products/", thumb_url)
    return url.split("?")[0] + "?c=1&imbypass=on"


# --------------------------------------------------------------------------- #
# Routing. A product is not always a saint.
# --------------------------------------------------------------------------- #
CHRIST_HINTS = [
    "jesus", "christ pantocrator", "pantocrator", "our lord", "i am the",
    "good shepherd", "walking on the water", "the vine", "not made by hands",
    "extreme humility", "bridegroom", "ancient of days", "holy napkin",
]
THEOTOKOS_HINTS = [
    "theotokos", "virgin mary", "mother of god", "panagia", "our lady",
    "madonna", "hodegetria", "eleousa", "glykophilousa", "vladimir",
]
ANGEL_HINTS = [
    "archangel", "guardian angel", "seraphim of the", "cherub", "angel of",
    "holy angels", "michael the archangel", "gabriel the archangel",
]
FEAST_HINTS = [
    "nativity", "resurrection", "crucifixion", "annunciation", "transfiguration",
    "ascension", "pentecost", "dormition", "presentation", "baptism of",
    "entry into", "visitation", "harrowing", "last supper", "mystical supper",
    "deasis", "deesis", "holy trinity", "hospitality of abraham",
]


def classify(title: str, sku: str) -> str:
    """Which database this product belongs to: saint | host | feast | skip."""
    t = fold(title)
    if any(k in t for k in NOT_GLORIFIED):
        return "skip-not-glorified"
    if any(k in t for k in NON_ICON):
        return "skip-not-an-icon"
    # Angels first: "Archangel Michael" would otherwise name-match a saint.
    if any(k in t for k in ANGEL_HINTS):
        return "host"
    if any(k in t for k in THEOTOKOS_HINTS):
        return "theotokos"
    if any(k in t for k in CHRIST_HINTS):
        return "christ"
    if any(k in t for k in FEAST_HINTS):
        return "feast"
    # An F-prefixed SKU is the vendor's own mark for a feast or scene rather
    # than a portrait. Trust it only as a fallback — some F items are saints.
    if sku.startswith("F"):
        return "feast"
    return "saint"


# --------------------------------------------------------------------------- #
# Our records
# --------------------------------------------------------------------------- #
def load_rows(fname: str) -> list[dict]:
    with (DATA / fname).open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def load_rejects() -> set[str]:
    """Product URLs a human has rejected. Empty if the file is absent."""
    if not REJECTS.exists():
        return set()
    return {ln.strip() for ln in REJECTS.read_text(encoding="utf-8").splitlines()
            if ln.strip() and not ln.lstrip().startswith("#")}


def build_pool(rows: list[dict], id_col: str, name_col: str,
               aka_col: str) -> list[tuple[str, str, set[str], set[str]]]:
    """(id, name, name_tokens, name+aka_tokens) for every record."""
    pool = []
    for r in rows:
        rid = (r.get(id_col) or "").strip()
        name = (r.get(name_col) or "").strip()
        if not rid or not name:
            continue
        ntok = tokens(name)
        full = ntok | tokens(r.get(aka_col) or "")
        pool.append((rid, name, ntok, full))
    return pool


def existing_images() -> dict[str, str]:
    """id -> image_path, across all three hero-portrait joins."""
    out: dict[str, str] = {}
    for fname, key in (("saint_images.csv", "saint_id"),
                       ("host_images.csv", "host_id"),
                       ("feast_images.csv", "feast_id")):
        p = DATA / fname
        if not p.exists():
            continue
        with p.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                rid = (r.get(key) or "").strip()
                if rid:
                    out[rid] = (r.get("image_path") or "").strip()
    return out


# --------------------------------------------------------------------------- #
# Matching
# --------------------------------------------------------------------------- #
REVIEW_HEADER = [
    "decision", "confidence", "db", "target_id", "target_name", "score",
    "margin", "alt1_id", "alt1_name", "alt1_score", "alt2_id", "alt2_name",
    "alt2_score", "has_existing_image", "product_title", "sku", "product_url",
    "image_url", "alt_text",
]

# Thresholds. Deliberately conservative: a false accept costs a wrong saint's
# face on a page, a false `ambiguous` costs a reviewer ten seconds.
STRONG = 0.72
WEAK = 0.42
MARGIN = 0.15


def match(product: dict, pool: list) -> dict:
    ptok = tokens(TITLE_NOISE.sub("", product["title"]))
    if not ptok:
        return {"confidence": "no-match", "cands": []}
    scored = sorted(
        ((score(ptok, ntok, full), rid, name) for rid, name, ntok, full in pool),
        key=lambda x: (-x[0], x[1]),
    )[:3]
    if not scored or scored[0][0] < WEAK:
        return {"confidence": "no-match", "cands": scored}
    best = scored[0][0]
    runner = scored[1][0] if len(scored) > 1 else 0.0
    margin = best - runner
    if best >= STRONG and margin >= MARGIN:
        conf = "strong"
    elif margin < MARGIN:
        conf = "ambiguous"
    else:
        conf = "weak"
    return {"confidence": conf, "cands": scored, "margin": margin}


# --------------------------------------------------------------------------- #
# Harvest
# --------------------------------------------------------------------------- #
def harvest(delay: float, force: bool, no_fetch: bool, limit: int) -> int:
    products: list[dict] = []
    seen_urls: set[str] = set()
    for cat in CATEGORIES:
        slug = cat.strip("/").replace("/", "-")
        for page in range(1, MAX_PAGES + 1):
            url = f"{BASE}{cat}?limit={PER_PAGE}&page={page}"
            name = f"{slug}-p{page}.html"
            if no_fetch and not (CACHE / name).exists():
                break
            body = fetch(url, name, delay, force)
            if body is None:
                print(f"  giving up on {cat} at page {page}", file=sys.stderr)
                break
            cards = parse_cards(body)
            fresh = [c for c in cards if c["url"] not in seen_urls]
            for c in fresh:
                seen_urls.add(c["url"])
            products.extend(fresh)
            print(f"  {cat} p{page}: {len(cards)} cards ({len(fresh)} new)")
            if len(cards) < PER_PAGE:
                break
            if limit and len(products) >= limit:
                break
        if limit and len(products) >= limit:
            break
    if limit:
        products = products[:limit]
    if not products:
        print("No products parsed. If this is a fresh run, check the fetch "
              "output above; if --no-fetch, the cache is empty.", file=sys.stderr)
        return 1

    saints = build_pool(load_rows("saints.csv"), "Saint ID", "Name",
                        "Also Known As")
    hosts = build_pool(load_rows("heavenly_hosts.csv"), "Host ID", "Name",
                       "Also Known As")
    feasts = build_pool(load_rows("feasts.csv"), "Feast ID", "Name",
                        "Also Known As")
    pools = {"saint": saints, "host": hosts, "feast": feasts}
    have = existing_images()
    rejects = load_rejects()

    rows, tally = [], {}
    for p in products:
        route = classify(p["title"], p["sku"])
        tally[route] = tally.get(route, 0) + 1
        row = {k: "" for k in REVIEW_HEADER}
        row.update({
            "db": route, "product_title": p["title"], "sku": p["sku"],
            "product_url": p["url"], "image_url": p["image_url"],
            "alt_text": p["alt"],
        })
        if p["url"] in rejects:
            # Examined by a human and thrown out. Clear the guess as well as
            # skipping it — leaving the wrong target_id in place invites
            # someone to "fix" the decision without re-checking the match.
            row["decision"] = "skip"
            row["confidence"] = "rejected"
        elif route.startswith("skip-"):
            row["decision"] = "skip"
            row["confidence"] = route
        elif route in ("christ", "theotokos"):
            # Fixed ids, no matching needed — but still human-confirmed, since
            # which Christ or Theotokos icon earns the hero is an editorial call.
            row["target_id"] = "OS-0000" if route == "christ" else "OS-0001"
            row["target_name"] = ("Our Lord Jesus Christ" if route == "christ"
                                  else "The Most Holy Theotokos")
            row["confidence"] = "routed"
            row["has_existing_image"] = "yes" if row["target_id"] in have else ""
        else:
            m = match(p, pools[route])
            row["confidence"] = m["confidence"]
            cands = m["cands"]
            # On a no-match, leave target_id EMPTY. Naming the best of a bad
            # field is how a 0.00 scoring accident ends up looking like a
            # proposal — "21 New Martyrs of Libya" (Coptic, and out of scope
            # per §1) scored 0.00 against Jesus Christ and was printed as the
            # answer. The alternates still ride along as hints.
            if cands and m["confidence"] != "no-match":
                row["target_id"] = cands[0][1]
                row["target_name"] = cands[0][2]
                row["has_existing_image"] = "yes" if cands[0][1] in have else ""
            if cands:
                row["score"] = f"{cands[0][0]:.2f}"
                row["margin"] = f"{m.get('margin', 0.0):.2f}"
                for n, c in enumerate(cands[1:3], start=1):
                    row[f"alt{n}_score"] = f"{c[0]:.2f}"
                    row[f"alt{n}_id"] = c[1]
                    row[f"alt{n}_name"] = c[2]
        rows.append(row)

    order = {"strong": 0, "routed": 1, "weak": 2, "ambiguous": 3,
             "no-match": 4}
    rows.sort(key=lambda r: (order.get(r["confidence"], 5),
                             -float(r["score"] or 0)))

    DIST.mkdir(parents=True, exist_ok=True)
    with REVIEW.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=REVIEW_HEADER)
        w.writeheader()
        w.writerows(rows)

    conf_tally: dict[str, int] = {}
    for r in rows:
        conf_tally[r["confidence"]] = conf_tally.get(r["confidence"], 0) + 1
    print(f"\n{len(rows)} products -> {REVIEW.relative_to(ROOT)}")
    print("  routing:   " + ", ".join(f"{k}={v}" for k, v in sorted(tally.items())))
    print("  confidence:" + ", ".join(f" {k}={v}" for k, v in sorted(conf_tally.items())))
    print("\nNext: open the review CSV, set `decision` to accept (hero) / card "
          "(carousel) / skip,\ncorrect `target_id` where the match is wrong, "
          "then re-run with --download.")
    return 0


# --------------------------------------------------------------------------- #
# Download (only what a human accepted)
# --------------------------------------------------------------------------- #
def _resize_node(raw: bytes, dest: Path, thumb: Path) -> bool:
    """Trim the product staging, then fit into 800x800 — via node+sharp, the
    documented path where Pillow is absent (CLAUDE.md §5b).

    Two deliberate differences from scripts/download_saint_icons.py, both
    specific to this vendor's photography:

    * TRIM FIRST. Legacy Icons photographs the mounted plaque on a white sweep
      with a drop shadow. Trimming that staging is what makes the icon fill the
      hero frame instead of floating in a white box. The trim stops at the
      plaque's own red edge, so it removes only the photograph's background —
      NOT the icon, and NOT the "LEGACY ICONS" watermark, which stays fully
      intact. Removing their mark from an image used under a revocable courtesy
      would be indefensible; removing the white around it is just cropping.
      If the trim would eat more than half the area, it is treated as a
      misfire and the untrimmed image is kept.

    * FIT INSIDE 800x800 rather than scaling width and TOP-CROPPING height. The
      top crop exists for photographs, where the face sits near the top and the
      bottom is background. These are whole icon panels: a trimmed plaque runs
      about 4:5, so a width-scale-then-crop would cut the bottom fifth off
      every one — Mary of Egypt loses her blessing hand. Fitting inside the box
      honours the same <=800px ceiling with nothing cut off, and matches what
      the shipped Theophany files actually are (OS-0012 is 432x648).
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    thumb.parent.mkdir(parents=True, exist_ok=True)
    src = dest.with_suffix(".orig.tmp")
    src.write_bytes(raw)
    js = r"""
const sharp = require('sharp');
// slice(-8), not slice(2): `node -e` puts no script path in argv[1], so a
// fixed offset silently drops `src` and sharp then reports the DEST missing.
const [src, dest, thumb, MAX, TW, TH, Q, TRIM] = process.argv.slice(-8);
const q = Number(Q);
(async () => {
  let buf = await sharp(src).rotate().toBuffer();
  const m0 = await sharp(buf).metadata();
  if (TRIM === '1') {
    try {
      const t = await sharp(buf).trim({ threshold: 12 }).toBuffer();
      const m1 = await sharp(t).metadata();
      // Sanity gate: catch a trim that locked onto a small detail (the
      // watermark, an inscription) rather than the backdrop. The first cut of
      // this demanded the result keep >=50% of the AREA, which was wrong: a
      // narrow icon panel legitimately fills only ~45% of a square 1280x1280
      // product frame, so it rejected three good trims in the first batch of
      // 40 (Cyrus & John, Jude, Philip of Moscow) and shipped them with the
      // white sweep still on. Judge by absolute size instead — a real panel is
      // never a couple of hundred pixels across.
      if (m1.width >= 200 && m1.height >= 200 &&
          m1.width * m1.height >= 0.15 * m0.width * m0.height) buf = t;
      else console.error(`  trim rejected (${m1.width}x${m1.height} is too small to be the panel)`);
    } catch (e) { console.error('  trim skipped: ' + e.message); }
  }
  await sharp(buf)
      .resize({ width: Number(MAX), height: Number(MAX), fit: 'inside',
                withoutEnlargement: true })
      .jpeg({ quality: q, mozjpeg: true }).toFile(dest);
  await sharp(dest)
      .resize({ width: Number(TW), height: Number(TH), fit: 'inside',
                withoutEnlargement: true })
      .jpeg({ quality: q }).toFile(thumb);
})().catch(e => { console.error(String(e)); process.exit(1); });
"""
    try:
        r = subprocess.run(
            ["node", "-e", js, "--", str(src), str(dest), str(thumb),
             str(MAX_DIM), str(THUMB_WIDTH), str(THUMB_MAX_HEIGHT),
             str(JPEG_QUALITY), "1" if TRIM_STAGING else "0"],
            capture_output=True, text=True, timeout=120, cwd=str(ROOT),
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f"  resize failed ({e}) — is node installed?", file=sys.stderr)
        return False
    finally:
        src.unlink(missing_ok=True)
    if r.returncode != 0:
        print(f"  resize failed: {r.stderr.strip()[:200]}", file=sys.stderr)
        return False
    return True


def _fit(img, box_w: int, box_h: int):
    """Scale to fit inside the box, never enlarging. See _resize_node for why
    this replaces the usual scale-width-then-top-crop for this vendor."""
    scale = min(box_w / img.width, box_h / img.height, 1.0)
    if scale >= 1.0:
        return img
    from PIL import Image                          # noqa: PLC0415
    return img.resize((max(1, round(img.width * scale)),
                       max(1, round(img.height * scale))), Image.LANCZOS)


def resize(raw: bytes, dest: Path) -> bool:
    thumb = (THUMBS / dest.relative_to(ICONS).parent / dest.name).with_suffix(".jpg")
    try:
        from PIL import Image, ImageChops, ImageOps   # noqa: PLC0415
        from io import BytesIO                        # noqa: PLC0415
    except ImportError:
        return _resize_node(raw, dest, thumb)
    try:
        img = ImageOps.exif_transpose(Image.open(BytesIO(raw)))
        if img.mode != "RGB":
            img = img.convert("RGB")
        if TRIM_STAGING:
            # Same trim as the node path: difference against the corner colour
            # (the white sweep), bounded, with the same absolute-size gate.
            bg = Image.new("RGB", img.size, img.getpixel((0, 0)))
            diff = ImageChops.add(ImageChops.difference(img, bg),
                                  Image.new("RGB", img.size, (0, 0, 0)))
            bbox = diff.point(lambda p: 255 if p > 12 else 0).convert("L").getbbox()
            if bbox:
                bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
                if (bw >= 200 and bh >= 200
                        and bw * bh >= 0.15 * img.width * img.height):
                    img = img.crop(bbox)
                else:
                    print(f"  trim rejected ({bw}x{bh} is too small to be "
                          "the panel)", file=sys.stderr)
        dest.parent.mkdir(parents=True, exist_ok=True)
        _fit(img, MAX_DIM, MAX_DIM).save(dest, "JPEG", quality=JPEG_QUALITY,
                                         optimize=True)
        thumb.parent.mkdir(parents=True, exist_ok=True)
        _fit(Image.open(dest), THUMB_WIDTH, THUMB_MAX_HEIGHT).save(
            thumb, "JPEG", quality=JPEG_QUALITY, optimize=True)
        return True
    except Exception as e:                        # noqa: BLE001
        print(f"  resize failed for {dest.name}: {e}", file=sys.stderr)
        return False


def slugify(s: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", fold(s))).strip("-")


def download(delay: float) -> int:
    if not REVIEW.exists():
        sys.exit(f"FATAL: {REVIEW} not found — run the harvest stage first.")
    with REVIEW.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    todo = [r for r in rows
            if (r.get("decision") or "").strip().lower() in ("accept", "card")]
    if not todo:
        print("Nothing marked accept/card in the review CSV. Nothing to do.")
        return 0
    print(f"{len(todo)} accepted row(s).")
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    proposed, failed = [], 0
    used: set[str] = set()
    for r in todo:
        rid = (r.get("target_id") or "").strip()
        url = (r.get("image_url") or "").strip()
        if not rid or not url:
            print(f"  SKIP (no id/url): {r.get('product_title')}", file=sys.stderr)
            failed += 1
            continue
        stem = rid if r["decision"].strip().lower() == "accept" else \
            f"{rid}-{slugify(TITLE_NOISE.sub('', r['product_title']))[:40]}"
        dest = DEST_DIR / f"{stem}.jpg"
        if dest.name in used:
            dest = DEST_DIR / f"{stem}-{r.get('sku','x').lower()}.jpg"
        used.add(dest.name)
        if dest.exists():
            print(f"  have {dest.name}")
        else:
            cache_name = f"img-{stem}.bin"
            body = fetch_binary(url, cache_name, delay)
            if body is None or not resize(body, dest):
                failed += 1
                continue
            print(f"  wrote {dest.relative_to(ROOT)}")
        rel = dest.relative_to(ICONS.parent).as_posix()
        proposed.append({
            "kind": r["decision"].strip().lower(),
            "db": r.get("db", ""),
            "id": rid,
            "image_path": rel,
            "license": f"Permission:{VENDOR_SLUG}",
            "credit": "",
            "source": r.get("product_url", ""),
            "title": TITLE_NOISE.sub("", r.get("product_title", "")).strip(),
        })
    out = DIST / "legacy_icons_rows.csv"
    with out.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(proposed[0].keys()) if proposed
                           else ["kind", "db", "id", "image_path", "license",
                                 "credit", "source", "title"])
        w.writeheader()
        w.writerows(proposed)
    print(f"\n{len(proposed)} image(s) ready; {failed} failed.")
    print(f"Proposed CSV rows -> {out.relative_to(ROOT)}")
    print("These are PROPOSALS. Paste them into data/saint_images.csv "
          "(kind=accept),\ndata/saint_depictions.csv (kind=card), or the "
          "host/feast siblings, then run\n`python3 build.py --check-only`. "
          "Mind the CRLF line endings (CLAUDE.md §7).")
    return 0 if not failed else 1


def fetch_binary(url: str, cache_name: str, delay: float) -> bytes | None:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / cache_name
    if path.exists():
        return path.read_bytes()
    print(f"  fetch {url}", flush=True)
    time.sleep(delay)
    try:
        r = subprocess.run(
            ["curl", "-sS", "--compressed", "--max-time", "90", "-A", UA,
             "-w", "%{http_code}", "-o", str(path), url],
            capture_output=True, text=True, timeout=120,
        )
    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT {url}", file=sys.stderr)
        path.unlink(missing_ok=True)
        return None
    if r.stdout.strip() != "200":
        print(f"  HTTP {r.stdout.strip() or '???'} {url}", file=sys.stderr)
        path.unlink(missing_ok=True)
        return None
    return path.read_bytes()


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--delay", type=float, default=10.0,
                    help="seconds between requests (default 10.0 — DO NOT LOWER; "
                         "their robots.txt asks for 10)")
    ap.add_argument("--limit", type=int, default=0, metavar="N",
                    help="stop after N products (start with --limit 20)")
    ap.add_argument("--no-fetch", action="store_true",
                    help="re-parse and re-match the cache without fetching")
    ap.add_argument("--force", action="store_true",
                    help="re-fetch category pages even when cached")
    ap.add_argument("--download", action="store_true",
                    help="download images for rows a human marked accept/card")
    args = ap.parse_args()
    if args.delay < 10.0 and not args.no_fetch:
        print(f"NOTE: delay {args.delay}s is below the 10s their robots.txt "
              "asks of crawlers.", file=sys.stderr)
    if args.download:
        return download(args.delay)
    return harvest(args.delay, args.force, args.no_fetch, args.limit)


if __name__ == "__main__":
    sys.exit(main())
