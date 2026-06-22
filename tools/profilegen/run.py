"""Hands-off overnight runner for grounded profile generation. Builds batches from the
prioritized, profile-less saints and runs `claude -p` per batch, skipping saints that already
have a profile (resumable).

Limit handling (see tools/profilegen/limits.py for why it must be this way):
  * terminal error (billing/auth)        -> stop now (exit 3)
  * rate_limit_error                      -> wait RESUME_AFTER (a full 5-hour window) and retry
  * still rate-limited after              -> infer the weekly cap and stop (exit 2)
      WEEKLY_AFTER_WAITS such waits
  * other error                           -> bounded backoff, then skip the batch
A NOTIFY_CMD (if set) is run on limit/stop/done with the message as one argument; state is
written to dist/profilegen/state.json each step.

Launch:  nohup python -m tools.profilegen.run > dist/profilegen/nohup.out 2>&1 & disown
Resume:  re-run the same command (prioritize excludes already-profiled saints).
Exit:    0 done · 2 stopped (likely weekly cap) · 3 terminal error.

Env: BATCH_SIZE(40) PROFILEGEN_MODEL(claude-opus-4-8) RESUME_AFTER(18600≈5h10m)
WEEKLY_AFTER_WAITS(2) MAX_ERR(3) NOTIFY_CMD('') DRY_RUN('')."""
import json
import os
import shlex
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from tools.profilegen import limits, prioritize

ROOT = Path(__file__).resolve().parents[2]
PLAN = "docs/superpowers/plans/2026-06-17-generation-pipeline.md"
RUN_DIR = ROOT / "dist" / "profilegen"
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "40"))
MODEL = os.environ.get("PROFILEGEN_MODEL", "claude-opus-4-8")
RESUME_AFTER = int(os.environ.get("RESUME_AFTER", str(5 * 3600 + 600)))  # ~5h10m: clears a window
WEEKLY_AFTER_WAITS = int(os.environ.get("WEEKLY_AFTER_WAITS", "2"))      # then assume weekly cap
MAX_ERR = int(os.environ.get("MAX_ERR", "3"))                            # unknown errors per batch
NOTIFY_CMD = os.environ.get("NOTIFY_CMD", "")
DRY_RUN = bool(os.environ.get("DRY_RUN"))


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


def run_claude(ids: list[str]) -> tuple[str, int]:
    prompt = (
        f"Generate grounded saint profiles for these IDs: {' '.join(ids)}. "
        f"Follow {PLAN}: gather sources, write, adversarially verify against the "
        f"OCA-anchor row, emit YAML to src/content/profiles/, and append coverage + "
        f"verdicts under dist/profilegen/. SKIP any ID that already has a profile file. "
        f"Report how many profiles you wrote."
    )
    proc = subprocess.run(
        ["claude", "-p", prompt,
         "--permission-mode", "dontAsk",
         "--allowedTools", "Read,Write,Edit,Bash,WebFetch,WebSearch",
         "--model", MODEL,
         "--output-format", "json"],
        capture_output=True, text=True, cwd=ROOT,
    )
    return (proc.stdout or "") + (proc.stderr or ""), proc.returncode


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


def main() -> int:
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
    for n, batch in enumerate(batches, 1):
        errs = 0
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
