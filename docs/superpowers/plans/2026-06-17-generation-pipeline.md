# Generation Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the in-repo grounded pipeline that turns a batch of saints into reviewed-ready draft profiles — gather a cited dossier, write original encyclopedic prose, adversarially verify it against the OCA-anchor row, and emit per-saint `draft`/`flagged` profile files plus additive CSV facet enrichment and propose-only PD quote/image rows — with coverage logged so source gaps are visible.

**Architecture:** Deterministic, correctness-critical work (prioritization, dossier seeding, CRLF-safe facet merge, profile-file emit, PD-gate proposals, coverage verdict/log) lives in a unit-tested Python package `tools/profilegen/`. The three capability stages (Gather/Write/Verify) are run as a **Workflow** (`scripts/profilegen.workflow.js`) that pipelines a batch through `agent()` calls with **per-stage models** (Gather=Haiku, Write=Opus, Verify=Sonnet) and invokes the Python helpers via Bash for every step that touches repo files. Nothing auto-publishes: output is `draft`/`flagged`, gated to `reviewed`-only in production by Plan 1.

**Tech Stack:** Python 3.11 (`csv`, `unittest`) for helpers; the Workflow tool (JS, `agent()`/`pipeline()`) for orchestration; per-saint profile files + schema from Plan 1.

---

## Prerequisite

**Plan 1 (profile storage foundation) must be merged first.** This plan writes
`src/lib/profiles/OS-####.ts` files in Plan 1's format and relies on its `status` gate,
`profile-types.ts`, and `validate_saint_profiles` build check. It implements spec
**§3 (pipeline), §4 (tiered fetch), §5 (coverage logging), §8 (authoring workflow)**.

## File structure

