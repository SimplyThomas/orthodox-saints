"""Hands-off overnight runner for grounded profile generation. Builds batches from the
prioritized, profile-less saints and runs `claude -p` per batch, skipping saints that already
have a profile (resumable).

Limit handling (see tools/profilegen/limits.py for why it must be this way):
  * terminal error (billing/auth)        -> stop now (exit 3)
  * rate_limit_error                      -> wait RESUME_AFTER (a full 5-hour window) and retry
  * instant non-zero exit (usage cap)    -> treated as rate_limit_error (wait, don't skip) —
                                            a sub-minute `claude -p` failure did no work
  * still rate-limited after              -> infer the weekly cap and stop (exit 2)
      WEEKLY_AFTER_WAITS such waits
  * other error                           -> bounded backoff, then skip the batch
A NOTIFY_CMD (if set) is run on limit/stop/done with the message as one argument; state is
written to dist/profilegen/state.json each step. The raw output of any failed/zero-production
batch is saved under dist/profilegen/errors/ so a recurrence is diagnosable at a glance.

Launch:  nohup python -m tools.profilegen.run > dist/profilegen/nohup.out 2>&1 & disown
Stop:    make profile-stop  (sends SIGTERM; run finishes the current batch then exits cleanly)
Resume:  re-run the same command (prioritize excludes already-profiled saints).
Status:  make profile-status  (prints dist/profilegen/state.json)
Exit:    0 done/stopped · 2 stopped (likely weekly cap) · 3 terminal error.

Env: BATCH_SIZE(10) PROFILEGEN_MODEL(claude-opus-4-8) RESUME_AFTER(18600≈5h10m)
WEEKLY_AFTER_WAITS(2) MAX_ERR(3) NOTIFY_CMD('') DRY_RUN('')
PROFILEGEN_USE_WORKFLOW(on by default) — generate via scripts/profilegen.workflow.js
(per-stage Sonnet/Opus/Sonnet/Haiku); set =0/false/off to fall back to the legacy all-Opus
path. A clean run that emits 0 profiles is classified from the orchestrator output: a 429
rate-limit waits a window (weekly-cap path); a transient 529 overload (or unknown) backs
off and skips the batch — see limits.zero_production_etype.
PROFILEGEN_ORCH_MODEL(claude-haiku-4-5-20251001) — model for the thin Workflow-invoking
orchestrator (the per-stage models live in the script)."""
import json
import os
import shlex
import signal
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from tools.profilegen import limits, prioritize

_stop_requested = False
PID_FILE = None  # set in main() after RUN_DIR is created


def _handle_sigterm(signum, frame):
    global _stop_requested
    _stop_requested = True
    log("SIGTERM received — will stop after current batch completes")

ROOT = Path(__file__).resolve().parents[2]
# The legacy path points subagents at the lean per-stage guides (~10KB total), NOT the
# 60KB pipeline-design plan — re-reading that plan per saint was a major token sink, and
# the Workflow proves these prompts are self-sufficient for quality generation.
STAGE_GUIDES = ("tools/profilegen/prompts/gather.md, tools/profilegen/prompts/write.md, "
                "and tools/profilegen/prompts/verify.md")
