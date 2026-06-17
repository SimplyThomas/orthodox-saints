# Profile Review Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a generated batch into a single reviewer-facing view that shows, per profile, the prose, the verifier's flags, the coverage verdict, and per-claim sources — so reviewing draft profiles is low-friction without reading raw `.ts`, and without a live page (which hides exactly that safety information).

**Architecture:** A unit-tested Python module `tools/profilegen/review_sheet.py` loads a batch from the pipeline's `dist/` outputs (coverage log + verifier verdicts + the per-saint draft profile files) and renders two artifacts from pure functions: a **Markdown** summary (for the PR description / Actions job summary — the channel that already carries the finder-coverage report) and a **self-contained HTML** file (`dist/profile_review_<batch>.html`) with flagged claims highlighted and sources linked. No new infrastructure (spec §13; decision §10.6 = review-sheet only).

**Tech Stack:** Python 3.11 (`csv`, `json`, `html`, `unittest`); reads Plan 1's profile files and Plan 2's `dist/` outputs.

---

## Prerequisite

**Plans 1 and 2 merged first.** This plan reads:
- `src/lib/profiles/OS-####.ts` — draft profiles (Plan 1 format).
- `dist/profilegen_<batch>.csv` — coverage log (Plan 2, Task 7).
- `dist/profilegen_<batch>_verdicts.json` — a JSON array of `{id, status, claims:[{claim,
  supported, reason}]}` (Plan 2, Task 9 Emit must persist this — see Plan 2 hand-off note).

It implements spec **§13 (review tooling)**.

## File structure

| File | Responsibility |
|---|---|
| `tools/profilegen/review_sheet.py` (**new**) | Load a batch; pure `render_markdown(batch)` and `render_html(batch)`; CLI writes both artifacts. |
| `tools/profilegen/profile_read.py` (**new**) | Read a profile `.ts` file's embedded JSON object back into a dict (the `overview`, `sections`, `sources`, `status`). |
| `tests/test_review_sheet.py` (**new**) | Unit tests for the readers and both renderers. |
| `Makefile` (**modify**) | `make profile-review` target. |

`dist/profile_review_<batch>.html` and `.md` are git-ignored outputs.

---

## Task 1: Read a profile file back to a dict

**Files:** Create `tools/profilegen/profile_read.py`; Test: `tests/test_review_sheet.py`

The emit format is `const profile: SaintProfile = <JSON>;`. Recover the `<JSON>` and parse it.

- [ ] **Step 1: Write the failing test**

Create `tests/test_review_sheet.py`:

```python
import json
import tempfile
import unittest
from pathlib import Path

from tools.profilegen import profile_read


class ProfileReadTests(unittest.TestCase):
    def _write(self, obj: dict) -> Path:
        d = Path(tempfile.mkdtemp())
        p = d / f"{obj['id']}.ts"
        body = json.dumps(obj, ensure_ascii=False, indent=2)
        p.write_text(
            'import type { SaintProfile } from "../profile-types";\n\n'
            f"const profile: SaintProfile = {body};\n\nexport default profile;\n"
        )
        return p

    def test_round_trips_object(self):
        obj = {"id": "OS-0042", "overview": ["A life."], "status": "draft",
               "sources": ["https://oca.org/x"]}
        p = self._write(obj)
        got = profile_read.read(p)
        self.assertEqual(got["id"], "OS-0042")
        self.assertEqual(got["status"], "draft")
        self.assertEqual(got["sources"], ["https://oca.org/x"])
```

- [ ] **Step 2: Run to confirm failure**

Run: `python -m unittest tests.test_review_sheet -v`
Expected: FAIL — no module.

- [ ] **Step 3: Implement**

Create `tools/profilegen/profile_read.py`:

