"""One-off backfill: add `liturgicalTitle` to existing profiles that lack it.

Design (spec docs/superpowers/specs/2026-06-18-liturgical-title-design.md):
the model only PROPOSES a title string from the saint's anchor row + the
profile's own already-reviewed prose; Python does the surgical one-line YAML
insert. The model never edits the file, so no other field — and no `status` —
is ever disturbed; a `reviewed` profile stays byte-for-byte identical apart from
the single added line. Unsupported / un-groundable titles are dropped (nothing
written) and logged. The batch lands as a PR the user reviews before merge — the
human gate for backfilled titles (CLAUDE.md §12).

Authoring-only (needs pyyaml + the `claude` CLI, like run.py). Not part of the
bulk run.py loop. Auth mirrors the bulk runner: `unset ANTHROPIC_API_KEY` first,
then an OAuth token, else headless bills metered API rates.

Usage:
  python -m tools.profilegen.backfill_titles --dry-run        # list candidates, no LLM, no writes
  python -m tools.profilegen.backfill_titles --ids OS-0001 OS-0065
  python -m tools.profilegen.backfill_titles --limit 10
  python -m tools.profilegen.backfill_titles                  # all candidates
  python -m tools.profilegen.backfill_titles --self-test      # exercise the YAML insert, no LLM
"""
import argparse
import csv
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROFILES_DIR = ROOT / "src" / "content" / "profiles"
SAINTS_CSV = ROOT / "data" / "saints.csv"
RUN_DIR = ROOT / "dist" / "profilegen"
MODEL = os.environ.get("PROFILEGEN_MODEL", "claude-opus-4-8")

# Anchor columns that can legitimately ground a liturgical title's specifics.
TITLE_ANCHOR_COLS = [
    "Name", "Also Known As", "Rank / Type", "Church Status",
    "Region of Origin", "Era", "Century",
]

PROMPT = """\
You are composing ONE field — the full formal liturgical title (the style by \
which an Orthodox saint is named at commemoration) — for an existing, already-\
written saint profile.

Anchor row (the trusted record — it WINS on any conflict):
{anchor}

The profile's own prose (already reviewed; use only as supporting grounding):
{prose}

Compose `liturgicalTitle`: the saint's full formal liturgical style, e.g.
"Our Father among the Saints Nicholas, Archbishop of Myra, the Wonderworker";
"The Holy, Glorious Great-Martyr and Healer Panteleimon"; "Our All-holy,
immaculate, most blessed and glorified Lady, the Theotokos and Ever-Virgin Mary".

RULES:
- Use the conventional honorific register for the saint's RANK ("The Holy,
  Glorious ..." martyr; "Our Father among the Saints ..." hierarch; "The Holy,
  Glorious and All-Praised ..." apostle; "Our Venerable Father/Mother ..."
  monastic). The register itself is liturgical style, not a factual claim.
- Wrap it around GROUNDED specifics only — an office, see/place, or epithet that
  appears in the anchor row or the profile prose. NEVER invent an office, see,
  place, or epithet.
- Return the title ONLY if it carries at least one grounded specific BEYOND bare
  rank+name (an office, see/place, or distinguishing epithet). If the record
  grounds nothing beyond rank+name, return null — a bare "Holy Martyr <Name>"
  duplicates the rank tag and adds no value.

Output STRICT JSON and nothing else:
{{"liturgicalTitle": "<the title>", "grounding": "<which anchor/prose words ground the specifics>"}}
or, when not groundable beyond rank+name:
{{"liturgicalTitle": null, "grounding": "<why — no office/see/epithet in the record>"}}
"""


def load_yaml(path: Path) -> dict:
    import yaml
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def anchor_for(sid: str) -> dict | None:
    """Compact anchor (title-relevant columns) for the saint, or None if absent."""
    with open(SAINTS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["Saint ID"].strip() == sid:
                return {c: (row.get(c) or "").strip() for c in TITLE_ANCHOR_COLS}
    return None


def profile_prose(profile: dict) -> str:
    """The profile's own narrative text — overview + section bodies — as grounding."""
    parts = list(profile.get("overview") or [])
    for sec in profile.get("sections") or []:
        parts.extend(sec.get("body") or [])
    return "\n".join(p for p in parts if isinstance(p, str))


def title_line(title: str) -> str:
    """A correctly-escaped single `liturgicalTitle:` YAML line (no fold, no wrap)."""
    import yaml
    return yaml.safe_dump(
        {"liturgicalTitle": title}, allow_unicode=True, width=10**9, sort_keys=False
    ).rstrip("\n")


def insert_title(text: str, title: str) -> str:
    """Surgically insert the title line after `lifespan:` (else after `id:`),
    preserving every other byte and the file's existing newline style."""
    nl = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(nl)
    new_line = title_line(title)
    # Prefer to sit just after lifespan (matches emit's field order); fall back to id.
    for key in ("lifespan:", "id:"):
        for i, ln in enumerate(lines):
            if ln.startswith(key):
                lines.insert(i + 1, new_line)
                return nl.join(lines)
    raise ValueError("profile has neither a `lifespan:` nor an `id:` line")


def propose_title(sid: str, anchor: dict, prose: str) -> tuple[str | None, str]:
    """One `claude -p` call → (title|None, grounding). Raises on a failed call."""
    prompt = PROMPT.format(
        anchor=json.dumps(anchor, ensure_ascii=False, indent=2), prose=prose[:6000]
    )
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", MODEL, "--output-format", "json"],
        capture_output=True, text=True, cwd=ROOT,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"{sid}: claude -p failed (rc={proc.returncode}): "
                           f"{(proc.stderr or proc.stdout)[:300]}")
    envelope = json.loads(proc.stdout)            # claude -p JSON envelope
    result = envelope.get("result", proc.stdout)  # the model's text answer
    m = re.search(r"\{.*\}", result, re.DOTALL)   # first JSON object in the answer
    if not m:
        raise RuntimeError(f"{sid}: no JSON object in model output: {result[:300]}")
    obj = json.loads(m.group(0))
    title = obj.get("liturgicalTitle")
    title = title.strip() if isinstance(title, str) and title.strip() else None
    return title, (obj.get("grounding") or "").strip()