RUN_DIR = ROOT / "dist" / "profilegen"
PROFILES_DIR = ROOT / "src" / "content" / "profiles"
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "10"))
# Hard wall-clock cap on a single `claude -p` batch. A headless orchestrator sometimes
# finishes its work but never exits (observed: workflow wrote all profiles, then hung) —
# without a timeout the parent blocks forever and the whole overnight run freezes. On
# timeout we kill the child's process group and let the loop move on; any profiles that
# did land are picked up by the profiles-on-disk recompute. ~60 min ≫ a normal 10-saint
# batch (~15 min) even with retries.
BATCH_TIMEOUT = int(os.environ.get("BATCH_TIMEOUT", "3600"))
MODEL = os.environ.get("PROFILEGEN_MODEL", "claude-opus-4-8")
RESUME_AFTER = int(os.environ.get("RESUME_AFTER", str(5 * 3600 + 600)))  # ~5h10m: clears a window
WEEKLY_AFTER_WAITS = int(os.environ.get("WEEKLY_AFTER_WAITS", "2"))      # then assume weekly cap
MAX_ERR = int(os.environ.get("MAX_ERR", "3"))                            # unknown errors per batch
NOTIFY_CMD = os.environ.get("NOTIFY_CMD", "")
DRY_RUN = bool(os.environ.get("DRY_RUN"))
# Default ON: drive generation through the per-stage Workflow (Gather=Sonnet, Write=Opus,
# Verify=Sonnet, Emit=Haiku) instead of one all-Opus claude -p agent — ~2.3x cheaper on the
# weekly limit. Set PROFILEGEN_USE_WORKFLOW=0 (or false/off/no) to fall back to the legacy path.
USE_WORKFLOW = os.environ.get("PROFILEGEN_USE_WORKFLOW", "1").lower() not in ("0", "false", "off", "no")
WORKFLOW_SCRIPT = "scripts/profilegen.workflow.js"
# The orchestrator only fires one Workflow tool call; the per-stage models live in the
# script, so the orchestrator itself can be cheap. Override with PROFILEGEN_ORCH_MODEL.
ORCH_MODEL = os.environ.get("PROFILEGEN_ORCH_MODEL", "claude-haiku-4-5-20251001")
WORKFLOW_TOOLS = "Workflow,Agent,Bash,Read,Write,Edit,WebFetch,WebSearch"


def log(msg: str) -> None:
    line = f"[{datetime.now():%F %T}] {msg}"
    print(line, flush=True)
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    with open(RUN_DIR / "run.log", "a", encoding="utf-8") as f:
        f.write(line + "\n")


def notify(msg: str) -> None:
    log(msg)
    if NOTIFY_CMD:
        try:  # a broken notifier must never kill the run
            subprocess.run(f"{NOTIFY_CMD} {shlex.quote(msg)}", shell=True, timeout=30)
        except Exception as e:
            log(f"(notify failed: {e})")


def write_state(**kw) -> None:
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    kw["updated"] = f"{datetime.now():%F %T}"
    (RUN_DIR / "state.json").write_text(json.dumps(kw, indent=2), encoding="utf-8")


def save_error_output(date: str, batch_n: int, out: str, etype: str) -> None:
    """Persist the raw `claude -p` output for a failed/zero-production batch under
    dist/profilegen/errors/ so the *next* cap is diagnosable at a glance. run.log records
    only the classification, which is why 2026-07-04's silent 'error' failures had to be
    reverse-engineered from timestamps. Best-effort — a write failure must never kill the
    run; only the trailing 20 KB is kept (enough to see the error, bounded on disk)."""
    try:
        errdir = RUN_DIR / "errors"
        errdir.mkdir(parents=True, exist_ok=True)
        stamp = f"{datetime.now():%H%M%S}"
        (errdir / f"{date}-b{batch_n:02d}-{stamp}-{etype}.log").write_text(
            (out or "")[-20000:], encoding="utf-8")
    except Exception as e:
        log(f"(could not save error output: {e})")


def run_claude(ids: list[str]) -> tuple[str, int]:
    prompt = (
        f"Generate grounded saint profiles for these IDs: {' '.join(ids)}. "
        f"For each saint, follow the concise stage guides {STAGE_GUIDES} (read THESE, "
        f"not the full pipeline-design plan): seed the dossier with "
        f"`python -m tools.profilegen.dossier <id>`, gather sources, write, adversarially "
        f"verify against the OCA-anchor row, emit YAML to src/content/profiles/, and append "
        f"coverage + verdicts under dist/profilegen/. SKIP any ID that already has a profile "
        f"file. Report how many profiles you wrote."
    )
    return _exec_claude(
        ["claude", "-p", prompt,
         "--permission-mode", "dontAsk",
         "--allowedTools", "Read,Write,Edit,Bash,WebFetch,WebSearch",
         "--model", MODEL,
         "--output-format", "json"])


