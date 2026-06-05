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
    python build.py --report        rank icon-less saints by priority (authoring aid)
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import sqlite3
import sys
import unicodedata
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
WEB = ROOT / "web"
PUBLIC = ROOT / "public"
DIST = ROOT / "dist"
STATIC = ROOT / "static"  # Astro publicDir; self-hosted icons live in static/icons/

SAINTS_CSV = DATA / "saints.csv"
VOCAB_CSV = DATA / "vocabulary.csv"
VENDORS_CSV = DATA / "vendors.csv"
NAME_VARIANTS_CSV = DATA / "name_variants.csv"
SAINT_IMAGES_CSV = DATA / "saint_images.csv"

# Real saint portraits (data/saint_images.csv) join to saints by Saint ID. Only
# OPEN, reusable licenses are accepted — an unlicensed image must never deploy
# (CLAUDE.md §9). Attribution licenses (CC-BY*) additionally require a credit.
SAINT_IMAGES_HEADER = ["saint_id", "image_path", "license", "credit", "source"]
OPEN_LICENSES = {"PD", "PD-art", "PD-old", "CC0"}  # public-domain / no-rights


def license_ok(lic: str) -> bool:
    """True if the license is an accepted open license (public-domain family or
    any Creative Commons Attribution variant: CC-BY / CC-BY-SA)."""
    lic = lic.strip()
    return lic in OPEN_LICENSES or bool(re.match(r"^CC-BY(-SA)?(-\d(\.\d)?)?$", lic))


def license_requires_credit(lic: str) -> bool:
    return lic.strip().upper().startswith("CC-BY")

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

    errors.extend(validate_name_variants())

    # Always validate saint_images.csv against the committed saints.csv, not just
    # the rows under test — ensures IDs in image rows resolve to real saints even
    # when validate() is called with a synthetic (unit-test) subset.
    try:
        _, _all_saints = load_saints()
        _img_valid_ids = {r["Saint ID"].strip() for r in _all_saints
                         if r["Saint ID"].strip()}
    except Exception:
        _img_valid_ids = {r["Saint ID"].strip() for r in rows if r["Saint ID"].strip()}
    img_errors, img_warnings = validate_saint_images(_img_valid_ids)
    errors.extend(img_errors)
    warnings.extend(img_warnings)

    if header != HEADER:
        errors.append(
            "Header/column mismatch against the canonical 26-column header.\n"
            f"    expected: {HEADER}\n    found:    {header}"
        )
        # Without a matching header, per-row checks are unreliable.
        return errors, warnings

    seen_ids: dict[str, str] = {}
    norm_names: dict[str, list[str]] = {}

    # term -> the categories where it IS a valid vocabulary term. Used to turn a
    # "wrong column" mistake into an actionable hint (the most common authoring slip).
    term_categories: dict[str, list[str]] = {}
    for cat, terms in vocab.items():
        for t in terms:
            term_categories.setdefault(t, []).append(cat)

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
                    other = [c for c in term_categories.get(v, []) if c != col]
                    hint = (f" (it IS a valid '{' / '.join(sorted(other))}' term "
                            "— wrong column?)") if other else ""
                    errors.append(f"{tag}: unknown term in '{col}': {v!r}.{hint}")

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
# Finder-coverage report (CLAUDE.md §10: the finder's quality axis)
# --------------------------------------------------------------------------- #
# Facets that drive the finder; reported as fill % so changes are visible.
COVERAGE_COLUMNS = [
    "Commonly Asked Intercessions",
    "Life Experience",
    "Vocation",
    "Virtue",
    "Brief Life",
    "Customs & Traditions",
]


def coverage_stats(rows: list[dict[str, str]]) -> list[tuple[str, int, int, float]]:
    total = len(rows)
    stats = []
    for col in COVERAGE_COLUMNS:
        filled = sum(1 for r in rows if r[col].strip())
        pct = (100.0 * filled / total) if total else 0.0
        stats.append((col, filled, total, pct))
    return stats


