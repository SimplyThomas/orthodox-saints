#!/usr/bin/env python3
"""
Build a visual contact sheet for reviewing auto-downloaded saint icons.

Reads dist/saint_image_worklist.csv (the rows the icon downloader marked
image_status=needs_review) and emits dist/icon_contact_sheet.html — a grid of
every downloaded icon with its saint, the matched Wikimedia Commons file, the
license, and a confidence flag. Likely-wrong matches (the saint's name does not
appear in the Commons filename — where the same-name / artist-name collisions
cluster) are sorted FIRST so they're quickest to reject.

Local authoring aid only; writes one HTML file, commits nothing. Open it with:
    open dist/icon_contact_sheet.html      (file:// — images load from ../static)
"""

import csv
import html
import re
import unicodedata
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "dist" / "saint_image_worklist.csv"
OUT = ROOT / "dist" / "icon_contact_sheet.html"

STOP = {
    "st", "st.", "saint", "the", "of", "a", "an", "and", "to", "for", "most",
    "holy", "great", "new", "elder", "venerable", "righteous", "blessed",
    "prophet", "apostle", "apostles", "evangelist", "martyr", "hieromartyr",
    "protomartyr", "first", "hierarch", "wonderworker", "equal", "princess",
    "prince", "queen", "king", "woman", "women", "icon", "jesus", "christ",
    "god", "saints",
}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower().replace("ph", "f").replace("y", "i")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", text)).strip()


def name_tokens(name: str, aka: str) -> set:
    out = set()
    for piece in [re.sub(r"\([^)]*\)", " ", name)] + (aka or "").split(";"):
        for w in normalize(piece).split():
            if len(w) >= 4 and w not in STOP:
                out.add(w)
    return out


def filename_from_url(url: str) -> str:
    """The Commons File: title from a descriptionurl."""
    if not url:
        return ""
    tail = unquote(url.rsplit("/", 1)[-1])
    return tail[5:] if tail.startswith("File:") else tail


# Filename words that signal a likely-wrong match. The icon downloader already
# required a saint-name token in the title, so re-checking that is circular — the
# real false positives (a church/museum photo, a group icon, an OT scene, an
# artist who shares the name) slip through *with* the token. These words catch
# the error classes actually observed in the run.
_BUILDING = re.compile(
    r"\b(church|cathedral|monastery|chapel|convent|museum|basilica|temple|"
    r"sign|street|map|coin|stamp|banknote|gallus|sacrifice|tomb|grave|"
    r"cemetery|station|hotel|school|library|hall)\b",
    re.I,
)


def flag_reason(tokens: set, name: str, filename: str) -> str:
    """'' when the match looks clean; otherwise a short reason to scrutinise it."""
    norm = normalize(filename)
    if not any(re.search(rf"\b{re.escape(t)}\b", norm) for t in tokens):
        return "name not in filename"
    # Commons filenames join words with underscores, on which \b does not break —
    # flatten to spaces (keep letters only) before the word checks.
    flat = re.sub(r"[^a-zA-Z]+", " ", filename).lower()
    # If the filename literally says "icon", it's almost certainly a real icon
    # (often just located in / named after a church) — don't building-flag it.
    if "icon" not in flat:
        m = _BUILDING.search(flat)
        if m:
            return f"“{m.group(0)}” in filename"
    # Group icon: several distinct saints named, or an explicit plural.
    if re.search(r"\bsaints\b", flat) or len(re.findall(r"\bsaint\b", flat)) >= 2:
        return "looks like a group icon"
    return ""


