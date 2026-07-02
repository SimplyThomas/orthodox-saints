#!/usr/bin/env python3
"""
Download Orthodox saint icons from Wikimedia Commons.

For each saint in dist/saint_image_worklist.csv this:
  1. Searches Commons (full-text, File namespace) for "<name> Orthodox icon"
     (with progressively simpler fallback queries to raise the hit rate).
  2. Pulls up to N candidates with imageinfo + extmetadata in a single call.
  3. Keeps only candidates under a reusable license (PD / CC0 / CC-BY / CC-BY-SA;
     non-commercial and no-derivatives variants are rejected).
  4. Downloads the best candidate to static/icons/<saint_id>.jpg, resized to
     <=800px (scale width, then top-crop height) at JPEG quality 80.
  5. Writes image metadata back into the worklist CSV and emits image_review.csv.

It never overwrites an icon whose row is already marked image_status=approved,
and by default skips any saint that already has a downloaded file (idempotent
re-runs). Pass --force to re-fetch.

Two things the earlier version got wrong, now fixed:
  * Wikimedia requires a descriptive User-Agent with contact info, or it 403s
    the API and the upload.wikimedia.org CDN.
  * File search must use list/generator=search with srnamespace=6 (full-text),
    NOT opensearch (title-prefix only) — the latter returns nothing for icons.
"""

import argparse
import csv
import html
import logging
import os
import re
import sys
import time
import unicodedata
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Optional, Set

import requests
from PIL import Image

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #
ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "dist" / "saint_image_worklist.csv"
REVIEW_CSV_PATH = ROOT / "dist" / "image_review.csv"
APPROVED_CSV_PATH = ROOT / "data" / "saint_images.csv"  # human-approved icons (source of truth)
ICONS_DIR = ROOT / "static" / "icons"

# Only download web-friendly raster formats (skip tiff/djvu/pdf/svg book-scans).
ACCEPTED_MIME = ("image/jpeg", "image/png", "image/gif", "image/webp")

# Words to ignore when deriving a saint's distinctive name tokens.
STOPWORDS = {
    "st", "st.", "saint", "the", "of", "a", "an", "and", "to", "for", "most",
    "holy", "great", "new", "elder", "venerable", "righteous", "blessed",
    "prophet", "prophetess", "apostle", "apostles", "evangelist", "martyr",
    "hieromartyr", "protomartyr", "first", "firstmartyr", "hierarch",
    "wonderworker", "equal", "equaltotheapostles", "princess", "prince",
    "queen", "king", "woman", "women", "among", "samaritan", "myrrhbearer",
    "passionbearer", "unmercenary", "confessor", "stylite", "theologian",
    "archbishop", "bishop", "patriarch", "deacon", "archdeacon", "monk",
    "nun", "abbot", "abbess", "fool", "christ", "god", "our", "lady", "mother",
    "jesus",  # generic: e.g. Joshua "Jesus son of Nave" must match on Joshua/Nave
}

COMMONS_API = "https://commons.wikimedia.org/w/api.php"

# Wikimedia User-Agent policy: identify the tool + a contact URL/email.
# Without this the API throttles and the CDN returns HTTP 403.
USER_AGENT = (
    "CloudOfWitnesses-IconBot/1.0 "
    "(https://orthodoxsaintfinder.com; thomas.m.krug@gmail.com) python-requests"
)

MAX_CANDIDATES = 5
MAX_DIM = 800            # px: cap width, then top-crop height
JPEG_QUALITY = 80
MIN_ACCEPT_WIDTH = 220   # ignore thumbnails/sigils too small to be a real icon
REQUEST_PAUSE = 0.1      # politeness delay between saints (seconds)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("icons")


# --------------------------------------------------------------------------- #
# License rules
# --------------------------------------------------------------------------- #
def license_acceptable(code: str) -> bool:
    """True for reusable licenses: PD*, CC0, CC-BY*, CC-BY-SA* — but never NC/ND."""
    if not code:
        return False
    c = code.strip().lower().replace(" ", "-")
    if "nc" in c.split("-") or "nd" in c.split("-"):  # non-commercial / no-derivatives
        return False
    if c.startswith("pd") or c.startswith("public-domain"):
        return True
    if c.startswith("cc0") or c == "cc-zero":
        return True
    if c.startswith("cc-by"):  # covers cc-by and cc-by-sa (NC/ND already excluded)
        return True
    return False