def report_coverage(rows: list[dict[str, str]]) -> None:
    """Print finder-coverage stats; also write a Markdown table to the GitHub
    Actions job summary when running in CI ($GITHUB_STEP_SUMMARY)."""
    stats = coverage_stats(rows)
    print("Finder coverage:")
    for col, filled, total, pct in stats:
        print(f"  {col:32s} {filled:4d}/{total}  ({pct:5.1f}%)")

    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        lines = [f"## Finder coverage ({len(rows)} saints)", "",
                 "| Facet | Filled | Coverage |", "|---|---:|---:|"]
        for col, filled, total, pct in stats:
            lines.append(f"| {col} | {filled}/{total} | {pct:.1f}% |")
        with open(summary, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")


# --------------------------------------------------------------------------- #
# Priority report (CLAUDE.md §5/§10): rank icon-less saints for the next batch.
# A data-derived proxy for "importance" so each portrait batch is self-directing
# instead of hand-picked. Local authoring aid only — never a CI gate, no output
# file. See issue #83.
# --------------------------------------------------------------------------- #
# Weighted sum of facets all derivable from data/saints.csv. Weights are a
# starting point (issue #83): tradition breadth and a filled Intercession facet
# (the finder's engine, §10) dominate; secondary finder signals and calendar
# surface area break ties.
def priority_score(r: dict[str, str]) -> tuple[int, dict[str, object]]:
    """Composite importance score for an (uncovered) saint, plus the component
    parts used to render the report row."""
    traditions = len(split_multi(r["Tradition of Veneration"]))
    has_intercession = 1 if r["Commonly Asked Intercessions"].strip() else 0
    has_vocation = 1 if r["Vocation"].strip() else 0
    has_experience = 1 if r["Life Experience"].strip() else 0
    # Count fixed-date feasts; a movable-only feast still counts as one.
    feast_count = len(FEAST_RE.findall(r["Feast Day(s)"]) or [None])

    score = (2 * traditions + 3 * has_intercession + has_vocation
             + has_experience + feast_count)
    parts = {
        "traditions": traditions,
        "intercession": bool(has_intercession),
        "vocation": bool(has_vocation),
        "experience": bool(has_experience),
        "feasts": feast_count,
    }
    return score, parts


def priority_ranking(rows: list[dict[str, str]],
                     images: dict[str, dict[str, str]]
                     ) -> list[tuple[int, dict[str, str], dict[str, object]]]:
    """Saints WITHOUT a real icon, ranked by priority_score descending.
    Ties broken by Saint ID so the ordering is stable/reproducible."""
    covered = {sid for sid, img in images.items() if img.get("path")}
    ranked = []
    for r in rows:
        if r["Saint ID"].strip() in covered:
            continue
        score, parts = priority_score(r)
        ranked.append((score, r, parts))
    ranked.sort(key=lambda t: (-t[0], t[1]["Saint ID"]))
    return ranked


def report_priority(rows: list[dict[str, str]], top: int | None = None) -> None:
    """Print a ranked, human-readable table of icon-less saints (issue #83).
    `top` limits the rows shown (None = all)."""
    images = load_saint_images()
    ranked = priority_ranking(rows, images)
    shown = ranked if top is None else ranked[:top]

    covered = sum(1 for img in images.values() if img.get("path"))
    print(f"Icon-priority report - {len(ranked)} saints without a real icon "
          f"({covered} of {len(rows)} covered). "
          f"Showing top {len(shown)}.\n")
    header = (f"{'Rank':>4}  {'OS-ID':<8} {'Name':<40} {'Score':>5}  "
              f"{'Trad':>4}  {'Interc':<6}  {'Vocat':<5}  {'Exp':<3}  {'Feasts':>6}")
    print(header)
    print("-" * len(header))
    for i, (score, r, parts) in enumerate(shown, 1):
        name = r["Name"]
        if len(name) > 40:
            name = name[:37] + "..."
        print(f"{i:>4}  {r['Saint ID']:<8} {name:<40} {score:>5}  "
              f"{parts['traditions']:>4}  {'yes' if parts['intercession'] else 'no':<6}  "
              f"{'yes' if parts['vocation'] else 'no':<5}  "
              f"{'yes' if parts['experience'] else 'no':<3}  {parts['feasts']:>6}")


# --------------------------------------------------------------------------- #
# Derived link fields
# --------------------------------------------------------------------------- #
def derive_links(name: str, hymn: str, icon: str, video: str) -> tuple[str, str, str]:
    q = urllib.parse.quote_plus(name)
    hymn = hymn.strip() or f"https://www.google.com/search?q={q}+apolytikion+troparion"
    icon = icon.strip() or f"https://www.google.com/search?tbm=isch&q={q}+orthodox+icon"
    video = video.strip() or f"https://www.youtube.com/results?search_query={q}+orthodox+saint"
    return hymn, icon, video


def work_link(title: str, name: str) -> dict:
    """A Works-by/about entry rendered as {title, search-URL}. We never host the
    text; we link to a Google search for it (copyright-safe, §9)."""
    q = urllib.parse.quote_plus(f'"{title}" {name}')
    return {"t": title, "u": f"https://www.google.com/search?q={q}"}


def load_vendors() -> list[dict[str, str]]:
    """Icon vendors to link out to (data/vendors.csv: vendor,url_template).
    {q} in the template is replaced by the URL-encoded saint name. Links only —
    no vendor imagery is reproduced (§9); images await an affiliate agreement."""
    if not VENDORS_CSV.exists():
        return []
    out = []
    with VENDORS_CSV.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if row.get("vendor", "").strip() and row.get("url_template", "").strip():
                out.append({"vendor": row["vendor"].strip(),
                            "url_template": row["url_template"].strip()})
    return out


def vendor_links(name: str, vendors: list[dict[str, str]]) -> list[dict]:
    q = urllib.parse.quote_plus(name)
    return [{"vendor": v["vendor"], "url": v["url_template"].replace("{q}", q)}
            for v in vendors]


# --------------------------------------------------------------------------- #
# Self-hosted saint portraits (data/saint_images.csv). One row per saint, keyed
# by Saint ID, pointing at an image under static/ (Astro publicDir). The build
# joins these into the record as `image` (+ credit/license/source) and the
# frontend's tiered SaintAvatar shows the real icon instead of the monogram.
# Licensing is enforced here so an unlicensed image can never deploy (§9).
# --------------------------------------------------------------------------- #
def load_saint_images() -> dict[str, dict[str, str]]:
    """saint_id -> {path, license, credit, source}. Empty if the file is absent."""
    out: dict[str, dict[str, str]] = {}
    if not SAINT_IMAGES_CSV.exists():
        return out
    with SAINT_IMAGES_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != SAINT_IMAGES_HEADER:
            sys.exit(f"FATAL: {SAINT_IMAGES_CSV} header must be "
                     f"{SAINT_IMAGES_HEADER}, got {reader.fieldnames!r}")
        for row in reader:
            sid = (row.get("saint_id") or "").strip()
            if not sid:
                continue
            out[sid] = {
                "path": (row.get("image_path") or "").strip(),
                "license": (row.get("license") or "").strip(),
                "credit": (row.get("credit") or "").strip(),
                "source": (row.get("source") or "").strip(),
            }
    return out


def validate_saint_images(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """Validate data/saint_images.csv against §9: known saint, an existing local
    file, an accepted open license, and a credit when the license requires one."""
    errors: list[str] = []
    warnings: list[str] = []
    if not SAINT_IMAGES_CSV.exists():
        return errors, warnings
    with SAINT_IMAGES_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != SAINT_IMAGES_HEADER:
            return ([f"saint_images.csv header must be {SAINT_IMAGES_HEADER}, "
                     f"got {reader.fieldnames!r}"], warnings)
        seen: set[str] = set()
        for i, row in enumerate(reader, 2):
            if not any((v or "").strip() for v in row.values()):
                continue
            sid = (row.get("saint_id") or "").strip()
            path = (row.get("image_path") or "").strip()
            lic = (row.get("license") or "").strip()
            credit = (row.get("credit") or "").strip()
            source = (row.get("source") or "").strip()
            where = f"saint_images.csv line {i}"

            if not sid:
                errors.append(f"{where}: empty saint_id.")
            elif not ID_RE.match(sid):
                errors.append(f"{where}: saint_id {sid!r} is not an OS-#### id.")
            elif sid not in valid_ids:
                errors.append(f"{where}: saint_id {sid!r} matches no saint.")
            elif sid in seen:
                errors.append(f"{where}: duplicate image row for {sid} "
                              "(one portrait per saint).")
            seen.add(sid)

            if not path:
                errors.append(f"{where} ({sid}): empty image_path.")
            elif not (STATIC / path).is_file():
                errors.append(f"{where} ({sid}): image_path {path!r} not found "
                              f"under static/ (expected {(STATIC / path)}).")

            if not lic:
                errors.append(f"{where} ({sid}): empty license. Self-hosted images "
                              "must declare an open license (§9).")
            elif not license_ok(lic):
                errors.append(f"{where} ({sid}): license {lic!r} is not an accepted "
                              "open license (PD / PD-art / PD-old / CC0 / CC-BY / CC-BY-SA).")
            elif license_requires_credit(lic) and not credit:
                errors.append(f"{where} ({sid}): license {lic} requires a 'credit' "
                              "(attribution).")

            if not source:
                warnings.append(f"{where} ({sid}): no 'source' (provenance) given.")
    return errors, warnings


# --------------------------------------------------------------------------- #
# Name variants (data/name_variants.csv): equivalence groups of given-name
# forms — English nicknames + cross-language/transliteration variants. The
# build expands each saint's search haystack with the other forms in any group
# their Name / Also Known As belongs to, so e.g. searching "Lucy" finds Lucia
# and "Ivan" finds John, without hand-editing every row.
# --------------------------------------------------------------------------- #
def fold(s: str) -> str:
    """Lowercase + strip diacritics, so 'Étienne' and 'etienne' compare equal."""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def name_tokens(text: str) -> set[str]:
    """Folded alphabetic word tokens of a name string."""
    return {fold(t) for t in re.findall(r"[^\W\d_]+", text, flags=re.UNICODE)}


def load_name_variants() -> dict[str, list[str]]:
    """form (folded) -> the full list of display forms in that form's group."""
    lookup: dict[str, list[str]] = {}
    if not NAME_VARIANTS_CSV.exists():
        return lookup
    with NAME_VARIANTS_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if header != ["group", "names"]:
            sys.exit(f"FATAL: {NAME_VARIANTS_CSV} header must be 'group,names', got {header!r}")
        for row in reader:
            if not row or not any(c.strip() for c in row):
                continue
            forms = split_multi(row[1]) if len(row) > 1 else []
            for form in forms:
                lookup[fold(form)] = forms
    return lookup


def validate_name_variants() -> list[str]:
    """A form must sit in exactly one group; each group needs >= 2 forms."""
    errs: list[str] = []
    if not NAME_VARIANTS_CSV.exists():
        return errs
    with NAME_VARIANTS_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if header != ["group", "names"]:
            return [f"name_variants.csv header must be 'group,names', got {header!r}"]
        groups: set[str] = set()
        seen: dict[str, str] = {}
        for i, row in enumerate(reader, 2):
            if not row or not any(c.strip() for c in row):
                continue
            grp = row[0].strip()
            forms = split_multi(row[1]) if len(row) > 1 else []
            if not grp:
                errs.append(f"name_variants.csv line {i}: empty group key")
            elif grp in groups:
                errs.append(f"name_variants.csv: duplicate group '{grp}'")
            groups.add(grp)
            if len(forms) < 2:
                errs.append(f"name_variants.csv group '{grp}': needs at least 2 forms")
            for form in forms:
                key = fold(form)
                if key in seen and seen[key] != grp:
                    errs.append(f"name_variants.csv: form '{form}' is in both "
                                f"'{seen[key]}' and '{grp}' (a form must belong to one group)")
                seen[key] = grp
    return errs


def variant_forms(r: dict[str, str], lookup: dict[str, list[str]]) -> list[str]:
    """Extra display-name forms a saint can be found by, beyond what already
    appears in their Name / Also Known As."""
    if not lookup:
        return []
    present = name_tokens(r["Name"])
    for a in split_multi(r["Also Known As"]):
        present |= name_tokens(a)
    added: list[str] = []
    seen: set[str] = set()
    for tok in present:
        for form in lookup.get(tok, []):
            ff = fold(form)
            if ff in present or ff in seen:
                continue
            seen.add(ff)
            added.append(form)
    return sorted(added)


# --------------------------------------------------------------------------- #
# Emit data.json
# --------------------------------------------------------------------------- #
def to_record(r: dict[str, str], vendors: list[dict[str, str]] | None = None,
              name_variants: dict[str, list[str]] | None = None,
              images: dict[str, dict[str, str]] | None = None) -> dict:
    if vendors is None:
        vendors = load_vendors()
    if name_variants is None:
        name_variants = load_name_variants()
    if images is None:
        images = load_saint_images()
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
    # Works by/about -> {title, search-URL}; plus per-saint icon-vendor links.
    rec["works"] = [work_link(t, r["Name"]) for t in rec["works"]]
    rec["about"] = [work_link(t, r["Name"]) for t in rec["about"]]
    rec["vendors"] = vendor_links(r["Name"], vendors)
    # Self-hosted real portrait (data/saint_images.csv), if one exists for this
    # saint. `image` is a static/-relative path the frontend base-prefixes; the
    # tiered SaintAvatar then shows it instead of the monogram. Attribution
    # (credit/license/source) rides along for the detail-page caption.
    img = images.get(r["Saint ID"].strip())
    if img and img.get("path"):
        rec["image"] = img["path"]
        if img.get("license"):
            rec["imageLicense"] = img["license"]
        if img.get("credit"):
            rec["imageCredit"] = img["credit"]
        if img.get("source"):
            rec["imageSource"] = img["source"]
    # Search haystack: name + aka + brief + notes + customs + all facet values.
    facets = []
    for col in CONTROLLED + FREE_MULTI + ["Brief Life", "Notes", "Customs & Traditions"]:
        facets.append(r[col])
    rec["search"] = " ".join(p for p in facets + [r["Name"]] if p).strip()
    # Name-variant expansion: make the saint findable by nickname / other-language
    # forms. The display forms power a "matched via" hint; the folded forms keep
    # the (accent-naive, lowercased) client substring search working for them.
    added = variant_forms(r, name_variants)
    if added:
        rec["variants"] = added
        extra = []
        for form in added:
            extra.append(form)
            folded = fold(form)
            if folded != form.lower():
                extra.append(folded)
        rec["search"] = (rec["search"] + " " + " ".join(extra)).strip()
    return rec


def emit_data_json(rows: list[dict[str, str]]) -> list[dict]:
    vendors = load_vendors()
    name_variants = load_name_variants()
    images = load_saint_images()
    records = [to_record(r, vendors, name_variants, images) for r in rows]
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
        elif src.is_dir():
            # e.g. web/assets/ (logo images) — copy the whole subtree.
            shutil.copytree(src, PUBLIC / src.name, dirs_exist_ok=True)


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
        "Code: MIT License. Data: CC0 1.0 (public domain dedication).",
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
    ap.add_argument("--no-xlsx", action="store_true",
                    help="skip the Excel export (lets the full build run without openpyxl)")
    ap.add_argument("--sqlite", action="store_true",
                    help="also emit public/saints.sqlite")
    ap.add_argument("--report", action="store_true",
                    help="print a ranked table of saints lacking a real icon, then exit "
                         "(local authoring aid; no files written)")
    ap.add_argument("--top", type=int, default=50, metavar="N",
                    help="rows to show in --report (0 = all; default 50)")
    args = ap.parse_args()

    vocab = load_vocab()
    header, rows = load_saints()

    # The priority report is a read-only authoring aid: validate quietly so the
    # ranking reflects the committed data, but never write files or assign IDs.
    if args.report:
        errors, _ = validate(header, rows, vocab)
        if errors:
            print(f"WARNING: {len(errors)} validation error(s) in the source data; "
                  "the report below reflects the data as committed.", file=sys.stderr)
        report_priority(rows, top=None if args.top == 0 else args.top)
        return 0

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

    report_coverage(rows)

    if args.check_only:
        return 0

    if args.xlsx_only:
        emit_xlsx(header, rows, vocab)
        return 0

    records = emit_data_json(rows)
    copy_web()
    print(f"  wrote public/data.json ({len(records)} records)")
    if not args.no_xlsx:
        emit_xlsx(header, rows, vocab)
    if args.sqlite:
        emit_sqlite(conn)

    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
