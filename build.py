#!/usr/bin/env python3
"""Build tool for the Orthodox Saints Database.

Pipeline:  data/*.csv  ->  in-memory SQLite  ->  validate  ->  emit artifacts.

The CSVs in data/ are the SOURCE OF TRUTH. SQLite is created fresh every run,
used only for validation/query, then discarded. Generated output (public/, dist/)
is never committed. See CLAUDE.md and bootstrap.md.

Usage:
    python build.py                 validate + emit data.json, site, xlsx
    python build.py --check-only    validate only, exit non-zero on any violation
    python build.py --xlsx-only     emit only the Excel export
    python build.py --sqlite        also emit public/saints.sqlite (read-only artifact)
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import sqlite3
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
WEB = ROOT / "web"
PUBLIC = ROOT / "public"
DIST = ROOT / "dist"

SAINTS_CSV = DATA / "saints.csv"
VOCAB_CSV = DATA / "vocabulary.csv"

# The canonical 26-column header, exact and in order (CLAUDE.md §5).
HEADER = [
    "Saint ID", "Name", "Also Known As", "Gender", "Rank / Type", "Church Status",
    "Family / Life State", "Vocation", "Life Experience", "Virtue",
    "Commonly Asked Intercessions", "Region of Origin", "Tradition of Veneration",
    "Era", "Century", "Feast Day(s)", "Short Prayer (Intercession)",
    "Hymn / Apolytikion", "Icon", "Brief Life", "Notes", "Customs & Traditions",
    "Works by the Saint", "Works About the Saint", "Video / Media", "Sources",
]

# Controlled columns -> their vocabulary category (same name).
CONTROLLED = [
    "Gender", "Rank / Type", "Church Status", "Family / Life State", "Vocation",
    "Life Experience", "Virtue", "Commonly Asked Intercessions", "Region of Origin",
    "Tradition of Veneration", "Era", "Century",
]
# Single-value controlled columns (the rest are multi-value).
SINGLE_VALUE = {"Gender", "Era", "Century"}

# Required non-empty fields (bootstrap §4). Era-or-Century handled separately.
REQUIRED = ["Name", "Rank / Type", "Gender", "Feast Day(s)",
            "Short Prayer (Intercession)", "Sources"]

# Free-text multi-value columns split for the JSON (not vocab-checked).
FREE_MULTI = ["Also Known As", "Works by the Saint", "Works About the Saint"]

MULTI_SEP = "; "

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH_INDEX = {m: i + 1 for i, m in enumerate(MONTHS)}
FEAST_RE = re.compile(r"\b(" + "|".join(MONTHS) + r")\s+(\d{1,2})\b")

# Movable feasts are a permanent feature of the Orthodox calendar (Pascha- and
# Pentecost-relative). They have no fixed "Mon D" token; we accept them as valid
# feasts and sort them after the fixed-date calendar.
MOVABLE_RE = re.compile(
    r"\b(Sunday|Saturday|Pascha|Pentecost|Lent|Lenten|Cheesefare|Meatfare|"
    r"Pentecostarion|Ascension|Thomas|Palm|Holy Week|Bright)\b",
    re.IGNORECASE,
)
MOVABLE_SORT = 9999  # sorts movable-only feasts last in calendar order

ID_RE = re.compile(r"^OS-\d{4,}$")

# Short JSON keys, stable, in display order. Maps CSV column -> json key.
JSON_KEYS = {
    "Saint ID": "id", "Name": "name", "Also Known As": "aka", "Gender": "gender",
    "Rank / Type": "rank", "Church Status": "church", "Family / Life State": "family",
    "Vocation": "vocation", "Life Experience": "experience", "Virtue": "virtue",
    "Commonly Asked Intercessions": "intercession", "Region of Origin": "origin",
    "Tradition of Veneration": "tradition", "Era": "era", "Century": "century",
    "Feast Day(s)": "feast", "Short Prayer (Intercession)": "prayer",
    "Hymn / Apolytikion": "hymn", "Icon": "icon", "Brief Life": "brief",
    "Notes": "notes", "Customs & Traditions": "customs",
    "Works by the Saint": "works", "Works About the Saint": "about",
    "Video / Media": "video", "Sources": "sources",
}
# Which json keys are arrays (multi-value).
ARRAY_KEYS = {JSON_KEYS[c] for c in (
    [c for c in CONTROLLED if c not in SINGLE_VALUE] + FREE_MULTI
)}


def split_multi(value: str) -> list[str]:
    return [v.strip() for v in value.split(MULTI_SEP) if v.strip()]


# --------------------------------------------------------------------------- #
# Load
# --------------------------------------------------------------------------- #
def load_vocab() -> dict[str, set[str]]:
    vocab: dict[str, set[str]] = {}
    with open(VOCAB_CSV, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if header != ["category", "term"]:
            sys.exit(f"FATAL: {VOCAB_CSV} header must be 'category,term', got {header!r}")
        for row in reader:
            if not row or not any(c.strip() for c in row):
                continue
            cat, term = row[0].strip(), row[1].strip()
            vocab.setdefault(cat, set()).add(term)
    return vocab


def load_saints() -> tuple[list[str], list[dict[str, str]]]:
    with open(SAINTS_CSV, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        rows = [dict(zip(header, r)) for r in reader if any(c.strip() for c in r)]
    return header, rows


# --------------------------------------------------------------------------- #
# ID assignment (CLAUDE.md §6): blank IDs get the next sequential OS-####.
# --------------------------------------------------------------------------- #
def next_id_seed(rows: list[dict[str, str]]) -> int:
    """Highest existing OS-#### number across rows (0 if none)."""
    max_num = 0
    for r in rows:
        m = re.match(r"^OS-(\d+)$", r["Saint ID"].strip())
        if m:
            max_num = max(max_num, int(m.group(1)))
    return max_num