def _exec_claude(argv) -> tuple[str, int]:
    """Run a `claude -p` invocation with a hard BATCH_TIMEOUT. Spawn it in its own
    process group (start_new_session) so that on timeout we can SIGKILL the whole tree
    — the orchestrator AND the Workflow sub-agents it spawned — rather than orphaning
    them (orphaned children have frozen prior runs). Returns (combined output, rc);
    a timeout returns rc 124 with a 'TIMEOUT' marker the loop treats as a retryable error."""
    proc = subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            text=True, cwd=ROOT, start_new_session=True)
    try:
        out, err = proc.communicate(timeout=BATCH_TIMEOUT)
        return (out or "") + (err or ""), proc.returncode
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            proc.kill()
        try:
            out, err = proc.communicate(timeout=30)
        except Exception:
            out, err = "", ""
        log(f"TIMEOUT after {BATCH_TIMEOUT}s — killed hung claude -p process group")
        return (out or "") + (err or "") + f"\nTIMEOUT after {BATCH_TIMEOUT}s", 124


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
    return _exec_claude(
        ["claude", "-p", prompt,
         "--permission-mode", "dontAsk",
         "--allowedTools", WORKFLOW_TOOLS,
         "--model", ORCH_MODEL,
         "--output-format", "json"])


def format_profiles(ids: list[str]) -> None:
    """Prettier-normalize a finished batch's profiles so the frontend lint gate
    (`prettier --check`) passes — the emit step writes valid but unformatted YAML.
    Best-effort: a missing/failing prettier must never kill the run. Safe here
    because it runs only after a batch completes (no subagent writing concurrently)
    and touches only this batch's existing files."""
    prettier = ROOT / "node_modules" / ".bin" / "prettier"
    if not prettier.exists():
        log("(skip formatting: node_modules/.bin/prettier not found — run `make web-install`)")
        return
    paths = [str(p) for sid in ids
             if (p := ROOT / "src" / "content" / "profiles" / f"{sid}.yaml").exists()]
    if not paths:
        return
    try:
        r = subprocess.run([str(prettier), "--write", "--log-level", "warn", *paths],
                           capture_output=True, text=True, cwd=ROOT, timeout=300)
        if r.returncode != 0:
            log(f"(prettier returned {r.returncode}: {(r.stderr or '').strip()[:200]})")
        else:
            log(f"formatted {len(paths)} profile(s)")
    except Exception as e:
        log(f"(prettier failed, profiles left unformatted: {e})")


def profiles_present(ids, profiles_dir=None) -> set:
    """The subset of `ids` that already have a profile YAML on disk. Deterministic
    success signal for the Workflow path: the Workflow emits a file only for each
    saint that fully succeeded, so file presence — not parsed agent text — tells us
    what landed."""
    d = Path(profiles_dir) if profiles_dir is not None else PROFILES_DIR
    return {sid for sid in ids if (d / f"{sid}.yaml").exists()}


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


def main() -> int:
    global PID_FILE
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    PID_FILE = RUN_DIR / "run.pid"
    PID_FILE.write_text(str(os.getpid()), encoding="utf-8")
    signal.signal(signal.SIGTERM, _handle_sigterm)

    try:
        return _run()
    finally:
        try:
            PID_FILE.unlink(missing_ok=True)
        except Exception:
            pass


