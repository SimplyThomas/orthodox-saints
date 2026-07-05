"""Rank feasts that lack a rich profile, most-visited first: the Feast of
Feasts, then the Great Feasts, then the fasting seasons people search for,
then everything else — so each batch enriches the highest-traffic entries."""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FEASTS_CSV = ROOT / "data" / "feasts.csv"
PROFILES_DIR = ROOT / "src" / "content" / "feasts"  # YAML content collection

CATEGORY_WEIGHT = {
    "Feast of Feasts": 100,
    "Great Feast": 90,
    "Fast Season": 80,
    "Fast Day": 60,
    "Feast": 50,
    "Fast-Free Week": 30,
    "Observance": 20,
}


def score(row: dict) -> int:
    return CATEGORY_WEIGHT.get((row.get("Category") or "").strip(), 0)


def profiled_ids() -> set[str]:
    if not PROFILES_DIR.is_dir():
        return set()
    return {p.stem for p in PROFILES_DIR.glob("FF-*.yaml")}


def ranked(limit: int) -> list[tuple[str, int]]:
    done = profiled_ids()
    rows = []
    if not FEASTS_CSV.exists():
        return []
    with open(FEASTS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fid = row["Feast ID"].strip()
            if fid and fid not in done:
                rows.append((fid, score(row)))
    rows.sort(key=lambda r: (-r[1], r[0]))
    return rows[:limit]


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    for fid, s in ranked(n):
        print(f"{fid}\t{s}")
