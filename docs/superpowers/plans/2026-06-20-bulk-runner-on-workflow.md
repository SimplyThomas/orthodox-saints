# Bulk Runner on the Per-Stage Workflow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the unattended overnight runner (`tools/profilegen/run.py`) generate profiles through the per-stage Workflow (Gather=Sonnet, Write=Opus, Verify=Sonnet, Emit=Haiku) instead of a single all-Opus `claude -p` agent, while preserving its resumable rate-limit/weekly-cap back-off semantics.

**Architecture:** Add an opt-in flag (`PROFILEGEN_USE_WORKFLOW`) that switches the runner's per-batch call from the legacy "do it yourself" prompt to one that invokes the existing `scripts/profilegen.workflow.js` via the Workflow tool, passing the batch as `{ids, date}` args. Because a Workflow swallows mid-run rate limits into per-saint `null`s (silently skipped saints) rather than surfacing a top-level `rate_limit_error`, the runner gains a deterministic **profiles-on-disk** outcome check: a clean exit that emitted **zero** profiles is treated as a soft rate-limit signal and routed into the existing wait/weekly-cap machinery; a **partial** batch is accepted and its stragglers are picked up on the next resume (the Workflow is re-driven only over IDs still missing a profile file).

**Tech Stack:** Python 3.11+ (stdlib `subprocess`, `json`, `pathlib`), `unittest` + `unittest.mock` for tests, the Claude Code Workflow tool invoked headlessly via `claude -p`.

---

## Background an implementer needs

- **Two emit paths exist today.** `scripts/profilegen.workflow.js` is the per-stage Workflow (already used for calibration; it even runs `prettier --write` itself). `tools/profilegen/run.py` is the unattended runner; it fires `claude -p --model claude-opus-4-8` at a 40-ID batch and the Opus agent improvises general-purpose subagents that all inherit Opus. This plan bridges the runner onto the Workflow.
- **The Workflow's args contract** (`scripts/profilegen.workflow.js:118-157`): it accepts an array of IDs, a `{ids, date}` object, or a JSON string of either. We pass `{ids: [...], date: "YYYY-MM-DD"}`. `date` sets `GENERATED`, which `emit_one` uses for the canonical coverage/verdict log paths (`dist/profilegen_<date>.csv`, `dist/profilegen_<date>_verdicts.json`). If `date` is omitted the workflow defaults to a hardcoded `"2026-06-17"` — so the runner MUST pass it.
- **The Workflow only emits a profile per saint that succeeds.** `generate(id)` returns `null` when an agent dies on a terminal API error after retries (e.g. mid-run rate limiting). A `null` saint writes no YAML. So "how many profiles landed on disk for this batch" is a deterministic, caller-agnostic success signal — we do not parse the agent's free-text summary.
- **Why opt-in, not a flip:** the user runs this overnight and relies on the resumable back-off. The flag defaults OFF so the legacy path is untouched until the new path is validated by a real run.
- **Headless opt-in for Workflow:** the Workflow tool requires explicit opt-in. A `claude -p` prompt that names a specific workflow script to run satisfies this. The prompt MUST tell the agent to *only* invoke that Workflow and not improvise its own subagents.
- **Resumability is unchanged in spirit:** `prioritize.ranked()` already excludes already-profiled saints across separate `python -m tools.profilegen.run` invocations. The new within-run "remaining" recompute makes a *single* run's retries surgical too (never regenerates a profile that already landed).

---

## File Structure

