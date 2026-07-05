"""Hands-off runner for grounded FEAST-profile generation. Builds batches from the
prioritized, profile-less feasts and runs `claude -p` per batch, skipping feasts that
already have a profile (resumable). Adapted from tools/profilegen/run.py; the
limit-classification logic is imported from tools.profilegen.limits unchanged:
  * terminal error (billing/auth)      -> stop now (exit 3)
  * rate_limit_error                    -> wait RESUME_AFTER (a full 5-hour window) and retry
  * instant non-zero exit (usage cap)  -> treated as rate_limit_error (wait, don't skip)
  * still rate-limited after            -> infer the weekly cap and stop (exit 2)
      WEEKLY_AFTER_WAITS such waits
  * other error                         -> bounded backoff, then skip the batch

Launch:  nohup python -m tools.feastgen.run > dist/feastgen/nohup.out 2>&1 & disown
Stop:    make feast-stop  (SIGTERM; finishes the current batch, then exits cleanly)
Resume:  re-run the same command (prioritize excludes already-profiled feasts).
Status:  make feast-status  (prints dist/feastgen/state.json)
Exit:    0 done/stopped · 2 stopped (likely weekly cap) · 3 terminal error.

Env: BATCH_SIZE(8) FEASTGEN_MODEL(claude-opus-4-8) BATCH_TIMEOUT(3600)
RESUME_AFTER(18600≈5h10m) WEEKLY_AFTER_WAITS(2) MAX_ERR(3) NOTIFY_CMD('') DRY_RUN('')

Auth (same as profilegen): `unset ANTHROPIC_API_KEY && claude setup-token &&
export CLAUDE_CODE_OAUTH_TOKEN=…` so the run bills the subscription, not the API.
Wikimedia/OCA/orthodoxwiki must be reachable for sourcing; verify before a long run."""
import json
import os
import shlex
import signal
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from tools.feastgen import prioritize
from tools.profilegen import limits

_stop_requested = False
PID_FILE = None  # set in main() after RUN_DIR is created


def _handle_sigterm(signum, frame):
    global _stop_requested
    _stop_requested = True
    log("SIGTERM received — will stop after current batch completes")


ROOT = Path(__file__).resolve().parents[2]
STAGE_GUIDES = ("tools/feastgen/prompts/gather.md, tools/feastgen/prompts/write.md, "
                "and tools/feastgen/prompts/verify.md")
RUN_DIR = ROOT / "dist" / "feastgen"
PROFILES_DIR = ROOT / "src" / "content" / "feasts"
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "8"))
BATCH_TIMEOUT = int(os.environ.get("BATCH_TIMEOUT", "3600"))
MODEL = os.environ.get("FEASTGEN_MODEL", "claude-opus-4-8")
RESUME_AFTER = int(os.environ.get("RESUME_AFTER", str(5 * 3600 + 600)))
WEEKLY_AFTER_WAITS = int(os.environ.get("WEEKLY_AFTER_WAITS", "2"))
MAX_ERR = int(os.environ.get("MAX_ERR", "3"))
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


def save_error_output(date: str, batch_n: int, out: str, etype: str) -> None:
    """Persist the raw output of a failed/zero-production batch (trailing 20 KB)
    under dist/feastgen/errors/ so a recurrence is diagnosable at a glance."""
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
        f"Generate grounded FEAST profiles for these Feast IDs: {' '.join(ids)}. "
        f"For each feast, follow the concise stage guides {STAGE_GUIDES}: seed the "
        f"dossier with `python -m tools.feastgen.dossier <id>`, gather sources, write "
        f"the FeastProfile JSON, adversarially verify against the feasts.csv anchor row, "
        f"save the dossier/profile/verdict JSONs under dist/feastgen/work/<id>/, then emit "
        f"with `python -m tools.feastgen.emit_one --id <id> --date <today> --status "
        f"<draft|flagged> --profile-file … --verdict-file … --dossier-file …` (emit_one "
        f"owns the YAML path and final status — do NOT write "
        f"src/content/feasts/*.yaml yourself). SKIP any ID that already has a profile "
        f"file. Report how many profiles you wrote."
    )
    return _exec_claude(
        ["claude", "-p", prompt,
         "--permission-mode", "dontAsk",
         "--allowedTools", "Read,Write,Edit,Bash,WebFetch,WebSearch",
         "--model", MODEL,
         "--output-format", "json"])


def _exec_claude(argv) -> tuple[str, int]:
    """Run a `claude -p` invocation with a hard BATCH_TIMEOUT, in its own process
    group so a hung orchestrator's whole tree is killed rather than orphaned."""
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