def _run() -> int:
    if os.environ.get("ANTHROPIC_API_KEY"):
        log("WARNING: ANTHROPIC_API_KEY is set — headless runs bill metered API rates, "
            "not your Max subscription. `unset ANTHROPIC_API_KEY` first.")

    todo = [sid for sid, _ in prioritize.ranked(10**9)]  # excludes already-profiled saints
    batches = [todo[i:i + BATCH_SIZE] for i in range(0, len(todo), BATCH_SIZE)]
    log(f"{len(todo)} profile-less saints in {len(batches)} batches of {BATCH_SIZE}")
    if DRY_RUN:
        for n, b in enumerate(batches, 1):
            log(f"[dry-run] batch {n}: {b[0]}..{b[-1]} ({len(b)})")
        return 0

    waits = 0  # consecutive full-window waits with no successful call between → weekly signal
    date = f"{datetime.now():%F}"  # batch date → Workflow GENERATED → canonical log paths
    for n, batch in enumerate(batches, 1):
        if _stop_requested:
            write_state(status="stopped", batch=n, total=len(batches), reason="sigterm")
            notify(f"profilegen stopped cleanly at batch {n} (SIGTERM). Resume with `make profile-run`.")
            return 0
        errs = 0
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
            t0 = time.monotonic()
            out, rc = (run_workflow(remaining, date) if USE_WORKFLOW
                       else run_claude(remaining))
            elapsed = time.monotonic() - t0
            etype = limits.parse_error_type(out)
            if etype is None and rc != 0:
                # Non-zero exit, no parseable error type. An instant exit is a usage-cap /
                # quota / auth-refresh refusal that did no work → wait a window (below).
                # A slower non-zero exit is a genuine mid-run error → fast backoff + skip.
                if limits.hard_startup_failure(out, rc, elapsed):
                    etype = "rate_limit_error"
                    log(f"batch {n}: claude -p exited rc={rc} in {elapsed:.0f}s with no "
                        f"parseable error — treating as a usage-window cap (wait, not skip)")
                else:
                    etype = "error"
                save_error_output(date, n, out, etype)

            if etype is None and USE_WORKFLOW:
                produced = len(profiles_present(remaining))
                outcome = classify_workflow_outcome(produced, len(remaining))
                if outcome == "none":               # clean exit, 0 emitted — classify cause
                    etype = limits.zero_production_etype(out)
                    save_error_output(date, n, out, etype)
                    log(f"batch {n}: workflow emitted 0/{len(remaining)} profiles — "
                        f"classified '{etype}' "
                        f"({'wait a window' if etype == 'rate_limit_error' else 'backoff + skip'})")
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

            if limits.is_terminal(etype):           # billing / auth — waiting won't help
                write_state(status="stopped", batch=n, total=len(batches), reason=etype)
                notify(f"profilegen STOPPED on batch {n}: terminal error '{etype}'. "
                       f"Fix it and re-run. Profiles already written are saved.")
                return 3

            if etype == "rate_limit_error":
                if waits >= WEEKLY_AFTER_WAITS:     # waiting stopped helping → weekly cap
                    write_state(status="stopped", batch=n, total=len(batches),
                                reason="likely-weekly-cap")
                    notify(f"profilegen STOPPED on batch {n}: still rate-limited after "
                           f"{waits} full-window waits — almost certainly the weekly cap. "
                           f"Resume next cycle, or switch to the API/Batches. Profiles saved.")
                    return 2
                wait = limits.retry_after_seconds(out) or RESUME_AFTER
                resume_at = (datetime.now() + timedelta(seconds=wait)).strftime("%F %T")
                waits += 1
                write_state(status="sleeping", batch=n, total=len(batches),
                            action="rate-limited", resume_at=resume_at,
                            wait=f"{waits}/{WEEKLY_AFTER_WAITS}")
                notify(f"profilegen rate-limited on batch {n}; sleeping until ~{resume_at} "
                       f"(window-reset attempt {waits}/{WEEKLY_AFTER_WAITS}).")
                time.sleep(wait)
                continue

            errs += 1                               # unknown, non-terminal error
            if errs >= MAX_ERR:
                log(f"batch {n}: {errs}× error '{etype}'; skipping (re-run later to retry).")
                break
            backoff = min(60 * 2 ** errs, 1800)
            log(f"batch {n} error '{etype}'; backoff {backoff}s")
            time.sleep(backoff)

    write_state(status="done", total=len(batches))
    notify("profilegen ALL DONE — backlog generated (skipped batches, if any, are logged).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