- **Modify** `tools/profilegen/run.py` — add config flag + 3 helpers (`profiles_present`, `run_workflow`, `classify_workflow_outcome`) and rework the per-batch loop to use them. This is the only production file changed.
- **Modify** `tests/test_profilegen.py` — add `unittest` test classes for the 3 new pure/IO-light helpers. (The main loop's `claude`/Workflow invocation is not unit-tested — it needs a live model — so all decision logic is extracted into the testable helpers and a real run is the integration test.)
- **Modify** `CLAUDE.md` — document the `PROFILEGEN_USE_WORKFLOW` flag under §8 "Run modes".
- **Modify** `/home/tom/.claude/projects/-home-tom-saints-db/memory/profile-generation-pipeline.md` + its `MEMORY.md` pointer — record that the bulk runner can now drive the Workflow.

No files are split or created. `run.py` stays a single focused module.

---

## Task 1: `profiles_present()` — deterministic on-disk success signal

**Files:**
- Modify: `tools/profilegen/run.py` (add constant + helper after `format_profiles`, around line 108)
- Test: `tests/test_profilegen.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_profilegen.py` (top imports already include `unittest`, `tempfile`, and `from pathlib import Path as _P`). Add this import near the other `from tools.profilegen import ...` lines:

```python
from tools.profilegen import run as runner
```

Then append this test class at the end of the file:

```python
class ProfilesPresentTests(unittest.TestCase):
    def test_returns_only_existing_ids(self):
        with tempfile.TemporaryDirectory() as d:
            p = _P(d)
            (p / "OS-0001.yaml").write_text("x", encoding="utf-8")
            (p / "OS-0003.yaml").write_text("x", encoding="utf-8")
            got = runner.profiles_present(
                ["OS-0001", "OS-0002", "OS-0003"], profiles_dir=p
            )
            self.assertEqual(got, {"OS-0001", "OS-0003"})

    def test_empty_when_none_exist(self):
        with tempfile.TemporaryDirectory() as d:
            got = runner.profiles_present(["OS-0001"], profiles_dir=_P(d))
            self.assertEqual(got, set())
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m unittest tests.test_profilegen.ProfilesPresentTests -v`
Expected: FAIL with `AttributeError: module 'tools.profilegen.run' has no attribute 'profiles_present'`

- [ ] **Step 3: Write the minimal implementation**

In `tools/profilegen/run.py`, add a module constant next to the other path constants (after line 33 `RUN_DIR = ...`):

```python
PROFILES_DIR = ROOT / "src" / "content" / "profiles"
```

Then add this helper immediately after the `format_profiles` function (after line 107):

```python
def profiles_present(ids, profiles_dir=None) -> set:
    """The subset of `ids` that already have a profile YAML on disk. Deterministic
    success signal for the Workflow path: the Workflow emits a file only for each
    saint that fully succeeded, so file presence — not parsed agent text — tells us
    what landed."""
    d = Path(profiles_dir) if profiles_dir is not None else PROFILES_DIR
    return {sid for sid in ids if (d / f"{sid}.yaml").exists()}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m unittest tests.test_profilegen.ProfilesPresentTests -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/profilegen/run.py tests/test_profilegen.py
git commit -m "profilegen: add profiles_present() on-disk success helper"
```

---

## Task 2: `classify_workflow_outcome()` — map produced-vs-requested to a batch outcome

**Files:**
- Modify: `tools/profilegen/run.py` (add helper after `profiles_present`)
- Test: `tests/test_profilegen.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_profilegen.py`:

```python
class WorkflowOutcomeTests(unittest.TestCase):
    def test_none_when_zero_produced(self):
        self.assertEqual(runner.classify_workflow_outcome(0, 40), "none")

    def test_partial_when_some_produced(self):
        self.assertEqual(runner.classify_workflow_outcome(12, 40), "partial")

    def test_ok_when_all_produced(self):
        self.assertEqual(runner.classify_workflow_outcome(40, 40), "ok")

    def test_ok_when_over_counted(self):
        # never loop a batch that somehow produced more than requested
        self.assertEqual(runner.classify_workflow_outcome(41, 40), "ok")
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m unittest tests.test_profilegen.WorkflowOutcomeTests -v`
Expected: FAIL with `AttributeError: module 'tools.profilegen.run' has no attribute 'classify_workflow_outcome'`

- [ ] **Step 3: Write the minimal implementation**

In `tools/profilegen/run.py`, add immediately after `profiles_present`:

```python
def classify_workflow_outcome(produced: int, requested: int) -> str:
    """Map produced-vs-requested profile counts to a batch outcome:
      'none'    → clean exit but nothing emitted → treat as a soft rate-limit signal
      'partial' → some emitted, some not → accept; stragglers retried on resume
      'ok'      → everything requested was emitted."""
    if produced <= 0:
        return "none"
    if produced < requested:
        return "partial"
    return "ok"
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m unittest tests.test_profilegen.WorkflowOutcomeTests -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/profilegen/run.py tests/test_profilegen.py
git commit -m "profilegen: add classify_workflow_outcome() batch-outcome helper"
```

---

## Task 3: `run_workflow()` — invoke the per-stage Workflow headlessly

**Files:**
- Modify: `tools/profilegen/run.py` (add config consts near line 40; add helper after `run_claude`, around line 83)
- Test: `tests/test_profilegen.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_profilegen.py` (uses `unittest.mock`; add `from unittest import mock` to the imports at the top of the file if not already present):

```python
class RunWorkflowTests(unittest.TestCase):
    def _fake_proc(self):
        class _R:
            stdout = '{"type":"result","subtype":"success"}'
            stderr = ""
            returncode = 0
        return _R()

    def test_invokes_workflow_tool_with_json_args(self):
        captured = {}

        def fake_run(argv, **kw):
            captured["argv"] = argv
            return self._fake_proc()

        with mock.patch.object(runner.subprocess, "run", fake_run):
            out, rc = runner.run_workflow(["OS-0007", "OS-0008"], "2026-06-20")

        argv = captured["argv"]
        # Workflow must be in the allowed tools
        allowed = argv[argv.index("--allowedTools") + 1]
        self.assertIn("Workflow", allowed)
        # the prompt names the workflow script and carries a parseable {ids,date} object
        prompt = argv[2]
        self.assertIn(runner.WORKFLOW_SCRIPT, prompt)
        import re
        payload = json.loads(re.search(r"\{.*\}", prompt).group(0))
        self.assertEqual(payload["ids"], ["OS-0007", "OS-0008"])
        self.assertEqual(payload["date"], "2026-06-20")
        self.assertEqual(rc, 0)

    def test_returns_combined_stdout_stderr(self):
        def fake_run(argv, **kw):
            return self._fake_proc()

        with mock.patch.object(runner.subprocess, "run", fake_run):
            out, rc = runner.run_workflow(["OS-0007"], "2026-06-20")
        self.assertIn('"type":"result"', out)
```

Add `import json` near the top of `tests/test_profilegen.py` if it is not already imported.

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m unittest tests.test_profilegen.RunWorkflowTests -v`
Expected: FAIL with `AttributeError: module 'tools.profilegen.run' has no attribute 'run_workflow'` (and/or `WORKFLOW_SCRIPT`)

- [ ] **Step 3: Write the minimal implementation**

In `tools/profilegen/run.py`, add config constants after the existing env reads (after line 40 `DRY_RUN = ...`):

```python
# Opt-in: drive generation through the per-stage Workflow (Gather=Sonnet, Write=Opus,
# Verify=Sonnet, Emit=Haiku) instead of one all-Opus claude -p agent. Default OFF so the
# legacy path is untouched until a real run validates the Workflow path.
USE_WORKFLOW = os.environ.get("PROFILEGEN_USE_WORKFLOW", "") not in ("", "0", "false", "False")
WORKFLOW_SCRIPT = "scripts/profilegen.workflow.js"
# The orchestrator only fires one Workflow tool call; the per-stage models live in the
# script, so the orchestrator itself can be cheap. Override with PROFILEGEN_ORCH_MODEL.
ORCH_MODEL = os.environ.get("PROFILEGEN_ORCH_MODEL", "claude-haiku-4-5-20251001")
WORKFLOW_TOOLS = "Workflow,Agent,Bash,Read,Write,Edit,WebFetch,WebSearch"
```

Then add this helper immediately after `run_claude` (after line 82, before `format_profiles`):

```python
def run_workflow(ids, date: str) -> tuple[str, int]:
    """Drive the per-stage Workflow headlessly for `ids`. The orchestrator's only job
    is to invoke the one Workflow with {ids, date} args — NOT to improvise its own
    subagents (which would inherit a single model and defeat the per-stage split)."""
    payload = json.dumps({"ids": list(ids), "date": date})
    prompt = (
        f"Use the Workflow tool to run the workflow script at {WORKFLOW_SCRIPT}, "
        f"passing this exact JSON object as its args: {payload}. "
        f"Do NOT generate any profiles yourself and do NOT spawn your own subagents — "
        f"invoke that single Workflow and report only its final summary line."
    )
    proc = subprocess.run(
        ["claude", "-p", prompt,
         "--permission-mode", "dontAsk",
         "--allowedTools", WORKFLOW_TOOLS,
         "--model", ORCH_MODEL,
         "--output-format", "json"],
        capture_output=True, text=True, cwd=ROOT,
    )
    return (proc.stdout or "") + (proc.stderr or ""), proc.returncode
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m unittest tests.test_profilegen.RunWorkflowTests -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/profilegen/run.py tests/test_profilegen.py
git commit -m "profilegen: add run_workflow() headless Workflow invocation"
```

---

## Task 4: Wire the helpers into the per-batch loop

**Files:**
- Modify: `tools/profilegen/run.py` (`main()` loop, lines 123-169)

This task has no new unit test (it orchestrates the already-tested helpers and a live `claude` call). It is verified by Task 6's manual run. Make the edit carefully and re-run the full suite to confirm no regression.

- [ ] **Step 1: Replace the batch-loop preamble to compute the date once**

In `tools/profilegen/run.py`, find (lines 123-124):

```python
    waits = 0  # consecutive full-window waits with no successful call between → weekly signal
    for n, batch in enumerate(batches, 1):
```

Replace with:

```python
    waits = 0  # consecutive full-window waits with no successful call between → weekly signal
    date = f"{datetime.now():%F}"  # batch date → Workflow GENERATED → canonical log paths
    for n, batch in enumerate(batches, 1):
```

- [ ] **Step 2: Replace the inner attempt block**

Find this block (lines 126-136):

```python
        while True:
            write_state(status="running", batch=n, total=len(batches), action="generating")
            log(f"batch {n}/{len(batches)} ({len(batch)} ids)")
            out, rc = run_claude(batch)
            etype = limits.parse_error_type(out) or ("error" if rc != 0 else None)

            if etype is None:                       # success
                waits = 0
                format_profiles(batch)
                log(f"batch {n} done")
                break
```

Replace with:

```python
        while True:
            if USE_WORKFLOW:
                remaining = sorted(set(batch) - profiles_present(batch))
                if not remaining:                   # whole batch already on disk
                    log(f"batch {n}/{len(batches)} already complete")
                    break
            else:
                remaining = batch
            write_state(status="running", batch=n, total=len(batches),
                        action="generating", remaining=len(remaining))
            log(f"batch {n}/{len(batches)} ({len(remaining)} ids)")
            out, rc = (run_workflow(remaining, date) if USE_WORKFLOW
                       else run_claude(remaining))
            etype = limits.parse_error_type(out) or ("error" if rc != 0 else None)

            if etype is None and USE_WORKFLOW:
                produced = len(profiles_present(remaining))
                outcome = classify_workflow_outcome(produced, len(remaining))
                if outcome == "none":               # clean exit, 0 emitted → soft limit
                    etype = "rate_limit_error"
                    log(f"batch {n}: workflow emitted 0/{len(remaining)} profiles — "
                        f"treating as a rate-limit signal")
                else:                               # 'ok' or 'partial' — real progress
                    waits = 0
                    format_profiles(remaining)
                    if outcome == "partial":
                        log(f"batch {n}: {produced}/{len(remaining)} produced; "
                            f"{len(remaining) - produced} remain (retried on resume)")
                    log(f"batch {n} done")
                    break

            if etype is None:                       # legacy success
                waits = 0
                format_profiles(remaining)
                log(f"batch {n} done")
                break
```

> The remaining blocks (`is_terminal` → return 3; `rate_limit_error` → wait/weekly; unknown-error backoff) are unchanged. The synthesized `etype = "rate_limit_error"` from a zero-production workflow flows straight into the existing rate-limit handler, so the wait/weekly-cap machinery is reused verbatim.

- [ ] **Step 3: Update the module docstring + Env list**

Find the docstring's Env line (lines 18-19):

```python
Env: BATCH_SIZE(40) PROFILEGEN_MODEL(claude-opus-4-8) RESUME_AFTER(18600≈5h10m)
WEEKLY_AFTER_WAITS(2) MAX_ERR(3) NOTIFY_CMD('') DRY_RUN('')."""
```

Replace with:

```python
Env: BATCH_SIZE(40) PROFILEGEN_MODEL(claude-opus-4-8) RESUME_AFTER(18600≈5h10m)
WEEKLY_AFTER_WAITS(2) MAX_ERR(3) NOTIFY_CMD('') DRY_RUN('')
PROFILEGEN_USE_WORKFLOW('') — when set, generate via scripts/profilegen.workflow.js
(per-stage Sonnet/Opus/Sonnet/Haiku); a clean run that emits 0 profiles is treated as a
rate-limit. PROFILEGEN_ORCH_MODEL(claude-haiku-4-5-20251001) — model for the thin
Workflow-invoking orchestrator (the per-stage models live in the script)."""
```

- [ ] **Step 4: Run the full test suite (no regression)**

Run: `python -m unittest tests.test_profilegen -v`
Expected: PASS (all prior tests + the 8 new ones from Tasks 1-3)

- [ ] **Step 5: Verify the legacy path is byte-for-byte behaviorally intact**

Run: `DRY_RUN=1 python -m tools.profilegen.run`
Expected: prints the batch plan exactly as before (the dry-run returns before the loop, so neither path is exercised — this just confirms no import/syntax error).

Run: `python -c "import ast; ast.parse(open('tools/profilegen/run.py').read()); print('syntax OK')"`
Expected: `syntax OK`

- [ ] **Step 6: Commit**

```bash
git add tools/profilegen/run.py
git commit -m "profilegen: route the overnight runner through the per-stage Workflow (opt-in)"
```

---

## Task 5: Document the flag in CLAUDE.md and memory

**Files:**
- Modify: `CLAUDE.md` (§8 "Run modes" paragraph)
- Modify: `/home/tom/.claude/projects/-home-tom-saints-db/memory/profile-generation-pipeline.md` and its pointer line in `MEMORY.md`

- [ ] **Step 1: Update CLAUDE.md**

In `CLAUDE.md`, find the sentence in the **Run modes** paragraph (§8) that reads:

```
*Bulk* runs unattended via `make profile-run` (or `nohup python -m tools.profilegen.run > dist/profilegen/nohup.out 2>&1 & disown`), which walks the whole prioritized backlog one headless `claude -p` batch at a time and is **resumable** (re-run to continue — prioritization excludes already-profiled saints).
```

Append to the end of that sentence (before the next sentence about auth setup):

```
 By default each batch is one all-Opus `claude -p` agent; set **`PROFILEGEN_USE_WORKFLOW=1`** to instead drive `scripts/profilegen.workflow.js` per batch (per-stage Gather=Sonnet, Write=Opus, Verify=Sonnet, Emit=Haiku — much cheaper). In Workflow mode the runner detects rate-limiting by the **profiles-on-disk** count (a clean run that emits zero profiles is treated as a soft limit and waits a window), and re-drives only the IDs still missing a profile, so partial batches resume cleanly.
```

- [ ] **Step 2: Update the memory file**

Edit `/home/tom/.claude/projects/-home-tom-saints-db/memory/profile-generation-pipeline.md`: find the closing note that says the bulk `run.py` is "still single-agent `claude -p`, NOT yet on the Workflow" and replace it with:

```
Bulk run.py can now drive the per-stage Workflow with `PROFILEGEN_USE_WORKFLOW=1`
(default OFF = legacy all-Opus). Workflow mode keys rate-limit/back-off off the
profiles-on-disk count, not parsed agent text, and re-drives only still-missing IDs.
See [[profilegen-agent-fallback]].
```

Update the corresponding one-line pointer in `MEMORY.md` to match (drop "NOT yet on the Workflow").

- [ ] **Step 3: Commit (repo file only; memory is outside the repo)**

```bash
git add CLAUDE.md
git commit -m "docs: document PROFILEGEN_USE_WORKFLOW bulk-runner mode"
```

---

## Task 6: Manual integration validation (run by a human, not CI)

> This is the real test of the new path — CI cannot invoke a live model or the Workflow tool. Do this on a branch, **not** during an active overnight run (stop any running runner first per the two-pkill stop sequence). It generates a couple of real draft profiles; keep or discard them as desired.

- [ ] **Step 1: Confirm a clean working tree and a feature branch**

Run: `git status --short && git branch --show-current`
Expected: a `profilegen/...` or feature branch; no unrelated staged changes.

- [ ] **Step 2: Run a 2-saint workflow-mode batch**

Run:
```bash
unset ANTHROPIC_API_KEY
BATCH_SIZE=2 PROFILEGEN_USE_WORKFLOW=1 python -m tools.profilegen.run 2>&1 | tee /tmp/wf-smoke.out
```
Let exactly one batch complete, then Ctrl-C (or let it run a couple of batches).

- [ ] **Step 3: Verify the Workflow actually fired with per-stage models**

Run:
```bash
proj="$HOME/.claude/projects/-home-tom-saints-db"
active=$(grep -l "profilegen.workflow.js" "$proj"/*.jsonl 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
echo "transcript: $active"
grep -o '"model":"[a-z0-9-]*"' "$active" | sort | uniq -c
```
Expected: a mix of `claude-sonnet-*`, `claude-opus-*`, `claude-haiku-*` (proving the per-stage split ran), NOT all-opus. If you see only the orchestrator and no Workflow phases, the headless Workflow opt-in failed — see Risks.

- [ ] **Step 4: Verify profiles + canonical logs landed and validate**

Run:
```bash
ls -lt src/content/profiles/*.yaml | head -3
ls -lt dist/profilegen_$(date +%F)*.csv dist/profilegen_$(date +%F)*_verdicts.json 2>/dev/null
python build.py --check-only --no-xlsx 2>&1 | tail -3
npx prettier --check src/content/profiles/$(ls -t src/content/profiles | head -1) 2>&1 | tail -1
```
Expected: new YAML files exist; coverage CSV + verdicts JSON dated today exist; `build.py` reports `0 errors`; prettier reports the file is already formatted (the Workflow's emit step formats it).

- [ ] **Step 5: Verify the zero-production rate-limit synthesis path (optional, by inspection)**

Confirm by reading the loop that a clean exit with `produced == 0` sets `etype = "rate_limit_error"` and falls into the existing wait/weekly handler. (A live rate-limit is impractical to force; the unit-tested `classify_workflow_outcome` plus this code-read cover it.)

- [ ] **Step 6: Decide on the generated drafts**

Either keep them (commit) or discard:
```bash
git checkout -- src/content/profiles/ 2>/dev/null; git clean -f src/content/profiles/
```
(Keep `dist/` artifacts as-is; they are git-ignored.)

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Per-stage models unattended → Tasks 3 + 4 (run_workflow drives the script whose agents carry `model:` overrides). ✓
- Preserve rate-limit/weekly-cap back-off → Task 4 reuses the existing handler via synthesized `rate_limit_error` on zero production. ✓
- Don't regenerate already-done saints within a run → Task 4 recomputes `remaining` each attempt. ✓
- Partial-batch handling → Task 2 (`classify_workflow_outcome`) + Task 4 ('partial' accepts and logs). ✓
- Opt-in / no disruption to current runs → Task 3 (`USE_WORKFLOW` default OFF). ✓
- Pass the batch date so logs aren't misdated → Task 4 Step 1. ✓
- Docs/memory → Task 5. ✓
- Real validation → Task 6. ✓

**Type/name consistency:** `profiles_present` (set), `classify_workflow_outcome` (str: 'none'|'partial'|'ok'), `run_workflow(ids, date)`, consts `USE_WORKFLOW`/`WORKFLOW_SCRIPT`/`ORCH_MODEL`/`WORKFLOW_TOOLS`/`PROFILES_DIR` — used identically across Tasks 1-4. ✓

**Placeholder scan:** no TBD/TODO; every code step shows complete code and exact commands. ✓

---

## Risks & mitigations (read before executing)

1. **Headless Workflow opt-in may be refused or unavailable.** If `claude -p` won't invoke the Workflow tool (opt-in heuristics, or the tool absent in headless), Task 6 Step 3 will show no per-stage models. *Mitigation:* the flag is opt-in and the legacy path is untouched, so this fails safe to "leave `PROFILEGEN_USE_WORKFLOW` unset." If it fails, fall back to the lighter Option A (`PROFILEGEN_MODEL=claude-sonnet-4-6`) for cost savings, or escalate the Workflow invocation into a saved `.claude/workflows/profilegen` entry and invoke by name.
2. **False rate-limit on a non-limit failure.** A clean exit that emits zero profiles because of a *script* bug (not a limit) would be misread as rate-limiting and waste up to `WEEKLY_AFTER_WAITS` windows before stopping with a misleading "weekly cap" message. *Mitigation:* Task 6 validates the script end-to-end before any overnight run; `WEEKLY_AFTER_WAITS` bounds the wasted waits; the run log records the zero-production line for diagnosis.
3. **Concurrency cap.** The Workflow caps concurrent agents at `min(16, cores-2)`; a 40-ID batch queues rather than running all at once. This is fine (throughput, not correctness) but means a workflow batch wall-clock differs from the legacy path. Consider lowering `BATCH_SIZE` for tighter resume granularity in Workflow mode.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-20-bulk-runner-on-workflow.md`.