def format_profiles(ids: list[str]) -> None:
    """Prettier-normalize a finished batch's profiles so the frontend lint gate
    passes. Best-effort: a missing/failing prettier must never kill the run."""
    prettier = ROOT / "node_modules" / ".bin" / "prettier"
    if not prettier.exists():
        log("(skip formatting: node_modules/.bin/prettier not found — run `make web-install`)")
        return
    paths = [str(p) for fid in ids
             if (p := PROFILES_DIR / f"{fid}.yaml").exists()]
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


def profiles_present(ids) -> set:
    """The subset of `ids` that already have a profile YAML on disk — the
    deterministic success signal (file presence, not parsed agent text)."""
    return {fid for fid in ids if (PROFILES_DIR / f"{fid}.yaml").exists()}


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

    todo = [fid for fid, _ in prioritize.ranked(10**9)]  # excludes already-profiled
    batches = [todo[i:i + BATCH_SIZE] for i in range(0, len(todo), BATCH_SIZE)]
    log(f"{len(todo)} profile-less feasts in {len(batches)} batches of {BATCH_SIZE}")
    if DRY_RUN:
        for n, b in enumerate(batches, 1):
            log(f"[dry-run] batch {n}: {b[0]}..{b[-1]} ({len(b)})")
        return 0

    waits = 0  # consecutive full-window waits with no success between → weekly signal
    date = f"{datetime.now():%F}"
    for n, batch in enumerate(batches, 1):
        if _stop_requested:
            write_state(status="stopped", batch=n, total=len(batches), reason="sigterm")
            notify(f"feastgen stopped cleanly at batch {n} (SIGTERM). "
                   f"Resume with `make feast-run`.")
            return 0
        errs = 0
        while True:
            remaining = sorted(set(batch) - profiles_present(batch))
            if not remaining:                   # whole batch already on disk
                log(f"batch {n}/{len(batches)} already complete")
                break
            write_state(status="running", batch=n, total=len(batches),
                        action="generating", remaining=len(remaining))
            log(f"batch {n}/{len(batches)} ({len(remaining)} ids)")
            t0 = time.monotonic()
            out, rc = run_claude(remaining)
            elapsed = time.monotonic() - t0
            etype = limits.parse_error_type(out)
            if etype is None and rc != 0:
                if limits.hard_startup_failure(out, rc, elapsed):
                    etype = "rate_limit_error"
                    log(f"batch {n}: claude -p exited rc={rc} in {elapsed:.0f}s with no "
                        f"parseable error — treating as a usage-window cap (wait, not skip)")
                else:
                    etype = "error"
                save_error_output(date, n, out, etype)

            if etype is None:
                produced = len(profiles_present(remaining))
                if produced <= 0:               # clean exit, 0 emitted — classify cause
                    etype = limits.zero_production_etype(out)
                    save_error_output(date, n, out, etype)
                    log(f"batch {n}: emitted 0/{len(remaining)} profiles — "
                        f"classified '{etype}'")
                else:
                    waits = 0
                    format_profiles(remaining)
                    if produced < len(remaining):
                        log(f"batch {n}: {produced}/{len(remaining)} produced; "
                            f"rest retried on resume")
                    log(f"batch {n} done")
                    break

            if limits.is_terminal(etype):       # billing / auth — waiting won't help
                write_state(status="stopped", batch=n, total=len(batches), reason=etype)
                notify(f"feastgen STOPPED on batch {n}: terminal error '{etype}'. "
                       f"Fix it and re-run. Profiles already written are saved.")
                return 3

            if etype == "rate_limit_error":
                if waits >= WEEKLY_AFTER_WAITS:  # waiting stopped helping → weekly cap
                    write_state(status="stopped", batch=n, total=len(batches),
                                reason="likely-weekly-cap")
                    notify(f"feastgen STOPPED on batch {n}: still rate-limited after "
                           f"{waits} full-window waits — almost certainly the weekly "
                           f"cap. Resume next cycle. Profiles saved.")
                    return 2
                wait = limits.retry_after_seconds(out) or RESUME_AFTER
                resume_at = (datetime.now() + timedelta(seconds=wait)).strftime("%F %T")
                waits += 1
                write_state(status="sleeping", batch=n, total=len(batches),
                            action="rate-limited", resume_at=resume_at,
                            wait=f"{waits}/{WEEKLY_AFTER_WAITS}")
                notify(f"feastgen rate-limited on batch {n}; sleeping until ~{resume_at} "
                       f"(window-reset attempt {waits}/{WEEKLY_AFTER_WAITS}).")
                time.sleep(wait)
                continue

            errs += 1                           # unknown, non-terminal error
            if errs >= MAX_ERR:
                log(f"batch {n}: {errs}× error '{etype}'; skipping (re-run later to retry).")
                break
            backoff = min(60 * 2 ** errs, 1800)
            log(f"batch {n} error '{etype}'; backoff {backoff}s")
            time.sleep(backoff)

    write_state(status="done", total=len(batches))
    notify("feastgen ALL DONE — feast-profile backlog generated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