| File | Responsibility |
|---|---|
| `tools/__init__.py`, `tools/profilegen/__init__.py` (**new**) | Make `tools.profilegen` an importable package. |
| `tools/profilegen/prioritize.py` (**new**) | Rank profile-less saints by finder value; CLI prints the top-N IDs for a batch. |
| `tools/profilegen/dossier.py` (**new**) | Seed the dossier from the in-repo record (CSV row + existing profile) → JSON. |
| `tools/profilegen/facets.py` (**new**) | Additive, CRLF-safe, vocab-validated facet merge into one `saints.csv` row. |
| `tools/profilegen/emit.py` (**new**) | Write `src/lib/profiles/OS-####.ts` from a profile JSON (status/sources/generated). |
| `tools/profilegen/proposals.py` (**new**) | PD-gate a proposed quote/image row; append to a `dist/` proposals file (never the real CSV). |
| `tools/profilegen/coverage.py` (**new**) | Compute `full`/`thin`/`none` verdict; append to the batch coverage log; print a region summary. |
| `tools/profilegen/prompts/{gather,write,verify}.md` (**new**) | The agent stage prompts (the Write prompt derives from the user's ChatGPT prompt + spec §3.2). |
| `tools/profilegen/schemas.py` (**new**) | JSON Schemas: the `SaintProfile` write-output and the verifier `verdict`. Exposed as JSON for the workflow. |
| `scripts/profilegen.workflow.js` (**new**) | The Workflow orchestration: pipeline a batch through Gather→Write→Verify→Emit with per-stage models. |
| `tests/test_profilegen.py` (**new**) | Unit tests for every helper above. |
| `Makefile` (**modify**) | `make profile-batch` (prioritize) and helper passthroughs. |
| `CLAUDE.md` (**modify**) | Document the pipeline + the authoring loop. |

All `dist/` outputs are git-ignored (coverage log, proposals, verdicts) per CLAUDE.md.

---

## Task 1: Package scaffold

**Files:** Create `tools/__init__.py`, `tools/profilegen/__init__.py`

- [ ] **Step 1: Create the package markers**

```bash
touch tools/__init__.py tools/profilegen/__init__.py
mkdir -p tools/profilegen/prompts
```

Both `__init__.py` may be empty. (`tools/find_saint.py` stays a standalone script; making
`tools` a package does not affect it.)

- [ ] **Step 2: Verify import works**

Run: `python -c "import tools.profilegen; print('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add tools/__init__.py tools/profilegen/__init__.py
git commit -m "chore(profilegen): package scaffold"
```

---

## Task 2: Prioritize — rank profile-less saints by finder value

**Files:** Create `tools/profilegen/prioritize.py`; Test: `tests/test_profilegen.py`

Finder value scales with facet richness (spec §8.1). Score a saint by its filled finder
facets, weighting intercessions highest (the finder's engine, CLAUDE.md §1).

- [ ] **Step 1: Write the failing test**

Create `tests/test_profilegen.py`:

```python
import unittest
from tools.profilegen import prioritize


class FinderScoreTests(unittest.TestCase):
    def test_intercessions_weigh_most(self):
        row = {
            "Commonly Asked Intercessions": "Healing; Travelers",
            "Vocation": "Bishop",
            "Life Experience": "",
            "Virtue": "",
        }
        # 2 intercessions * 3 + 1 vocation * 1 = 7
        self.assertEqual(prioritize.finder_score(row), 7)

    def test_empty_row_scores_zero(self):
        row = {
            "Commonly Asked Intercessions": "",
            "Vocation": "",
            "Life Experience": "",
            "Virtue": "",
        }
        self.assertEqual(prioritize.finder_score(row), 0)
```

- [ ] **Step 2: Run it to confirm failure**

Run: `python -m unittest tests.test_profilegen -v`
Expected: FAIL — `ModuleNotFoundError`/`AttributeError: finder_score`.

- [ ] **Step 3: Implement**

Create `tools/profilegen/prioritize.py`:

```python
"""Rank saints that lack a rich profile by finder value, so a batch enriches the
highest-traffic patrons first (Grounded Generation spec §8.1)."""
import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SAINTS_CSV = ROOT / "data" / "saints.csv"
PROFILES_DIR = ROOT / "src" / "lib" / "profiles"

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
    return {p.stem for p in PROFILES_DIR.glob("OS-*.ts")}


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
```

- [ ] **Step 4: Run the test to confirm pass**

Run: `python -m unittest tests.test_profilegen -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify the CLI on real data**

Run: `python -m tools.profilegen.prioritize 10`
Expected: 10 `OS-####<TAB>score` lines, highest score first, none already profiled.

- [ ] **Step 6: Commit**

```bash
git add tools/profilegen/prioritize.py tests/test_profilegen.py
git commit -m "feat(profilegen): finder-value prioritization of profile-less saints"
```

---

## Task 3: Dossier — seed from the in-repo record

**Files:** Create `tools/profilegen/dossier.py`; Test: `tests/test_profilegen.py`

The dossier's first, trusted entry is the saint's own row (spec §3.1a). This helper emits
that baseline as JSON; the Gather agent appends external sources to it.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_profilegen.py`:

```python
from tools.profilegen import dossier


class DossierTests(unittest.TestCase):
    def test_baseline_from_row(self):
        row = {
            "Saint ID": "OS-0021",
            "Name": "Basil the Great",
            "Brief Life": "Archbishop of Caesarea.",
            "Notes": "",
            "Feast Day(s)": "Jan 1",
            "Region of Origin": "Cappadocia",
            "Sources": "OCA Synaxarion (oca.org)",
        }
        d = dossier.baseline(row)
        self.assertEqual(d["id"], "OS-0021")
        self.assertEqual(d["anchor"]["brief"], "Archbishop of Caesarea.")
        self.assertIn("OCA Synaxarion (oca.org)", d["anchor"]["sources"])
        self.assertEqual(d["external"], [])  # gather fills this
```

- [ ] **Step 2: Run to confirm failure**

Run: `python -m unittest tests.test_profilegen -k Dossier -v`
Expected: FAIL — no module/attr.

- [ ] **Step 3: Implement**

Create `tools/profilegen/dossier.py`:

```python
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
```

- [ ] **Step 4: Run to confirm pass**

Run: `python -m unittest tests.test_profilegen -k Dossier -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/profilegen/dossier.py tests/test_profilegen.py
git commit -m "feat(profilegen): seed dossier from the in-repo record (anchor baseline)"
```

---

## Task 4: Facets — additive, CRLF-safe, vocab-validated merge

**Files:** Create `tools/profilegen/facets.py`; Test: `tests/test_profilegen.py`

This is the correctness-critical helper. It edits **only the target row's cells**, leaving
every other line byte-for-byte intact (CLAUDE.md memory: preserve CRLF; edit field
substrings, not whole lines), and rejects any term not in `vocabulary.csv` for that column.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_profilegen.py`:

```python
import tempfile
from pathlib import Path as _P
from tools.profilegen import facets

HEADER = "Saint ID,Name,Vocation,Commonly Asked Intercessions,Sources\r\n"


class FacetMergeTests(unittest.TestCase):
    def _csv(self, body: str) -> _P:
        d = _P(tempfile.mkdtemp())
        p = d / "saints.csv"
        p.write_bytes((HEADER + body).encode("utf-8"))
        return p

    def test_appends_term_and_preserves_crlf(self):
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n")
        facets.merge(p, "OS-0001", {"Vocation": ["Missionary"]},
                     vocab={"Vocation": {"Bishop", "Missionary"}})
        raw = p.read_bytes()
        self.assertIn(b"Bishop; Missionary", raw)
        self.assertTrue(raw.endswith(b"\r\n"))
        self.assertEqual(raw.count(b"\r\n"), 2)  # header + 1 row, CRLF intact

    def test_quotes_field_when_value_gains_a_comma(self):
        # Intercessions has no comma yet; adding a term keeps "; " sep (no comma),
        # but a term containing a comma must force quoting of the whole field.
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n")
        facets.merge(p, "OS-0001",
                     {"Commonly Asked Intercessions": ["Travelers, sailors"]},
                     vocab={"Commonly Asked Intercessions":
                            {"Healing", "Travelers, sailors"}})
        raw = p.read_bytes().decode("utf-8")
        self.assertIn('"Healing; Travelers, sailors"', raw)

    def test_skips_duplicate_terms(self):
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n")
        facets.merge(p, "OS-0001", {"Vocation": ["Bishop"]},
                     vocab={"Vocation": {"Bishop"}})
        self.assertIn(b"Bishop\r\n".replace(b"Bishop", b"Bishop"),
                      p.read_bytes())  # unchanged; still single "Bishop"
        self.assertEqual(p.read_bytes().decode().count("Bishop"), 1)

    def test_rejects_unknown_vocab_term(self):
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n")
        with self.assertRaises(ValueError):
            facets.merge(p, "OS-0001", {"Vocation": ["Astronaut"]},
                         vocab={"Vocation": {"Bishop"}})

    def test_leaves_other_rows_byte_for_byte(self):
        p = self._csv("OS-0001,Anna,Bishop,Healing,OCA\r\n"
                      "OS-0002,Bob,Monk,Peace,OCA\r\n")
        facets.merge(p, "OS-0001", {"Vocation": ["Missionary"]},
                     vocab={"Vocation": {"Bishop", "Missionary"}})
        self.assertIn(b"OS-0002,Bob,Monk,Peace,OCA\r\n", p.read_bytes())
```

- [ ] **Step 2: Run to confirm failure**

Run: `python -m unittest tests.test_profilegen -k Facet -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `tools/profilegen/facets.py`:

```python
"""Additive controlled-vocab facet merge into ONE saints.csv row, editing only
that row's cells and preserving every other line byte-for-byte (CLAUDE.md: keep
CRLF, edit field substrings not whole lines)."""
import csv
import io
from pathlib import Path

MULTI_SEP = "; "


def load_vocab(vocab_csv: Path) -> dict[str, set[str]]:
    vocab: dict[str, set[str]] = {}
    with open(vocab_csv, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            vocab.setdefault(row["category"].strip(), set()).add(row["term"].strip())
    return vocab


def _serialize_row(cells: list[str]) -> str:
    buf = io.StringIO()
    csv.writer(buf, lineterminator="").writerow(cells)
    return buf.getvalue()


def merge(saints_csv: Path, sid: str, additions: dict[str, list[str]],
          vocab: dict[str, set[str]]) -> bool:
    """additions: {column: [terms]}. Returns True if the file changed. Raises
    ValueError on a term not in vocab[column]."""
    for col, terms in additions.items():
        for t in terms:
            if t not in vocab.get(col, set()):
                raise ValueError(f"{col!r}: {t!r} not in vocabulary")

    raw = saints_csv.read_bytes().decode("utf-8")
    # Keep line endings: split on \n but remember each line had \r\n.
    lines = raw.split("\n")
    header = next(l for l in lines if l.strip())
    cols = next(csv.reader([header.rstrip("\r")]))
    col_idx = {c: i for i, c in enumerate(cols)}

    changed = False
    for i, line in enumerate(lines):
        if not line.strip():
            continue
        had_cr = line.endswith("\r")
        body = line[:-1] if had_cr else line
        cells = next(csv.reader([body]))
        if cells[0].strip() != sid:
            continue
        for col, terms in additions.items():
            j = col_idx[col]
            existing = [x for x in cells[j].split(MULTI_SEP) if x.strip()]
            for t in terms:
                if t not in existing:
                    existing.append(t)
                    changed = True
            cells[j] = MULTI_SEP.join(existing)
        lines[i] = _serialize_row(cells) + ("\r" if had_cr else "")
        break

    if changed:
        saints_csv.write_bytes("\n".join(lines).encode("utf-8"))
    return changed
```

- [ ] **Step 4: Run to confirm pass**

Run: `python -m unittest tests.test_profilegen -k Facet -v`
Expected: PASS (5 tests).

- [ ] **Step 5: Confirm the real build still validates after a dry merge**

Run (no-op term on a real row, then validate, then `git checkout` to revert):

```bash
python -c "from pathlib import Path; from tools.profilegen import facets as F; v=F.load_vocab(Path('data/vocabulary.csv')); print('vocab cats', len(v))"
make validate
```

Expected: vocab loads; `make validate` CLEAN.

- [ ] **Step 6: Commit**

```bash
git add tools/profilegen/facets.py tests/test_profilegen.py
git commit -m "feat(profilegen): CRLF-safe, vocab-validated additive facet merge"
```

---

## Task 5: Emit — write a per-saint profile file

**Files:** Create `tools/profilegen/emit.py`; Test: `tests/test_profilegen.py`

Writes Plan 1's exact file format, defaulting `status: "draft"`, stamping `generated` from a
passed-in date (never `datetime.now()` inline — pass it, for reproducibility) and `sources`.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_profilegen.py`:

```python
import json as _json
from tools.profilegen import emit


class EmitTests(unittest.TestCase):
    def test_writes_ts_file_with_metadata(self):
        d = _P(tempfile.mkdtemp())
        profile = {"id": "OS-0042", "overview": ["A life."]}
        path = emit.write_profile(
            d, profile, sources=["https://oca.org/x"],
            generated="2026-06-17", status="draft",
        )
        self.assertEqual(path.name, "OS-0042.ts")
        text = path.read_text()
        self.assertIn('import type { SaintProfile } from "../profile-types";', text)
        self.assertIn("export default profile;", text)
        # The embedded object parses as JSON and carries the metadata.
        obj = _json.loads(text.split("=", 1)[1].rsplit(";", 2)[0].strip()
                          .removeprefix(": SaintProfile ").strip())
        self.assertEqual(obj["status"], "draft")
        self.assertEqual(obj["generated"], "2026-06-17")
        self.assertEqual(obj["sources"], ["https://oca.org/x"])

    def test_refuses_id_mismatch_filename(self):
        d = _P(tempfile.mkdtemp())
        with self.assertRaises(ValueError):
            emit.write_profile(d, {"id": "", "overview": ["x"]},
                               sources=["s"], generated="2026-06-17")
```

- [ ] **Step 2: Run to confirm failure**

Run: `python -m unittest tests.test_profilegen -k Emit -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `tools/profilegen/emit.py`:

```python
"""Write a per-saint profile file in Plan 1's format (src/lib/profiles/OS-####.ts)."""
import json
import re
from pathlib import Path

ID_RE = re.compile(r"^OS-\d{4,}$")
TEMPLATE = (
    'import type {{ SaintProfile }} from "../profile-types";\n\n'
    "const profile: SaintProfile = {body};\n\n"
    "export default profile;\n"
)


def write_profile(profiles_dir: Path, profile: dict, *, sources: list[str],
                  generated: str, status: str = "draft") -> Path:
    sid = (profile.get("id") or "").strip()
    if not ID_RE.match(sid):
        raise ValueError(f"profile id must be OS-####, got {sid!r}")
    full = {**profile, "status": status, "sources": sources, "generated": generated}
    body = json.dumps(full, ensure_ascii=False, indent=2)
    profiles_dir.mkdir(parents=True, exist_ok=True)
    path = profiles_dir / f"{sid}.ts"
    path.write_text(TEMPLATE.format(body=body), encoding="utf-8")
    return path
```

- [ ] **Step 4: Run to confirm pass**

Run: `python -m unittest tests.test_profilegen -k Emit -v`
Expected: PASS. (The test's JSON-extraction is loose; the authoritative check that the file
type-checks is `npm run build` after a real run.)

- [ ] **Step 5: Round-trip through Prettier + Vitest**

After emit writes a file in a real run, it must satisfy Plan 1's validators. Confirm the
format is compatible:

```bash
python -c "from pathlib import Path; from tools.profilegen import emit; emit.write_profile(Path('src/lib/profiles'), {'id':'OS-0021','overview':['t']}, sources=['s'], generated='2026-06-17', status='draft')"
npx prettier --write src/lib/profiles/OS-0021.ts
git checkout src/lib/profiles/OS-0021.ts   # revert the overwrite of real Basil
```

Expected: Prettier accepts the file; revert restores Basil.

- [ ] **Step 6: Commit**

```bash
git add tools/profilegen/emit.py tests/test_profilegen.py
git commit -m "feat(profilegen): emit per-saint profile .ts with status/sources/generated"
```

---

## Task 6: Proposals — PD-gate quote/image rows to dist/

**Files:** Create `tools/profilegen/proposals.py`; Test: `tests/test_profilegen.py`

The pipeline never writes `saint_quotes.csv` / `saint_images.csv` directly (spec §3.4). It
appends *proposals* to `dist/` files for human review, applying the same PD gates `build.py`
enforces so junk is dropped early.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_profilegen.py`:

```python
from tools.profilegen import proposals


class ProposalGateTests(unittest.TestCase):
    def test_accepts_pd_quote_translation(self):
        self.assertTrue(proposals.quote_ok({
            "translation": "NPNF2", "source_url": "https://ccel.org/x", "quote": "y"}))

    def test_rejects_modern_translation_quote(self):
        self.assertFalse(proposals.quote_ok({
            "translation": "SVS Press 1980", "source_url": "https://x", "quote": "y"}))

    def test_accepts_open_image_license(self):
        self.assertTrue(proposals.image_ok({
            "license": "PD-art", "source": "https://commons.wikimedia.org/x",
            "image_path": "icons/OS-0001.jpg"}))

    def test_rejects_unlicensed_image(self):
        self.assertFalse(proposals.image_ok({
            "license": "All rights reserved", "source": "https://x",
            "image_path": "icons/x.jpg"}))
```

- [ ] **Step 2: Run to confirm failure**

Run: `python -m unittest tests.test_profilegen -k Proposal -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `tools/profilegen/proposals.py`:

```python
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
```

(Note: keep `PD_QUOTE_RE` / `OPEN_LICENSE_RE` aligned with the live regexes in `build.py`;
if they drift, the human review and the build gate still backstop. A follow-up could import
them from `build.py` directly.)

- [ ] **Step 4: Run to confirm pass**

Run: `python -m unittest tests.test_profilegen -k Proposal -v`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/profilegen/proposals.py tests/test_profilegen.py
git commit -m "feat(profilegen): PD-gated quote/image proposals to dist/ for review"
```

---

## Task 7: Coverage — verdict + log + region summary

**Files:** Create `tools/profilegen/coverage.py`; Test: `tests/test_profilegen.py`

Implements the spec §5 source-logging rule: a per-saint `full`/`thin`/`none` verdict and a
git-ignored batch log, summarized by region so gaps direct the next source addition.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_profilegen.py`:

```python
from tools.profilegen import coverage


class CoverageVerdictTests(unittest.TestCase):
    def test_none_when_no_external_text(self):
        self.assertEqual(coverage.verdict(dossier_chars=120, external_sources=0), "none")

    def test_thin_when_little_external(self):
        self.assertEqual(coverage.verdict(dossier_chars=300, external_sources=1), "thin")

    def test_full_when_rich(self):
        self.assertEqual(
            coverage.verdict(dossier_chars=4000, external_sources=3), "full")
```

- [ ] **Step 2: Run to confirm failure**

Run: `python -m unittest tests.test_profilegen -k Coverage -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `tools/profilegen/coverage.py`:

```python
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
```

- [ ] **Step 4: Run to confirm pass**

Run: `python -m unittest tests.test_profilegen -k Coverage -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/profilegen/coverage.py tests/test_profilegen.py
git commit -m "feat(profilegen): coverage verdict, batch log, region-grouped gap summary"
```

---

## Task 8: Agent stage contracts (prompts + schemas)

**Files:** Create `tools/profilegen/prompts/{gather,write,verify}.md`, `tools/profilegen/schemas.py`

These define what each agent receives and must return. The Write prompt is the spec's
adaptation of the user's ChatGPT enrichment prompt (the §12 coverage table is the section map).

- [ ] **Step 1: Write the schemas**

Create `tools/profilegen/schemas.py`:

```python
"""JSON Schemas for the Write output (a SaintProfile) and the Verify verdict.
Exposed as JSON so the Workflow can pass them to agent({schema})."""
import json

PROFILE_SCHEMA = {
    "type": "object",
    "required": ["id", "overview"],
    "properties": {
        "id": {"type": "string", "pattern": r"^OS-\d{4,}$"},
        "lifespan": {"type": "string"},
        "overview": {"type": "array", "items": {"type": "string"}, "minItems": 1},
        "timeline": {"type": "array", "items": {
            "type": "object", "required": ["when", "title", "body"],
            "properties": {"when": {"type": "string"}, "title": {"type": "string"},
                           "body": {"type": "string"}}}},
        "sections": {"type": "array", "items": {
            "type": "object", "required": ["heading", "body"],
            "properties": {"heading": {"type": "string"},
                           "body": {"type": "array", "items": {"type": "string"}}}}},
        "patronage": {"type": "array", "items": {"type": "string"}},
        # family/related/works/reading omitted here for brevity — add as needed,
        # matching src/lib/profile-types.ts exactly.
    },
}

VERDICT_SCHEMA = {
    "type": "object",
    "required": ["status", "claims"],
    "properties": {
        "status": {"enum": ["pass", "flagged"]},
        "claims": {"type": "array", "items": {
            "type": "object",
            "required": ["claim", "supported", "reason"],
            "properties": {"claim": {"type": "string"},
                           "supported": {"type": "boolean"},
                           "reason": {"type": "string"}}}},
    },
}

if __name__ == "__main__":
    print(json.dumps({"profile": PROFILE_SCHEMA, "verdict": VERDICT_SCHEMA}))
```

- [ ] **Step 2: Write the Gather prompt**

Create `tools/profilegen/prompts/gather.md`:

```markdown
You are the GATHER stage of the saint-profile pipeline. Input: a baseline dossier
(JSON) seeded from the saint's own in-repo record (the trusted anchor).

Goal: append external source material to `external[]`, each item `{text, source}`
where `text` is a faithful factual extract (NOT copied prose to publish) and
`source` is the URL.

Fetch in tier order (spec §4), stopping when you have enough for a full profile:
0. (already in the dossier) the OCA-anchor row — do NOT re-fetch the live page.
1. Prologue of Ohrid, Mystagogy/Sanidopoulos, OrthoChristian, OrthodoxWiki, Wikipedia.
2. By region/tradition: GOARCH/Saint.gr (Greek), Romanian cluster, Butler's (Western, PD),
   glorification acts (modern).
3. New Advent (PD) / scholarly, for cross-check.
NEVER fetch Oriental Orthodox sources (out of scope, spec §4).

Return the dossier with `external[]` filled and a one-line note of which tiers hit.
```

- [ ] **Step 3: Write the Write prompt**

Create `tools/profilegen/prompts/write.md`:

```markdown
You are the WRITE stage. Input: the full dossier (anchor + external). Produce a
SaintProfile JSON (schema provided) in factual, encyclopedic house voice — NO
devotional language, NO prayers, original wording (never copy a source).

Section map (the user's enrichment prompt → fields): biography→overview;
historical context / contributions / legacy→sections; timeline→timeline;
family & related→family/related; patronage→patronage; works→works; further
reading→reading; relics & shrines→a sections entry titled "Relics & Shrines";
miracles & traditions→a sections entry split into "Historically Documented" and
"Traditional Accounts".

HARD RULES:
- Every concrete claim must trace to the dossier. If the dossier is thin, WRITE
  LESS. Never invent a miracle, date, or relationship.
- Surface relatable human detail ONLY where a source carries it; hedge as tradition
  ("by tradition…", "the synaxarion relates…") where the source hedges.
- Indicate genuine, source-grounded uncertainty; never manufacture uncertainty.
- The anchor row WINS on any conflict with an external source.
```

- [ ] **Step 4: Write the Verify prompt**

Create `tools/profilegen/prompts/verify.md`:

```markdown
You are the VERIFY stage — an adversarial checker. Input: the written SaintProfile
+ the dossier. Your job is to REFUTE; default to flagging when uncertain.

For each concrete claim, decide `supported` (true/false) against:
(a) the anchor row — if the profile contradicts it, the claim is UNSUPPORTED
    (the row wins);
(b) the dossier external items.

Flag hedging that has NO grounding in the dossier (invented uncertainty used to
smuggle a narrative). Do NOT flag genuine, source-grounded uncertainty.

Return {status, claims[]}: status="flagged" if any concrete claim is unsupported,
else "pass". Each claims[] item: {claim, supported, reason}.
```

- [ ] **Step 5: Verify schemas emit valid JSON**

Run: `python -m tools.profilegen.schemas | python -m json.tool > /dev/null && echo ok`
Expected: `ok`.

- [ ] **Step 6: Commit**

```bash
git add tools/profilegen/prompts tools/profilegen/schemas.py
git commit -m "feat(profilegen): agent stage prompts (gather/write/verify) + JSON schemas"
```

---

## Task 9: Workflow orchestration

**Files:** Create `scripts/profilegen.workflow.js`

Ties the stages together: pipeline a batch through Gather→Write→Verify→Emit with per-stage
models (spec §3 tiering). The agents call the Python helpers via Bash for repo-touching steps.

- [ ] **Step 1: Write the workflow script**

Create `scripts/profilegen.workflow.js` (run via the Workflow tool: `Workflow({scriptPath:
"scripts/profilegen.workflow.js", args: ["OS-0042", "OS-0099", ...]})`):

```js
export const meta = {
  name: "profilegen",
  description: "Grounded saint-profile generation: gather → write → verify → emit",
  phases: [
    { title: "Gather", detail: "fetch sources into a cited dossier", model: "haiku" },
    { title: "Write", detail: "original encyclopedic profile", model: "opus" },
    { title: "Verify", detail: "adversarial check vs the anchor row", model: "sonnet" },
    { title: "Emit", detail: "write draft/flagged file + proposals", model: "haiku" },
  ],
};

const ids = args; // array of Saint IDs (from `make profile-batch`)
const GENERATED = "PASS_THE_DATE_IN"; // set by the caller; scripts can't read the clock

const results = await pipeline(
  ids,
  // Gather (Haiku): seed from the record, then fetch external sources.
  (id) => agent(
    `Read tools/profilegen/prompts/gather.md. Seed the dossier with:\n` +
    `  python -m tools.profilegen.dossier ${id}\n` +
    `Then fetch external sources per the tiers and return the completed dossier JSON.`,
    { label: `gather:${id}`, phase: "Gather", model: "haiku" }),

  // Write (Opus): produce the SaintProfile JSON.
  (dossier, id) => agent(
    `Read tools/profilegen/prompts/write.md and tools/profilegen/schemas.py ` +
    `(PROFILE_SCHEMA). Using ONLY this dossier, write the profile:\n${dossier}`,
    { label: `write:${id}`, phase: "Write", model: "opus",
      schema: PROFILE_SCHEMA_JSON }),

  // Verify (Sonnet): adversarial check.
  (profile, id) => agent(
    `Read tools/profilegen/prompts/verify.md. Verify this profile against its ` +
    `dossier/anchor and return {status, claims}:\n${JSON.stringify(profile)}`,
    { label: `verify:${id}`, phase: "Verify", model: "sonnet",
      schema: VERDICT_SCHEMA_JSON })
    .then((verdict) => ({ id, profile, verdict })),

  // Emit (Haiku/code): write the file + log coverage + proposals.
  ({ id, profile, verdict }) => agent(
    `Write the profile for ${id}. Status is "${verdict.status === "pass"
      ? "draft" : "flagged"}". Run:\n` +
    `  python -c "from pathlib import Path; from tools.profilegen import emit; ` +
    `emit.write_profile(Path('src/lib/profiles'), ${JSON.stringify(profile)}, ` +
    `sources=${JSON.stringify(profile.sources || [])}, generated='${GENERATED}', ` +
    `status='${verdict.status === "pass" ? "draft" : "flagged"}')"\n` +
    `Then prettier --write the file; append a coverage row (tools.profilegen.coverage) ` +
    `and any PD-gated quote/image proposals (tools.profilegen.proposals) to dist/; and ` +
    `append this saint's verdict {id, status, claims} to ` +
    `dist/profilegen_${GENERATED}_verdicts.json (a JSON array — Plan 3 reads it).`,
    { label: `emit:${id}`, phase: "Emit", model: "haiku" }),
);

