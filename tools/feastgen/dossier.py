"""Seed a feast-profile dossier from the feast's own in-repo record — the trusted
baseline and verification anchor (the profilegen pattern, feast-shaped).

The anchor is the data/feasts.csv row: its dates, category, fasting summary,
brief, and customs are authoritative; Gather appends external material to
`external[]` and must never contradict the row."""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FEASTS_CSV = ROOT / "data" / "feasts.csv"
SAINTS_CSV = ROOT / "data" / "saints.csv"

CONTEXT_COLS = ["Category", "Dedication", "Begins", "Ends", "Forefeast",
                "Apodosis", "Fasting Discipline", "Tradition of Observance"]


def _related_saint_names(ids_cell: str) -> list[str]:
    """Resolve Related Saints OS-ids to 'OS-#### Name' strings so the dossier
    carries the human context, not bare ids."""
    ids = [s.strip() for s in (ids_cell or "").split("; ") if s.strip()]
    if not ids:
        return []
    names: dict[str, str] = {}
    with open(SAINTS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            sid = row["Saint ID"].strip()
            if sid in ids:
                names[sid] = row["Name"].strip()
    return [f"{sid} {names.get(sid, '(unknown)')}" for sid in ids]


def baseline(row: dict) -> dict:
    return {
        "id": row["Feast ID"].strip(),
        "name": row["Name"].strip(),
        "anchor": {
            "brief": (row.get("Brief") or "").strip(),
            "notes": (row.get("Notes") or "").strip(),
            "customs": (row.get("Customs & Traditions") or "").strip(),
            "fastingNotes": (row.get("Fasting Notes") or "").strip(),
            "context": {c: (row.get(c) or "").strip() for c in CONTEXT_COLS},
            "relatedSaints": _related_saint_names(row.get("Related Saints") or ""),
            "sources": [
                s for s in (row.get("Sources") or "").split("; ") if s.strip()
            ],
        },
        "external": [],  # Gather appends {text, source} items here
    }


def for_id(fid: str) -> dict:
    with open(FEASTS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["Feast ID"].strip() == fid:
                return baseline(row)
    raise SystemExit(f"unknown Feast ID: {fid}")


if __name__ == "__main__":
    print(json.dumps(for_id(sys.argv[1]), ensure_ascii=False, indent=2))