def main():
    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("image_status") != "needs_review":
                continue
            fn = filename_from_url(r.get("image_source_url", ""))
            toks = name_tokens(r["name"], r.get("also_known_as", ""))
            reason = flag_reason(toks, r["name"], fn)
            rows.append({**r, "_file": fn, "_ok": not reason, "_reason": reason})

    # Flagged first so the likely-wrong matches are reviewed up front.
    rows.sort(key=lambda r: (r["_ok"], r["saint_id"]))
    n_total = len(rows)
    n_check = sum(1 for r in rows if not r["_ok"])

    def esc(s):
        return html.escape(s or "")

    cards = []
    for r in rows:
        sid = r["saint_id"]
        cls = "ok" if r["_ok"] else "check"
        flag = "likely ok" if r["_ok"] else f"⚠ {r['_reason']}"
        src = esc(r.get("image_source_url", ""))
        cards.append(f"""<figure class="c {cls}">
  <img loading="lazy" src="../static/icons/{sid}.jpg" alt="{esc(r['name'])}">
  <figcaption>
    <div class="nm">{esc(r['name'])}</div>
    <div class="id">{sid} · <span class="lic">{esc(r.get('license',''))}</span></div>
    <div class="fl">{esc(r['_file']) or '<em>?</em>'}</div>
    <div class="badge {cls}">{flag}</div>
    <div class="links">
      <a href="{src}" target="_blank" rel="noopener">Commons source ↗</a>
      <a href="https://orthodoxsaintfinder.com/saint/{sid}/" target="_blank" rel="noopener">saint ↗</a>
    </div>
  </figcaption>
</figure>""")

    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Saint icon contact sheet — review</title>
<style>
  :root {{ font-family: -apple-system, Segoe UI, Roboto, sans-serif; }}
  body {{ margin: 0; background: #1e2a38; color: #e9eef4; }}
  header {{ position: sticky; top: 0; background: #16202b; padding: 14px 20px;
           border-bottom: 1px solid #31425a; z-index: 5; }}
  header h1 {{ margin: 0 0 4px; font-size: 17px; }}
  header p {{ margin: 0; font-size: 13px; color: #9fb2c8; }}
  .legend span {{ display: inline-block; margin-right: 14px; }}
  .dot {{ display: inline-block; width: 10px; height: 10px; border-radius: 2px;
          vertical-align: middle; margin-right: 5px; }}
  .dot.check {{ background: #e0a23a; }} .dot.ok {{ background: #4a9e6f; }}
  .grid {{ display: grid; gap: 12px; padding: 16px 20px;
           grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); }}
  .c {{ margin: 0; background: #26333f; border: 1px solid #31425a;
        border-radius: 8px; overflow: hidden; }}
  .c.check {{ border-color: #e0a23a; }}
  .c img {{ width: 100%; aspect-ratio: 4/5; object-fit: cover; display: block;
            background: #0e1620; }}
  figcaption {{ padding: 8px 9px; font-size: 12px; line-height: 1.35; }}
  .nm {{ font-weight: 600; }}
  .id {{ color: #9fb2c8; font-size: 11px; margin: 1px 0 4px; }}
  .lic {{ text-transform: uppercase; letter-spacing: .03em; }}
  .fl {{ color: #c3d2e3; font-size: 10.5px; word-break: break-word;
         max-height: 3.6em; overflow: hidden; }}
  .badge {{ display: inline-block; margin-top: 5px; padding: 1px 6px;
            border-radius: 10px; font-size: 10.5px; }}
  .badge.ok {{ background: #16352440; color: #7fd0a3; }}
  .badge.check {{ background: #3a2c12; color: #f0c069; }}
  .links {{ margin-top: 6px; display: flex; gap: 10px; }}
  .links a {{ color: #6db3f0; font-size: 11px; text-decoration: none; }}
  .links a:hover {{ text-decoration: underline; }}
</style></head>
<body>
<header>
  <h1>Saint icon contact sheet — {n_total} downloaded, needs review</h1>
  <p class="legend">
    <span><span class="dot check"></span><b>{n_check}</b> flagged — filename hints
      at a building / group icon / wrong subject (shown first)</span>
    <span><span class="dot ok"></span><b>{n_total - n_check}</b> unflagged — still
      glance to confirm it's the right saint &amp; a real icon</span>
  </p>
</header>
<div class="grid">
{chr(10).join(cards)}
</div>
</body></html>"""

    OUT.write_text(doc, encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"  {n_total} icons   ({n_check} to verify first, {n_total - n_check} name-matched)")
    print(f"  open {OUT}")


if __name__ == "__main__":
    main()
