"""Seed a generation dossier from the saint's own in-repo record — the trusted
baseline and verification anchor (Grounded Generation spec §3.1a)."""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SAINTS_CSV = ROOT / "data" / "saints.csv"

ANCHOR_COLS = ["Brief Life", "Notes", "Customs & Traditions"]
CONTEXT_COLS = ["Feast Day(s)", "Region of Origin", "Era", "Century", "Rank / Type"]


def baseline(row: dict) -> dict:
    return {
        "id": row["Saint ID"].strip(),
        "name": row["Name"].strip(),
        "anchor": {
            "brief": (row.get("Brief Life") or "").strip(),
            "notes": (row.get("Notes") or "").strip(),
            "customs": (row.get("Customs & Traditions") or "").strip(),
            "context": {c: (row.get(c) or "").strip() for c in CONTEXT_COLS},
            "sources": [
                s for s in (row.get("Sources") or "").split("; ") if s.strip()
            ],
        },
        "external": [],  # Gather appends {text, source} items here
    }


def for_id(sid: str) -> dict:
    with open(SAINTS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["Saint ID"].strip() == sid:
                return baseline(row)
    raise SystemExit(f"unknown Saint ID: {sid}")


if __name__ == "__main__":
    print(json.dumps(for_id(sys.argv[1]), ensure_ascii=False, indent=2))
