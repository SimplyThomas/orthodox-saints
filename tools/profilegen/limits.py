"""Classify `claude -p --output-format json` output for the overnight runner.

Verified June 2026: the headless JSON error carries a machine-readable `error.type`
but NOT a reset timestamp and NOT a 5-hour-vs-weekly distinction — those aren't
exposed to `claude -p`, and there's no usage API for a personal Max subscription.
So the runner keys off `error.type`, stops on terminal errors, and for rate limits
waits a configured full window (it cannot read the real reset time)."""
import json
import re

# Errors where waiting will NOT help — stop the run immediately.
TERMINAL_TYPES = {
    "billing_error", "authentication_error", "permission_error", "not_found_error",
}


def parse_error_type(out: str) -> str | None:
    """Return `error.type` from claude's JSON / stream-json output, or None on success.
    Falls back to a text scan for a 429 ONLY when the output isn't structured JSON
    (so a successful result whose text mentions e.g. the "429 Martyrs" isn't misread
    as a rate-limit error)."""
    saw_json = False
    for line in (out or "").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            obj = json.loads(line)
        except ValueError:
            continue
        saw_json = True
        if isinstance(obj, dict) and obj.get("type") == "error":
            return (obj.get("error") or {}).get("type") or "error"
    if not saw_json and re.search(
        r"\b429\b|rate.?limit|too many requests", out or "", re.I
    ):
        return "rate_limit_error"
    return None


def is_terminal(error_type: str | None) -> bool:
    """True for errors that won't clear by waiting (billing / auth / permission / not-found)."""
    return error_type in TERMINAL_TYPES


def retry_after_seconds(out: str) -> int | None:
    """Best-effort explicit retry-after, if the output happens to carry one. Usually None
    for subscription (5-hour/weekly) limits — `claude -p` masks the rate-limit headers — so
    the runner must fall back to a configured wait."""
    m = re.search(r"retry.?after[\"':\s]+(\d+)", out or "", re.I)
    return int(m.group(1)) if m else None