```python
"""Read a per-saint profile .ts file's embedded JSON object back to a dict."""
import json
from pathlib import Path

PREFIX = "const profile: SaintProfile ="
SUFFIX = "export default profile;"


def read(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    start = text.index(PREFIX) + len(PREFIX)
    end = text.index(SUFFIX, start)
    blob = text[start:end].strip().rstrip(";").strip()
    return json.loads(blob)
```

- [ ] **Step 4: Run to confirm pass**

Run: `python -m unittest tests.test_review_sheet -v`
Expected: PASS.

- [ ] **Step 5: Verify against a real emitted file** (after Plan 2 exists)

Run: `python -c "from pathlib import Path; from tools.profilegen import profile_read; print(profile_read.read(Path('src/lib/profiles/OS-0021.ts'))['id'])"`
Expected: `OS-0021`.

- [ ] **Step 6: Commit**

```bash
git add tools/profilegen/profile_read.py tests/test_review_sheet.py
git commit -m "feat(review): read a profile .ts file back to a dict"
```

---

## Task 2: Load a batch

**Files:** Modify `tools/profilegen/review_sheet.py` (create); Test: `tests/test_review_sheet.py`

A batch joins coverage rows + verdicts + profiles by Saint ID into a list of records.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_review_sheet.py`:

```python
from tools.profilegen import review_sheet


class LoadBatchTests(unittest.TestCase):
    def test_joins_by_id(self):
        d = Path(tempfile.mkdtemp())
        (d / "coverage.csv").write_text(
            "saint_id,name,region,external_sources,dossier_chars,verdict\r\n"
            "OS-0042,Anna,Cappadocia,2,1800,full\r\n")
        (d / "verdicts.json").write_text(json.dumps([
            {"id": "OS-0042", "status": "flagged",
             "claims": [{"claim": "Born 300", "supported": False,
                         "reason": "no source"}]}]))
        profiles = d / "profiles"
        profiles.mkdir()
        (profiles / "OS-0042.ts").write_text(
            'const profile: SaintProfile = '
            + json.dumps({"id": "OS-0042", "overview": ["A life."],
                          "status": "flagged", "sources": ["https://oca.org/x"]})
            + ";\nexport default profile;\n")
        batch = review_sheet.load_batch(
            d / "coverage.csv", d / "verdicts.json", profiles)
        self.assertEqual(len(batch), 1)
        rec = batch[0]
        self.assertEqual(rec["id"], "OS-0042")
        self.assertEqual(rec["verdict"], "full")
        self.assertEqual(rec["status"], "flagged")
        self.assertEqual(len(rec["flags"]), 1)
        self.assertEqual(rec["profile"]["overview"], ["A life."])
```

- [ ] **Step 2: Run to confirm failure**

Run: `python -m unittest tests.test_review_sheet -k Load -v`
Expected: FAIL.

- [ ] **Step 3: Implement (create the module with `load_batch`)**

Create `tools/profilegen/review_sheet.py`:

```python
"""Render a generated batch into a reviewer-facing Markdown summary and a
self-contained HTML sheet (Grounded Generation spec §13)."""
import csv
import html
import json
import sys
from pathlib import Path

from tools.profilegen import profile_read