def candidates(ids: list[str] | None, limit: int | None) -> list[Path]:
    paths = sorted(PROFILES_DIR.glob("OS-*.yaml"))
    if ids:
        want = set(ids)
        paths = [p for p in paths if p.stem in want]
    out = []
    for p in paths:
        prof = load_yaml(p)
        if prof.get("liturgicalTitle"):
            continue  # already has one — idempotent / resumable
        out.append(p)
    return out[:limit] if limit else out


def log_path() -> Path:
    return RUN_DIR / f"title_backfill_{datetime.now():%Y%m%d}.csv"


def self_test() -> int:
    """Exercise the surgical insert + escaping without any LLM call."""
    sample = "id: OS-0001\nlifespan: c. 18 BC\noverview:\n  - Foo\nstatus: reviewed\n"
    title = "Our All-holy Lady, the Theotokos: Ever-Virgin Mary"  # colon forces quoting
    out = insert_title(sample, title)
    import yaml
    parsed = yaml.safe_load(out)
    assert parsed["liturgicalTitle"] == title, parsed.get("liturgicalTitle")
    assert parsed["status"] == "reviewed" and parsed["overview"] == ["Foo"], "other fields drifted"
    assert out.splitlines()[2].startswith("liturgicalTitle:"), "wrong insert position"
    # CRLF preservation
    crlf = sample.replace("\n", "\r\n")
    assert "\r\n" in insert_title(crlf, "X the Wonderworker"), "CRLF not preserved"
    print("self-test OK")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", nargs="*", help="restrict to these Saint IDs")
    ap.add_argument("--limit", type=int, help="process at most N profiles")
    ap.add_argument("--dry-run", action="store_true", help="list candidates; no LLM, no writes")
    ap.add_argument("--self-test", action="store_true", help="exercise the YAML insert only")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if os.environ.get("ANTHROPIC_API_KEY"):
        print("WARNING: ANTHROPIC_API_KEY is set — headless `claude -p` bills metered API "
              "rates, not your Max subscription. `unset ANTHROPIC_API_KEY` first.", file=sys.stderr)

    cands = candidates(args.ids, args.limit)
    print(f"{len(cands)} profile(s) without a liturgicalTitle")
    if args.dry_run:
        for p in cands:
            print(f"  would process {p.stem}")
        return 0

    RUN_DIR.mkdir(parents=True, exist_ok=True)
    wrote = dropped = errors = 0
    with open(log_path(), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "name", "status", "decision", "title_or_reason", "grounding"])
        for p in cands:
            sid = p.stem
            prof = load_yaml(p)
            anchor = anchor_for(sid)
            if not anchor:
                print(f"  {sid}: SKIP — no saints.csv row")
                w.writerow([sid, "", prof.get("status", ""), "skip", "no anchor row", ""])
                continue
            try:
                title, grounding = propose_title(sid, anchor, profile_prose(prof))
            except Exception as e:  # one bad call must not abort the batch
                errors += 1
                print(f"  {sid}: ERROR — {e}")
                w.writerow([sid, anchor["Name"], prof.get("status", ""), "error", str(e)[:200], ""])
                continue
            if not title:
                dropped += 1
                print(f"  {sid}: drop — {grounding[:80]}")
                w.writerow([sid, anchor["Name"], prof.get("status", ""), "drop", grounding, ""])
                continue
            p.write_text(insert_title(p.read_text(encoding="utf-8"), title), encoding="utf-8")
            wrote += 1
            print(f"  {sid}: wrote — {title}")
            w.writerow([sid, anchor["Name"], prof.get("status", ""), "wrote", title, grounding])

    print(f"\nwrote {wrote} · dropped {dropped} · errors {errors} · log {log_path()}")
    print("Review the diff before committing — backfilled titles on reviewed profiles "
          "ship without per-title review except this PR (CLAUDE.md §12).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
