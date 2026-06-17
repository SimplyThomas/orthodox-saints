"""Rank saints that lack a rich profile by finder value, so a batch enriches the
highest-traffic patrons first (Grounded Generation spec §8.1)."""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SAINTS_CSV = ROOT / "data" / "saints.csv"
PROFILES_DIR = ROOT / "src" / "content" / "profiles"  # YAML content collection

WEIGHTS = {
    "Commonly Asked Intercessions": 3,
    "Vocation": 1,
    "Life Experience": 1,
    "Virtue": 1,
}


def finder_score(row: dict) -> int:
    score = 0
    for col, w in WEIGHTS.items():
        terms = [t for t in (row.get(col) or "").split("; ") if t.strip()]
        score += w * len(terms)
    return score


def profiled_ids() -> set[str]:
    if not PROFILES_DIR.is_dir():
        return set()
    return {p.stem for p in PROFILES_DIR.glob("OS-*.yaml")}


def ranked(limit: int) -> list[tuple[str, int]]:
    done = profiled_ids()
    rows = []
    with open(SAINTS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            sid = row["Saint ID"].strip()
            if sid and sid not in done:
                rows.append((sid, finder_score(row)))
    rows.sort(key=lambda r: (-r[1], r[0]))
    return rows[:limit]


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    for sid, score in ranked(n):
        print(f"{sid}\t{score}")