def load_batch(coverage_csv: Path, verdicts_json: Path, profiles_dir: Path) -> list[dict]:
    coverage = {}
    with open(coverage_csv, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            coverage[row["saint_id"]] = row
    verdicts = {v["id"]: v for v in json.loads(verdicts_json.read_text())}
    batch = []
    for sid, cov in coverage.items():
        prof_path = profiles_dir / f"{sid}.ts"
        profile = profile_read.read(prof_path) if prof_path.exists() else None
        verdict = verdicts.get(sid, {})
        flags = [c for c in verdict.get("claims", []) if not c.get("supported", True)]
        batch.append({
            "id": sid,
            "name": cov.get("name", ""),
            "region": cov.get("region", ""),
            "verdict": cov.get("verdict", ""),
            "status": (profile or {}).get("status", verdict.get("status", "")),
            "flags": flags,
            "profile": profile,
        })
    batch.sort(key=lambda r: (r["status"] != "flagged", r["id"]))  # flagged first
    return batch
```

- [ ] **Step 4: Run to confirm pass**

Run: `python -m unittest tests.test_review_sheet -k Load -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/profilegen/review_sheet.py tests/test_review_sheet.py
git commit -m "feat(review): load a batch joining coverage + verdicts + profiles"
```

---

## Task 3: Markdown renderer

**Files:** Modify `tools/profilegen/review_sheet.py`; Test: `tests/test_review_sheet.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_review_sheet.py`:

```python
class MarkdownTests(unittest.TestCase):
    def _batch(self):
        return [{
            "id": "OS-0042", "name": "Anna", "region": "Cappadocia",
            "verdict": "full", "status": "flagged",
            "flags": [{"claim": "Born 300", "supported": False, "reason": "no source"}],
            "profile": {"overview": ["A short life."],
                        "sources": ["https://oca.org/x"]},
        }]

    def test_markdown_has_summary_and_flags(self):
        md = review_sheet.render_markdown(self._batch())
        self.assertIn("OS-0042", md)
        self.assertIn("flagged", md)
        self.assertIn("Born 300", md)            # the flagged claim
        self.assertIn("https://oca.org/x", md)   # the source
        self.assertIn("A short life.", md)       # the prose

    def test_markdown_summary_counts(self):
        md = review_sheet.render_markdown(self._batch())
        self.assertIn("1 profile", md)           # batch size
        self.assertIn("1 flagged", md)
```

- [ ] **Step 2: Run to confirm failure**

Run: `python -m unittest tests.test_review_sheet -k Markdown -v`
Expected: FAIL — no `render_markdown`.

- [ ] **Step 3: Implement**

Append to `tools/profilegen/review_sheet.py`:

```python
def render_markdown(batch: list[dict]) -> str:
    n = len(batch)
    flagged = sum(1 for r in batch if r["status"] == "flagged")
    out = [f"## Profile review — {n} profile{'s' if n != 1 else ''}, "
           f"{flagged} flagged\n"]
    out.append("| Saint | Verdict | Status | Flags |")
    out.append("|---|---|---|---|")
    for r in batch:
        out.append(f"| {r['id']} {r['name']} | {r['verdict']} | {r['status']} "
                   f"| {len(r['flags'])} |")
    out.append("")
    for r in batch:
        out.append(f"### {r['id']} — {r['name']}  ·  {r['status']} / {r['verdict']}")
        if r["flags"]:
            out.append("**Verifier flags (resolve before promoting):**")
            for c in r["flags"]:
                out.append(f"- ⚠️ {c['claim']} — _{c['reason']}_")
        prof = r["profile"] or {}
        for para in prof.get("overview", []):
            out.append(f"\n{para}")
        srcs = prof.get("sources", [])
        if srcs:
            out.append("\n**Sources:** " + ", ".join(srcs))
        out.append("\n---")
    return "\n".join(out) + "\n"
```

- [ ] **Step 4: Run to confirm pass**

Run: `python -m unittest tests.test_review_sheet -k Markdown -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/profilegen/review_sheet.py tests/test_review_sheet.py
git commit -m "feat(review): markdown renderer (summary + per-profile prose/flags/sources)"
```

---

## Task 4: HTML renderer

**Files:** Modify `tools/profilegen/review_sheet.py`; Test: `tests/test_review_sheet.py`

A self-contained HTML file (inline CSS) with flagged claims highlighted and sources linked.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_review_sheet.py`:

```python
class HtmlTests(unittest.TestCase):
    def _batch(self):
        return [{
            "id": "OS-0042", "name": "Anna <test>", "region": "Cappadocia",
            "verdict": "full", "status": "flagged",
            "flags": [{"claim": "Born 300", "supported": False, "reason": "no source"}],
            "profile": {"overview": ["A short life."],
                        "sections": [{"heading": "Legacy", "body": ["Big."]}],
                        "sources": ["https://oca.org/x"]},
        }]

    def test_html_is_self_contained_and_escaped(self):
        doc = review_sheet.render_html(self._batch())
        self.assertTrue(doc.lstrip().startswith("<!doctype html>"))
        self.assertIn("<style>", doc)                     # inline CSS, no external dep
        self.assertIn("Anna &lt;test&gt;", doc)           # HTML-escaped name
        self.assertIn("Born 300", doc)                    # flag shown
        self.assertIn('href="https://oca.org/x"', doc)    # source linked
        self.assertIn("Legacy", doc)                      # section heading rendered

    def test_html_marks_flagged_rows(self):
        doc = review_sheet.render_html(self._batch())
        self.assertIn('class="flagged"', doc)
```

- [ ] **Step 2: Run to confirm failure**

Run: `python -m unittest tests.test_review_sheet -k Html -v`
Expected: FAIL — no `render_html`.

- [ ] **Step 3: Implement**

Append to `tools/profilegen/review_sheet.py`:

```python
_CSS = """
body{font:16px/1.6 Georgia,serif;max-width:52rem;margin:2rem auto;padding:0 1rem;color:#222}
h1{font-size:1.4rem} h2{font-size:1.15rem;margin-top:2rem;border-bottom:1px solid #ddd}
.meta{color:#666;font-size:.85rem} .flagged h2{color:#a00}
.flags{background:#fdeaea;border-left:3px solid #a00;padding:.5rem .75rem;margin:.5rem 0}
.sources{color:#555;font-size:.85rem;margin-top:.5rem}
""".strip()


def _e(s: str) -> str:
    return html.escape(s or "")


def render_html(batch: list[dict]) -> str:
    n = len(batch)
    flagged = sum(1 for r in batch if r["status"] == "flagged")
    parts = ["<!doctype html>", '<html lang="en"><head><meta charset="utf-8">',
             f"<title>Profile review ({n})</title>", f"<style>{_CSS}</style>",
             "</head><body>",
             f"<h1>Profile review — {n} profile(s), {flagged} flagged</h1>"]
    for r in batch:
        cls = "flagged" if r["status"] == "flagged" else ""
        parts.append(f'<section class="{cls}">')
        parts.append(f"<h2>{_e(r['id'])} — {_e(r['name'])}</h2>")
        parts.append(f'<p class="meta">{_e(r["status"])} · {_e(r["verdict"])} '
                     f'· {_e(r["region"])}</p>')
        if r["flags"]:
            parts.append('<div class="flags"><strong>Verifier flags:</strong><ul>')
            for c in r["flags"]:
                parts.append(f"<li>{_e(c['claim'])} — <em>{_e(c['reason'])}</em></li>")
            parts.append("</ul></div>")
        prof = r["profile"] or {}
        for para in prof.get("overview", []):
            parts.append(f"<p>{_e(para)}</p>")
        for sec in prof.get("sections", []):
            parts.append(f"<h3>{_e(sec['heading'])}</h3>")
            for para in sec.get("body", []):
                parts.append(f"<p>{_e(para)}</p>")
        srcs = prof.get("sources", [])
        if srcs:
            links = ", ".join(f'<a href="{_e(s)}">{_e(s)}</a>' for s in srcs)
            parts.append(f'<p class="sources">Sources: {links}</p>')
        parts.append("</section>")
    parts.append("</body></html>")
    return "\n".join(parts) + "\n"
```

- [ ] **Step 4: Run to confirm pass**

Run: `python -m unittest tests.test_review_sheet -k Html -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/profilegen/review_sheet.py tests/test_review_sheet.py
git commit -m "feat(review): self-contained HTML renderer with flag highlighting"
```

---

## Task 5: CLI + job-summary output

**Files:** Modify `tools/profilegen/review_sheet.py`

- [ ] **Step 1: Add the CLI**

Append to `tools/profilegen/review_sheet.py`:

```python
def main(argv: list[str]) -> int:
    cov, verd, profiles_dir, out_html = (Path(argv[1]), Path(argv[2]),
                                         Path(argv[3]), Path(argv[4]))
    batch = load_batch(cov, verd, profiles_dir)
    out_html.write_text(render_html(batch), encoding="utf-8")
    md = render_markdown(batch)
    # If running under GitHub Actions, append to the job summary; else stdout.
    import os
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(md)
    else:
        sys.stdout.write(md)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
```

- [ ] **Step 2: Smoke-test the CLI on fixtures**

Run (reuse the Task 2 fixture shape in a temp dir, then):

```bash
python - <<'PY'
import json, tempfile, subprocess, sys
from pathlib import Path
d = Path(tempfile.mkdtemp())
(d/"coverage.csv").write_text("saint_id,name,region,external_sources,dossier_chars,verdict\r\nOS-0042,Anna,Cappadocia,2,1800,full\r\n")
(d/"verdicts.json").write_text(json.dumps([{"id":"OS-0042","status":"draft","claims":[]}]))
pr=d/"profiles"; pr.mkdir()
(pr/"OS-0042.ts").write_text('const profile: SaintProfile = '+json.dumps({"id":"OS-0042","overview":["A life."],"status":"draft","sources":["https://oca.org/x"]})+';\nexport default profile;\n')
out=d/"review.html"
subprocess.run([sys.executable,"-m","tools.profilegen.review_sheet",str(d/"coverage.csv"),str(d/"verdicts.json"),str(pr),str(out)],check=True)
print("html bytes:", out.stat().st_size)
PY
```

Expected: prints the Markdown to stdout and reports a non-zero HTML size.

- [ ] **Step 3: Commit**

```bash
git add tools/profilegen/review_sheet.py
git commit -m "feat(review): CLI writes HTML + markdown (job summary when in CI)"
```

---

## Task 6: Make target + docs

**Files:** Modify `Makefile`, `CLAUDE.md`

- [ ] **Step 1: Add the make target**

In `Makefile`, add:

```make
profile-review: ## render a batch review sheet (DATE=YYYY-MM-DD of the batch run)
	python -m tools.profilegen.review_sheet \
	  dist/profilegen_$(DATE).csv dist/profilegen_$(DATE)_verdicts.json \
	  src/lib/profiles dist/profile_review_$(DATE).html
```

- [ ] **Step 2: Document the review loop**

In `CLAUDE.md` §8, extend the pipeline note: after a batch run,
`make profile-review DATE=<date>` writes `dist/profile_review_<date>.html` and prints a
Markdown summary (paste into the PR description; in CI it lands in the job summary). Review
prose + spot-check flagged claims against sources before promoting drafts to `reviewed`.

- [ ] **Step 3: Full suite green**

Run: `python -m unittest tests.test_review_sheet && python -m unittest tests.test_profilegen && make validate`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add Makefile CLAUDE.md
git commit -m "feat(review): make profile-review target + docs for the review loop"
```

---

## Self-review notes (spec coverage)

- **§13 review sheet (markdown + HTML, prose + flags + verdict + per-claim sources):**
  Tasks 2–4. ✅
- **§13 job-summary channel (same as finder-coverage report):** Task 5. ✅
- **§13 "no new infra":** pure Python + a make target; no preview host. ✅
- **Reviewer affordance the live page can't give (verifier flags/provenance):** Tasks 3–4
  surface flags and sources that production pages omit. ✅

## Dependency reminder

Plan 2's Emit (Task 9) must persist `dist/profilegen_<date>_verdicts.json` as
`[{id, status, claims:[{claim, supported, reason}]}]` for this plan to render flags. If that
file is absent, `load_batch` still renders prose + coverage (flags simply empty).
