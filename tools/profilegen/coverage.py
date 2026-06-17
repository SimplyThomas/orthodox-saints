"""Per-saint coverage verdict + batch log (Grounded Generation spec §5)."""
import csv
import sys
from collections import Counter
from pathlib import Path

LOG_HEADER = ["saint_id", "name", "region", "external_sources",
              "dossier_chars", "verdict"]


def verdict(*, dossier_chars: int, external_sources: int) -> str:
    if external_sources == 0:
        return "none"
    if external_sources >= 2 and dossier_chars >= 1500:
        return "full"
    return "thin"


def log_row(log_csv: Path, row: dict) -> None:
    log_csv.parent.mkdir(parents=True, exist_ok=True)
    new = not log_csv.exists()
    with open(log_csv, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=LOG_HEADER)
        if new:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in LOG_HEADER})


def summarize(log_csv: Path) -> str:
    """Group thin/none by region — the signal for the next source to add."""
    gaps: Counter = Counter()
    with open(log_csv, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["verdict"] in ("thin", "none"):
                gaps[(row["region"] or "—", row["verdict"])] += 1
    lines = ["Coverage gaps (thin/none) by region:"]
    for (region, v), n in sorted(gaps.items(), key=lambda x: -x[1]):
        lines.append(f"  {n:4}  {v:5}  {region}")
    return "\n".join(lines)


if __name__ == "__main__":
    print(summarize(Path(sys.argv[1])))