log(`Generated ${results.filter(Boolean).length}/${ids.length} profiles.`);
return results.filter(Boolean);
```

(`PROFILE_SCHEMA_JSON` / `VERDICT_SCHEMA_JSON`: paste the JSON from
`python -m tools.profilegen.schemas` into consts at the top of the script, or have the
Gather/Write agents read `schemas.py`. The literal `GENERATED` date is passed by the operator
because workflow scripts cannot read the clock.)

- [ ] **Step 2: Lint the script**

Run: `npx prettier --check scripts/profilegen.workflow.js || npx prettier --write scripts/profilegen.workflow.js`
Expected: formatted, no syntax errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/profilegen.workflow.js
git commit -m "feat(profilegen): Workflow orchestration with per-stage model tiering"
```

---

## Task 10: Calibration batch (acceptance gate)

**Files:** none (an acceptance procedure; produces draft files + a coverage log)

The agent stages can't be unit-tested; this is the spec §3 calibration gate. **Run on a
branch off fresh `main`** (memory: branch each batch separately).

- [ ] **Step 1: Pick a 15-saint batch**

Run: `make profile-batch N=15` (added in Task 11), which prints 15 high-finder-value IDs.

- [ ] **Step 2: Run the pipeline**

Invoke the workflow with those IDs and today's date as `GENERATED`. (Requires Workflow
opt-in.) It writes `src/lib/profiles/OS-####.ts` as `draft`/`flagged`, plus
`dist/profilegen_<date>.csv` (coverage) and any `dist/*_proposals.csv`.

