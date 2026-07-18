#!/usr/bin/env python3
"""Generate avatar thumbnails for the self-hosted saint portraits.

Every raster image under static/icons/ (except thumbs/ itself) gets a small
companion at static/icons/thumbs/<same relative path>.jpg: width <= 200 px,
height top-cropped to <= 250 px (the SaintAvatar arch is 120x150, and the
largest small-avatar rendering is 92 px wide, so 200 px stays crisp at 2x
DPR while dropping ~100 KB originals to ~10 KB). build.py emits `imageThumb`
for a portrait only when its thumb file exists, and the finder/quiz/card
avatars use it; the detail-page hero keeps the original.

Run after adding or replacing icons manually:

    pip install Pillow   # authoring-only dep, not in requirements.txt
    python scripts/make_icon_thumbs.py           # skips up-to-date thumbs
    python scripts/make_icon_thumbs.py --force   # regenerate everything

(The Wikimedia download pipeline calls make_thumb() itself as it saves each
icon — see save_resized() in scripts/download_saint_icons.py.)
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from PIL import Image, ImageOps

THUMB_WIDTH = 200
THUMB_MAX_HEIGHT = 250
JPEG_QUALITY = 80
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

ROOT = Path(__file__).resolve().parents[1]
ICONS_DIR = ROOT / "static" / "icons"
THUMBS_DIR = ICONS_DIR / "thumbs"

log = logging.getLogger("make_icon_thumbs")


def thumb_dest(src: Path) -> Path:
    """static/icons/<rel> -> static/icons/thumbs/<rel>.jpg (always JPEG)."""
    return (THUMBS_DIR / src.relative_to(ICONS_DIR).parent / src.name).with_suffix(
        ".jpg"
    )


def make_thumb(src: Path, dest: Path) -> bool:
    """Write the <=200x250 top-cropped JPEG thumb for one portrait."""
    try:
        img = Image.open(src)
        # Honour the EXIF orientation, so a manually-dropped-in portrait that
        # still carries one yields an upright thumb rather than a sideways one.
        img = ImageOps.exif_transpose(img)
        if img.mode != "RGB":
            img = img.convert("RGB")
        w, h = img.size
        if w > THUMB_WIDTH:
            img = img.resize(
                (THUMB_WIDTH, round(h * THUMB_WIDTH / w)), Image.LANCZOS
            )
        if img.height > THUMB_MAX_HEIGHT:
            # Top crop, same as the ingest resize: keeps the face.
            img = img.crop((0, 0, img.width, THUMB_MAX_HEIGHT))
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True)
        return True
    except Exception as e:  # noqa: BLE001 — one bad file must not stop the batch
        log.warning("thumb failed for %s: %s", src.name, e)
        return False


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--force", action="store_true", help="regenerate even up-to-date thumbs"
    )
    args = ap.parse_args()

    if not ICONS_DIR.is_dir():
        log.error("no %s directory", ICONS_DIR)
        return 1

    made = skipped = failed = 0
    for src in sorted(ICONS_DIR.rglob("*")):
        if not src.is_file() or src.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        if THUMBS_DIR in src.parents:
            continue
        dest = thumb_dest(src)
        if (
            not args.force
            and dest.exists()
            and dest.stat().st_mtime >= src.stat().st_mtime
        ):
            skipped += 1
            continue
        if make_thumb(src, dest):
            made += 1
        else:
            failed += 1

    log.info("thumbs: %d written, %d up to date, %d failed", made, skipped, failed)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