def assign_ids(rows: list[dict[str, str]]) -> bool:
    """Assign the next sequential OS-#### to any blank Saint ID. Mutates rows
    in place; returns True if any ID was assigned. Pure (no file I/O)."""
    max_num = next_id_seed(rows)
    assigned = False
    for r in rows:
        if not r["Saint ID"].strip():
            max_num += 1
            r["Saint ID"] = f"OS-{max_num:04d}"
            assigned = True
            print(f"  assigned {r['Saint ID']}  {r['Name']}")
    return assigned


def write_saints(header: list[str], rows: list[dict[str, str]]) -> None:
    with open(SAINTS_CSV, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)
    print(f"  wrote stable IDs back to {SAINTS_CSV.relative_to(ROOT)}")


# --------------------------------------------------------------------------- #
# Feast parsing
# --------------------------------------------------------------------------- #
def parse_months(feast: str) -> list[str]:
    seen: list[str] = []
    for mon, _day in FEAST_RE.findall(feast):
        if mon not in seen:
            seen.append(mon)
    return seen


def feast_sort(feast: str) -> int:
    vals = [MONTH_INDEX[mon] * 100 + int(day) for mon, day in FEAST_RE.findall(feast)]
    if vals:
        return min(vals)
    return MOVABLE_SORT  # movable-only feast


def feast_recognized(feast: str) -> bool:
    """A feast is valid if it has a fixed Mon-D token OR a movable-feast keyword."""
    return bool(FEAST_RE.search(feast) or MOVABLE_RE.search(feast))


# --------------------------------------------------------------------------- #
# SQLite build (validation/query engine; discarded unless --sqlite)
# --------------------------------------------------------------------------- #
def build_db(header: list[str], rows: list[dict[str, str]],
             vocab: dict[str, set[str]]) -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()
    cols = [f'"{c}"' for c in header] + ["months", "feast_sort"]
    cur.execute(f"CREATE TABLE saints ({', '.join(c + ' TEXT' for c in cols)})")
    placeholders = ", ".join("?" for _ in cols)
    for r in rows:
        values = [r[c] for c in header]
        values.append(MULTI_SEP.join(parse_months(r["Feast Day(s)"])))
        values.append(str(feast_sort(r["Feast Day(s)"])))
        cur.execute(f"INSERT INTO saints VALUES ({placeholders})", values)
    cur.execute("CREATE TABLE vocabulary (category TEXT, term TEXT)")
    for cat, terms in vocab.items():
        cur.executemany("INSERT INTO vocabulary VALUES (?, ?)",
                        [(cat, t) for t in sorted(terms)])
    conn.commit()
    return conn