_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def clean_text(value: str) -> str:
    """Strip HTML tags/entities that Commons puts in Artist/Attribution fields."""
    if not value:
        return ""
    text = _TAG_RE.sub(" ", value)
    text = html.unescape(text)
    return _WS_RE.sub(" ", text).strip()


def normalize(text: str) -> str:
    """Fold transliteration variants so 'Photini'~'Fotini', 'Symeon'~'Simeon'."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = text.replace("ph", "f").replace("y", "i")  # Photini->fotini, Symeon->simeon
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    return _WS_RE.sub(" ", text).strip()


def name_tokens(name: str, also_known_as: str) -> Set[str]:
    """Distinctive, normalized name tokens drawn from Name + Also Known As."""
    pieces = [re.sub(r"\([^)]*\)", " ", name)]
    pieces += (also_known_as or "").split(";")
    tokens: Set[str] = set()
    for piece in pieces:
        for word in normalize(piece).split():
            if len(word) >= 4 and word not in STOPWORDS:
                tokens.add(word)
    return tokens


def title_matches(title: str, tokens: Set[str]) -> bool:
    """True if any distinctive name token appears as a whole word in the title."""
    norm = normalize(title)
    return any(re.search(rf"\b{re.escape(t)}\b", norm) for t in tokens)


# --------------------------------------------------------------------------- #
# Wikimedia client
# --------------------------------------------------------------------------- #
class Commons:
    def __init__(self):
        self.s = requests.Session()
        self.s.headers.update({"User-Agent": USER_AGENT})
        self._login()

    def _login(self):
        user = os.getenv("WIKIMEDIA_BOT_USER")
        pw = os.getenv("WIKIMEDIA_BOT_PASSWORD")
        if not user or not pw:
            log.info("No bot credentials; using anonymous access (works, lower rate limit).")
            return
        try:
            tok = self.s.get(COMMONS_API, params={
                "action": "query", "meta": "tokens", "type": "login", "format": "json",
            }, timeout=20).json()["query"]["tokens"]["logintoken"]
            res = self.s.post(COMMONS_API, data={
                "action": "login", "lgname": user, "lgpassword": pw,
                "lgtoken": tok, "format": "json",
            }, timeout=20).json()
            if res.get("login", {}).get("result") == "Success":
                log.info("Authenticated to Commons as %s", user)
            else:
                log.warning("Bot login failed (%s); continuing anonymously.",
                            res.get("login", {}).get("result"))
        except Exception as e:  # noqa: BLE001
            log.warning("Bot login error (%s); continuing anonymously.", e)

    def search_candidates(self, query: str, limit: int = MAX_CANDIDATES) -> List[Dict]:
        """Full-text File-namespace search + imageinfo/extmetadata in one request."""
        try:
            r = self.s.get(COMMONS_API, params={
                "action": "query",
                "generator": "search",
                "gsrsearch": query,
                "gsrnamespace": "6",          # File namespace
                "gsrlimit": limit,
                "prop": "imageinfo",
                "iiprop": "url|size|mime|extmetadata|user",
                "format": "json",
            }, timeout=25)
            r.raise_for_status()
            pages = r.json().get("query", {}).get("pages", {})
        except Exception as e:  # noqa: BLE001
            log.debug("search failed for %r: %s", query, e)
            return []

        out = []
        # Preserve search rank order
        for page in sorted(pages.values(), key=lambda p: p.get("index", 1e9)):
            ii = (page.get("imageinfo") or [{}])[0]
            if not ii.get("url"):
                continue
            meta = ii.get("extmetadata", {})

            def mv(key):
                v = meta.get(key, {})
                return v.get("value", "") if isinstance(v, dict) else str(v or "")

            license_code = mv("License") or mv("LicenseShortName")
            copyrighted = mv("Copyrighted").lower()
            if not license_code and copyrighted in ("false", "0"):
                license_code = "pd"

            artist = clean_text(mv("Artist")) or clean_text(ii.get("user", ""))
            attribution = clean_text(mv("Attribution"))
            credit = clean_text(mv("Credit"))

            out.append({
                "title": page.get("title", ""),
                "url": ii["url"],
                "descriptionurl": ii.get("descriptionurl", ""),
                "width": ii.get("width", 0),
                "height": ii.get("height", 0),
                "mime": ii.get("mime", ""),
                "license": (license_code or "").strip(),
                "license_short": clean_text(mv("LicenseShortName")),
                "artist": artist,
                "attribution": attribution or artist or credit,
            })
        return out

    def download(self, url: str) -> bytes:
        r = self.s.get(url, timeout=40)
        r.raise_for_status()
        return r.content


# --------------------------------------------------------------------------- #
# Query construction
# --------------------------------------------------------------------------- #
_RANK_PREFIXES = [
    "most holy", "the holy", "holy", "great martyr", "new hieromartyr",
    "new martyr", "hieromartyr", "venerable martyr", "venerable", "righteous",
    "blessed", "prophet", "apostles", "apostle", "evangelist", "martyr",
    "hierarch", "st.", "st", "saint", "equal-to-the-apostles", "first-martyr",
    "archdeacon", "great-martyr", "wonderworker", "unmercenary", "passion-bearer",
]


def query_variants(name: str) -> List[str]:
    """Primary 'Orthodox icon' query plus simpler fallbacks to raise hit rate."""
    name = name.strip()
    # drop parentheticals e.g. "(Virgin Mary)"
    bare = re.sub(r"\([^)]*\)", "", name).strip(" ,")
    # take the part before the first comma ("Photini, the Samaritan Woman" -> "Photini")
    core = bare.split(",")[0].strip()
    # strip leading rank/honorific words for a tighter core query
    lowered = core.lower()
    changed = True
    while changed:
        changed = False
        for pre in _RANK_PREFIXES:
            if lowered.startswith(pre + " "):
                core = core[len(pre):].strip()
                lowered = core.lower()
                changed = True
    variants = [
        f"{name} Orthodox icon",
        f"{bare} icon",
        f"{core} icon" if core else "",
    ]
    seen, result = set(), []
    for v in variants:
        v = v.strip()
        if v and v.lower() not in seen:
            seen.add(v.lower())
            result.append(v)
    return result


def pick_best(candidates: List[Dict], tokens: Set[str]) -> Optional[Dict]:
    """Best candidate: reusable license, raster image, names the saint, large enough.

    The title must contain a distinctive name token — this rejects the false
    positives the loose fallback queries attract (street signs, an artist who
    merely shares the saint's given name, unrelated book scans).
    """
    usable = [
        c for c in candidates
        if license_acceptable(c["license"])
        and c.get("mime", "") in ACCEPTED_MIME
        and c.get("width", 0) >= MIN_ACCEPT_WIDTH
        and (not tokens or title_matches(c["title"], tokens))
    ]
    if not usable:
        return None

    def score(c):
        norm = normalize(c["title"])
        # How many distinct name tokens (incl. epithets like "Syrian"/"Moscow")
        # the title matches — disambiguates e.g. "Isaac the Syrian" from
        # the OT "Sacrifice of Isaac", or "Tikhon of Moscow" from "of Voronezh".
        matched = sum(1 for t in tokens if re.search(rf"\b{re.escape(t)}\b", norm))
        title = c["title"].lower()
        return (matched, "icon" in title, "saint" in title or "st " in title, c.get("width", 0))

    usable.sort(key=score, reverse=True)
    return usable[0]


# --------------------------------------------------------------------------- #
# Image processing
# --------------------------------------------------------------------------- #
def save_resized(raw: bytes, dest: Path) -> bool:
    try:
        img = Image.open(BytesIO(raw))
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")
        w, h = img.size
        if w > MAX_DIM:
            img = img.resize((MAX_DIM, round(h * MAX_DIM / w)), Image.LANCZOS)
        if img.height > MAX_DIM:
            img = img.crop((0, 0, img.width, MAX_DIM))
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True)
        _save_thumb(dest)
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("resize/save failed for %s: %s", dest.name, e)
        return False


def _save_thumb(dest: Path) -> None:
    """Companion <=200px avatar thumb (static/icons/thumbs/<rel>.jpg).
    build.py emits `imageThumb` only when the thumb file exists, so a failure
    here degrades to the full-size portrait, never a broken image."""
    try:
        from make_icon_thumbs import ICONS_DIR, make_thumb, thumb_dest

        if ICONS_DIR in dest.parents:
            make_thumb(dest, thumb_dest(dest))
    except Exception as e:  # noqa: BLE001
        log.warning("thumb failed for %s: %s", dest.name, e)


# --------------------------------------------------------------------------- #
# CSV helpers
# --------------------------------------------------------------------------- #
EXTRA_COLS = ["image_source_url", "image_status"]


def load_approved_ids() -> Set[str]:
    """Saint IDs that already have a human-curated icon (data/saint_images.csv)."""
    if not APPROVED_CSV_PATH.exists():
        return set()
    with open(APPROVED_CSV_PATH, newline="", encoding="utf-8") as f:
        return {r["saint_id"].strip() for r in csv.DictReader(f) if r.get("saint_id")}


def load_rows():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fields = list(reader.fieldnames or [])
    for col in EXTRA_COLS:
        if col not in fields:
            fields.append(col)
    for row in rows:
        for col in EXTRA_COLS:
            row.setdefault(col, "")
    return rows, fields


def save_rows(rows, fields):
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def write_review(rows):
    review = [r for r in rows if r.get("image_status") == "needs_review"]
    cols = ["saint_id", "name", "local_image", "image_source_url",
            "license", "credit", "review_notes"]
    with open(REVIEW_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in review:
            w.writerow({
                "saint_id": r["saint_id"],
                "name": r["name"],
                "local_image": r.get("image_url", ""),
                "image_source_url": r.get("image_source_url", ""),
                "license": r.get("license", ""),
                "credit": r.get("credit", ""),
                "review_notes": "Auto-fetched from Wikimedia Commons. Verify the icon "
                                "depicts this saint, confirm license, and approve.",
            })
    return len(review)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="Download Orthodox saint icons from Wikimedia Commons.")
    ap.add_argument("--limit", type=int, default=0, help="process at most N saints (0 = all)")
    ap.add_argument("--start", type=int, default=0, help="skip the first N rows")
    ap.add_argument("--force", action="store_true", help="re-fetch even if a local file exists")
    args = ap.parse_args()

    if not CSV_PATH.exists():
        log.error("CSV not found: %s", CSV_PATH)
        sys.exit(1)

    rows, fields = load_rows()
    approved = load_approved_ids()
    log.info("Loaded %d saints; %d already have an approved icon.", len(rows), len(approved))

    commons = Commons()
    considered = downloaded = skipped = 0

    try:
        for idx, row in enumerate(rows):
            if idx < args.start:
                continue
            if args.limit and considered >= args.limit:
                break

            sid = row["saint_id"]
            name = row["name"]
            dest = ICONS_DIR / f"{sid}.jpg"

            # Never touch approved icons; skip already-downloaded unless --force.
            if sid in approved or row.get("image_status") == "approved":
                continue
            if dest.exists() and not args.force:
                skipped += 1
                continue

            considered += 1
            log.info("[%d/%d] %s  %s", idx + 1, len(rows), sid, name)

            tokens = name_tokens(name, row.get("also_known_as", ""))
            best = None
            for q in query_variants(name):
                cands = commons.search_candidates(q)
                best = pick_best(cands, tokens)
                if best:
                    log.info("   query %r -> %s  [%s]", q, best["title"], best["license"])
                    break

            if not best:
                log.info("   no acceptable-license icon found")
                time.sleep(REQUEST_PAUSE)
                continue

            try:
                raw = commons.download(best["url"])
            except Exception as e:  # noqa: BLE001
                log.warning("   download failed: %s", e)
                time.sleep(REQUEST_PAUSE)
                continue

            if not save_resized(raw, dest):
                time.sleep(REQUEST_PAUSE)
                continue

            row["image_url"] = f"./static/icons/{sid}.jpg"
            row["image_source_url"] = best["descriptionurl"] or best["url"]
            row["license"] = best["license"]
            row["credit"] = best["attribution"]
            row["image_status"] = "needs_review"
            downloaded += 1
            log.info("   saved %s", dest.relative_to(ROOT))
            time.sleep(REQUEST_PAUSE)

    except KeyboardInterrupt:
        log.warning("Interrupted — saving progress so far.")
    finally:
        save_rows(rows, fields)
        n_review = write_review(rows)

    have = sum(1 for r in rows if (ICONS_DIR / f"{r['saint_id']}.jpg").exists())
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Saints considered this run : {considered}")
    print(f"Newly downloaded           : {downloaded}")
    print(f"Skipped (already had file) : {skipped}")
    print(f"Total saints with an icon  : {have}/{len(rows)}")
    print(f"Updated worklist           : {CSV_PATH}")
    print(f"Review queue ({n_review:>4} rows)    : {REVIEW_CSV_PATH}")


if __name__ == "__main__":
    main()
