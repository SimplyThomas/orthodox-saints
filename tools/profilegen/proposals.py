"""Pre-filter proposed quote/image rows with the same PD gates build.py enforces
(CLAUDE.md §5/§9), and append survivors to dist/ files for human review."""
import csv
import re
from pathlib import Path

# Accepted PD translation markers (mirror build.py's quote gate).
PD_QUOTE_RE = re.compile(r"\b(ANF|NPNF1?|NPNF2|CC0|PD(-old)?)\b|\(PD\)|KJV", re.I)
# Accepted open image licenses (mirror build.py's image gate).
OPEN_LICENSE_RE = re.compile(
    r"^(PD|PD-art|PD-old|CC0|CC-BY(-SA)?(-\d(\.\d)?)?)$", re.I)


def quote_ok(row: dict) -> bool:
    return bool(
        (row.get("quote") or "").strip()
        and (row.get("source_url") or "").strip()
        and PD_QUOTE_RE.search(row.get("translation") or "")
    )


def image_ok(row: dict) -> bool:
    return bool(
        (row.get("image_path") or "").strip()
        and (row.get("source") or "").strip()
        and OPEN_LICENSE_RE.match((row.get("license") or "").strip())
    )


def append(dist_csv: Path, header: list[str], row: dict) -> None:
    dist_csv.parent.mkdir(parents=True, exist_ok=True)
    new = not dist_csv.exists()
    with open(dist_csv, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        if new:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in header})