- [ ] **Step 3: Validate the machine output**

Run:

```bash
make validate                 # build.py: filenames name real saints
npm run test:unit             # vitest: status/sources/overview/id↔filename
PUBLIC_SHOW_DRAFTS=true npm run build   # drafts render; production build excludes them
python -m tools.profilegen.coverage dist/profilegen_<date>.csv   # gap summary
```

Expected: all green; the coverage summary lists any thin/none saints.

- [ ] **Step 4: Human review (the real gate)**

Review the 15 drafts (Plan 3's review sheet makes this readable). For each: prose quality,
voice, and — critically — spot-check 2–3 concrete claims per profile against the cited
sources. Note the **flag rate** and any fabrication the verifier missed.

- [ ] **Step 5: Decide**

- If quality holds: promote good profiles to `status: "reviewed"`, fix/reject `flagged`,
  open the batch PR.
- If voice drifts or hedging is weak: the model tiering is per-batch config — record the
  finding; do not scale up until a clean calibration batch passes.

- [ ] **Step 6: Commit (only reviewed-promoted profiles + accepted facet merges)**

```bash
git add src/lib/profiles data/saints.csv
git commit -m "data: grounded profiles — calibration batch (OS-#### …)"
```

---

## Task 11: Make targets + docs

**Files:** Modify `Makefile`, `CLAUDE.md`

- [ ] **Step 1: Add make targets**

In `Makefile`, add:

```make
profile-batch: ## print N high-value profile-less saint IDs (N=15 default)
	python -m tools.profilegen.prioritize $(or $(N),15)

profile-coverage: ## summarize coverage gaps from a batch log (LOG=dist/...csv)
	python -m tools.profilegen.coverage $(LOG)
```

- [ ] **Step 2: Document the pipeline**

In `CLAUDE.md` §8 (authoring aids), add a short paragraph: the `tools/profilegen/` pipeline,
the per-stage models (Haiku/Opus/Sonnet/Haiku), `make profile-batch`, drafts land
`status: draft` and need human promotion to `reviewed`, coverage gaps drive new sources (§5),
and the Workflow requires explicit opt-in.

- [ ] **Step 3: Full suite green**

Run: `make test && python -m unittest tests.test_profilegen && make validate`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add Makefile CLAUDE.md
git commit -m "feat(profilegen): make targets + docs for the generation pipeline"
```

---

## Self-review notes (spec coverage)

- **§3 pipeline (gather/write/verify/emit, per-stage models):** Tasks 3–9. ✅
- **§3.1a dossier from in-repo record:** Task 3. ✅
- **§3.3 anchor-wins + grounded-vs-fabricated uncertainty:** Task 8 verify prompt + Task 10
  review. ✅
- **§3.4 facet enrichment + propose-only PD quote/image:** Tasks 4, 6. ✅
- **§4 tiered fetch + no Oriental sources:** Task 8 gather prompt. ✅
- **§5 coverage log + region summary:** Task 7. ✅
- **§8 authoring workflow (prioritize, batch, review, branch-per-batch):** Tasks 2, 10, 11. ✅
- **Guardrails are code:** facet vocab gate (Task 4), PD gate (Task 6), Plan 1 status gate +
  build validation — independent of the Write model. ✅

## Hand-off to Plan 3

Plan 3 (review sheet) reads this pipeline's `dist/` outputs — the coverage log
(`profilegen_<date>.csv`) and the per-profile verifier verdicts. **Add to Emit (Task 9):
also persist each verdict to `dist/profilegen_<date>_verdicts.json`** so Plan 3 can render
flags without re-running Verify.