# --------------------------------------------------------------------------- #
# Validate (collect ALL violations, then report)
# --------------------------------------------------------------------------- #
def validate(header: list[str], rows: list[dict[str, str]],
             vocab: dict[str, set[str]]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    if header != HEADER:
        errors.append(
            "Header/column mismatch against the canonical 26-column header.\n"
            f"    expected: {HEADER}\n    found:    {header}"
        )
        # Without a matching header, per-row checks are unreliable.
        return errors, warnings

    seen_ids: dict[str, str] = {}
    norm_names: dict[str, list[str]] = {}

    for r in rows:
        sid = r["Saint ID"].strip()
        tag = sid or f"(blank id, Name={r['Name']!r})"

        # ID format + uniqueness
        if not sid:
            errors.append(f"{tag}: empty Saint ID (build should have assigned one).")
        elif not ID_RE.match(sid):
            errors.append(f"{sid}: Saint ID does not match ^OS-\\d{{4,}}$.")
        if sid:
            if sid in seen_ids:
                errors.append(f"{sid}: duplicate Saint ID (also '{seen_ids[sid]}').")
            else:
                seen_ids[sid] = r["Name"]

        # Required fields
        for col in REQUIRED:
            if not r[col].strip():
                errors.append(f"{tag}: missing required field '{col}'.")
        if not r["Era"].strip() and not r["Century"].strip():
            errors.append(f"{tag}: requires at least one of Era or Century.")

        # Feast must be parseable (fixed Mon-D or movable keyword)
        if r["Feast Day(s)"].strip() and not feast_recognized(r["Feast Day(s)"]):
            errors.append(
                f"{tag}: unparseable Feast Day(s) {r['Feast Day(s)']!r} "
                "(need a 'Mon D' date or a recognized movable-feast term)."
            )

        # Controlled-vocabulary terms
        for col in CONTROLLED:
            raw = r[col].strip()
            if not raw:
                continue
            values = [raw] if col in SINGLE_VALUE else split_multi(raw)
            for v in values:
                if v not in vocab.get(col, set()):
                    errors.append(f"{tag}: unknown term in '{col}': {v!r}.")

        # Warning: near-duplicate name
        key = re.sub(r"[^a-z0-9]", "", r["Name"].lower())
        norm_names.setdefault(key, []).append(sid or r["Name"])

        # Warning: finder-coverage nudge on non-stub saints
        is_stub = not r["Brief Life"].strip()
        if not is_stub and not r["Commonly Asked Intercessions"].strip():
            warnings.append(f"{tag}: no Commonly Asked Intercessions (finder coverage).")

    for key, ids in norm_names.items():
        if len(ids) > 1:
            warnings.append(f"possible duplicate saint (same normalized name): {ids}")

    return errors, warnings


# --------------------------------------------------------------------------- #
# Derived link fields
# --------------------------------------------------------------------------- #
def derive_links(name: str, hymn: str, icon: str, video: str) -> tuple[str, str, str]:
    q = urllib.parse.quote_plus(name)
    hymn = hymn.strip() or f"https://www.google.com/search?q={q}+apolytikion+troparion"
    icon = icon.strip() or f"https://www.google.com/search?tbm=isch&q={q}+orthodox+icon"
    video = video.strip() or f"https://www.youtube.com/results?search_query={q}+orthodox+saint"
    return hymn, icon, video


# --------------------------------------------------------------------------- #
# Emit data.json
# --------------------------------------------------------------------------- #
def to_record(r: dict[str, str]) -> dict:
    rec: dict = {}
    for col, key in JSON_KEYS.items():
        val = r[col]
        if key in ARRAY_KEYS:
            rec[key] = split_multi(val)
        else:
            rec[key] = val.strip()
    rec["months"] = parse_months(r["Feast Day(s)"])
    rec["feastSort"] = feast_sort(r["Feast Day(s)"])
    rec["hymn"], rec["icon"], rec["video"] = derive_links(
        r["Name"], r["Hymn / Apolytikion"], r["Icon"], r["Video / Media"]
    )
    # Search haystack: name + aka + brief + notes + customs + all facet values.
    facets = []
    for col in CONTROLLED + FREE_MULTI + ["Brief Life", "Notes", "Customs & Traditions"]:
        facets.append(r[col])
    rec["search"] = " ".join(p for p in facets + [r["Name"]] if p).strip()
    return rec


def emit_data_json(rows: list[dict[str, str]]) -> list[dict]:
    records = [to_record(r) for r in rows]
    records.sort(key=lambda x: x["feastSort"])
    PUBLIC.mkdir(exist_ok=True)
    with open(PUBLIC / "data.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, separators=(",", ":"))
    return records


def copy_web():
    """Colocate the static SPA with data.json so `make serve` works from public/."""
    if not WEB.exists():
        return
    for src in WEB.iterdir():
        if src.is_file():
            shutil.copy2(src, PUBLIC / src.name)


# --------------------------------------------------------------------------- #
# Emit xlsx
# --------------------------------------------------------------------------- #
def emit_xlsx(header: list[str], rows: list[dict[str, str]],
              vocab: dict[str, set[str]]):
    from openpyxl import Workbook
    from openpyxl.styles import Font

    DIST.mkdir(exist_ok=True)
    wb = Workbook()

    ws = wb.active
    ws.title = "Saints Database"
    ws.append(header)
    for cell in ws[1]:
        cell.font = Font(bold=True)
    for r in rows:
        ws.append([r[c] for c in header])
    ws.freeze_panes = "A2"

    vs = wb.create_sheet("Controlled Vocabulary")
    vs.append(["category", "term"])
    for cell in vs[1]:
        cell.font = Font(bold=True)
    for cat in sorted(vocab):
        for term in sorted(vocab[cat]):
            vs.append([cat, term])

    rm = wb.create_sheet("Read Me")
    notes = [
        "Orthodox Saints Database — Excel export",
        "",
        f"{len(rows)} saints. Generated from data/saints.csv (source of truth).",
        "",
        "This dataset is a work in progress and is NOT an authoritative or official",
        "liturgical resource. It awaits review by competent clergy and sources.",
        "",
        "Code: MIT License. Data: CC BY-SA 4.0.",
    ]
    for line in notes:
        rm.append([line])

    out = DIST / "Orthodox_Saints_Database.xlsx"
    wb.save(out)
    print(f"  wrote {out.relative_to(ROOT)}")


def emit_sqlite(conn: sqlite3.Connection):
    PUBLIC.mkdir(exist_ok=True)
    out = PUBLIC / "saints.sqlite"
    if out.exists():
        out.unlink()
    disk = sqlite3.connect(str(out))
    conn.backup(disk)
    disk.close()
    print(f"  wrote {out.relative_to(ROOT)}")


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main() -> int:
    ap = argparse.ArgumentParser(description="Build the Orthodox Saints Database.")
    ap.add_argument("--check-only", action="store_true",
                    help="validate only; no output files")
    ap.add_argument("--xlsx-only", action="store_true",
                    help="emit only the Excel export")
    ap.add_argument("--sqlite", action="store_true",
                    help="also emit public/saints.sqlite")
    args = ap.parse_args()

    vocab = load_vocab()
    header, rows = load_saints()

    if not args.check_only:
        if assign_ids(rows):
            write_saints(header, rows)

    conn = build_db(header, rows, vocab)
    errors, warnings = validate(header, rows, vocab)

    # Finder-coverage nudges are bulk and low-signal; summarize them. Other
    # warnings (e.g. possible duplicate saints) are surfaced individually.
    coverage = [w for w in warnings if "finder coverage" in w]
    other = [w for w in warnings if "finder coverage" not in w]
    for w in other:
        print(f"WARN: {w}")
    if coverage:
        print(f"WARN: {len(coverage)} saint(s) without Commonly Asked "
              f"Intercessions (finder-coverage nudge; not a failure).")
    if errors:
        print(f"\nVALIDATION FAILED — {len(errors)} error(s):", file=sys.stderr)
        for e in errors:
            print(f"  ERROR: {e}", file=sys.stderr)
        return 1

    print(f"VALIDATION CLEAN — {len(rows)} saints, "
          f"{len(warnings)} warning(s), 0 errors.")

    if args.check_only:
        return 0

    if args.xlsx_only:
        emit_xlsx(header, rows, vocab)
        return 0

    records = emit_data_json(rows)
    copy_web()
    print(f"  wrote public/data.json ({len(records)} records)")
    emit_xlsx(header, rows, vocab)
    if args.sqlite:
        emit_sqlite(conn)

    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
