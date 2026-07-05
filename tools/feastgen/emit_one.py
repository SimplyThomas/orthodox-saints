"""Deterministic Emit-stage bookkeeping for one feast (the profilegen pattern).

Same contract as tools/profilegen/emit_one.py: the Emit agent writes the
upstream artifacts (profile/verdict/dossier JSON) verbatim and runs this one
command; every path is pinned here, the final draft/flagged status is
recomputed from the verdict (phantom flags demoted, never silently dropped),
and `sources` is derived from the dossier so a draft never ships source-less.

The text-normalization and verdict-log helpers are imported from profilegen —
they are profile-shape-agnostic; only profile_text() (which fields carry human
prose) is feast-specific."""
import argparse
import csv
import json
from pathlib import Path

# Shape-agnostic helpers shared with the saints pipeline (see module docstring).
from tools.profilegen.emit_one import _norm, append_verdict
from tools.feastgen import dossier as dossier_mod, emit

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"
FEAST_PROFILES_DIR = ROOT / "src" / "content" / "feasts"

LOG_HEADER = ["feast_id", "name", "category", "external_sources",
              "dossier_chars", "verdict"]


def coverage_path(date: str) -> Path:
    """The ONE canonical coverage log for a batch (no per-agent freelancing)."""
    return DIST / f"feastgen_{date}.csv"


def verdicts_path(date: str) -> Path:
    """The ONE canonical verbatim verdict log for a batch."""
    return DIST / f"feastgen_{date}_verdicts.json"


def sources_from_dossier(dossier: dict) -> list[str]:
    """Anchor citations first, then each external item's source URL — deduped,
    order-preserving, no blanks (the never-source-less guarantee)."""
    out: list[str] = []
    seen: set[str] = set()
    anchor = dossier.get("anchor") or {}
    candidates = list(anchor.get("sources") or [])
    candidates += [(e or {}).get("source") for e in (dossier.get("external") or [])]
    for s in candidates:
        s = (s or "").strip()
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


def reanchor(dossier: dict) -> dict:
    """Restore name + anchor.context + anchor.sources from the authoritative
    feasts.csv row — the Gather agent sometimes overwrites the seeded values.
    `external[]` (the real gather contribution) is untouched. Unknown ids pass
    through unchanged (synthetic test dossiers)."""
    fid = (dossier.get("id") or "").strip()
    try:
        base = dossier_mod.for_id(fid)
    except SystemExit:
        return dossier
    anchor = {**(dossier.get("anchor") or {}),
              "context": base["anchor"]["context"],
              "sources": base["anchor"]["sources"]}
    return {**dossier, "name": base["name"], "anchor": anchor}


def dossier_chars(dossier: dict) -> int:
    """Total factual material in the dossier — anchor prose + external extracts."""
    anchor = dossier.get("anchor") or {}
    n = sum(len(anchor.get(k) or "")
            for k in ("brief", "notes", "customs", "fastingNotes"))
    for e in dossier.get("external") or []:
        n += len((e or {}).get("text") or "")
    return n


def coverage_verdict(*, chars: int, external_sources: int) -> str:
    if external_sources == 0:
        return "none"
    if external_sources >= 2 and chars >= 1500:
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


def coverage_row(dossier: dict) -> dict:
    anchor = dossier.get("anchor") or {}
    n_ext = len({((e or {}).get("source") or "").strip()
                 for e in (dossier.get("external") or [])
                 if ((e or {}).get("source") or "").strip()})
    chars = dossier_chars(dossier)
    return {
        "feast_id": dossier.get("id", ""),
        "name": dossier.get("name", ""),
        "category": (anchor.get("context") or {}).get("Category", ""),
        "external_sources": n_ext,
        "dossier_chars": chars,
        "verdict": coverage_verdict(chars=chars, external_sources=n_ext),
    }


def profile_text(profile: dict) -> str:
    """Every line of human prose in the FEAST profile, concatenated — the corpus
    a verifier claim's `quote` must be found in (phantom-flag detection)."""
    parts: list[str] = []
    for key in ("overview", "history", "meaning", "iconography",
                "hymnography", "fastingPractice", "customs"):
        parts += [s for s in (profile.get(key) or []) if isinstance(s, str)]
    for t in profile.get("timeline") or []:
        if isinstance(t, dict):
            parts += [str(t.get(k, "")) for k in ("when", "title", "body")]
    for sec in profile.get("sections") or []:
        if isinstance(sec, dict):
            parts.append(str(sec.get("heading", "")))
            parts += [s for s in (sec.get("body") or []) if isinstance(s, str)]
    for s in profile.get("scripture") or []:
        if isinstance(s, dict):
            parts += [str(s.get("ref", "")), str(s.get("note", ""))]
    return "\n".join(parts)


def reconcile_status(profile: dict, verdict: dict) -> tuple[str, list[dict]]:
    """Recompute draft/flagged deterministically, dropping PHANTOM flags — an
    unsupported claim whose `quote` is not actually present in the profile. A
    flag is HONORED when its quote is found, or when the claim carries no quote
    at all (can't disprove it → trust the adversarial verifier)."""
    unsupported = [c for c in (verdict.get("claims") or [])
                   if isinstance(c, dict) and not c.get("supported", True)]
    if not unsupported:
        return "draft", []
    hay = _norm(profile_text(profile))
    real, phantom = [], []
    for c in unsupported:
        quote = (c.get("quote") or "").strip()
        (phantom if quote and _norm(quote) not in hay else real).append(c)
    return ("flagged" if real else "draft"), phantom


def real_flags(profile: dict, verdict: dict) -> list[dict]:
    """The HONORED (non-phantom) unsupported claims as {claim, detail} rows for
    the flagged banner — mirrors reconcile_status's real/phantom split."""
    unsupported = [c for c in (verdict.get("claims") or [])
                   if isinstance(c, dict) and not c.get("supported", True)]
    if not unsupported:
        return []
    hay = _norm(profile_text(profile))
    out: list[dict] = []
    for c in unsupported:
        quote = (c.get("quote") or "").strip()
        if quote and _norm(quote) not in hay:
            continue  # phantom — the profile never made this claim
        claim = (c.get("claim") or "").strip()
        detail = (c.get("reason") or "").strip()
        if claim or detail:
            out.append({"claim": claim, "detail": detail})
    return out


def record(*, fid: str, date: str, profile: dict, verdict: dict, dossier: dict,
           verifier_status: str | None = None) -> tuple[Path, str, list[dict]]:
    """Write the profile YAML + append the coverage row + persist the verdict.
    Returns (path, final_status, demoted_phantom_claims)."""
    dossier = reanchor(dossier)
    sources = sources_from_dossier(dossier) or list(profile.get("sources") or [])
    status, demoted = reconcile_status(profile, verdict)
    flags = real_flags(profile, verdict) if status == "flagged" else None
    path = emit.write_profile(
        FEAST_PROFILES_DIR, profile,
        sources=sources, generated=date, status=status, flag_reasons=flags,
    )
    log_row(coverage_path(date), coverage_row(dossier))
    entry = {"id": fid, "status": status, "claims": verdict.get("claims", [])}
    if verifier_status and verifier_status != status:
        entry["verifier_status"] = verifier_status
    if demoted:
        entry["demoted_flags"] = demoted
    append_verdict(verdicts_path(date), entry)
    return path, status, demoted


def _load(p: str) -> dict:
    return json.loads(Path(p).read_text(encoding="utf-8"))


def main() -> None:
    ap = argparse.ArgumentParser(description="Deterministic feast Emit bookkeeping.")
    ap.add_argument("--id", required=True)
    ap.add_argument("--date", required=True)
    # The verifier's own call. ADVISORY ONLY: record() recomputes the final
    # status from the verdict (phantom flags demoted) and may override.
    ap.add_argument("--status", required=True, choices=["draft", "flagged"])
    ap.add_argument("--profile-file", required=True)
    ap.add_argument("--verdict-file", required=True)
    ap.add_argument("--dossier-file", required=True)
    a = ap.parse_args()
    path, status, demoted = record(
        fid=a.id, date=a.date, verifier_status=a.status,
        profile=_load(a.profile_file), verdict=_load(a.verdict_file),
        dossier=_load(a.dossier_file))
    note = (f"  [reconciled from verifier '{a.status}': "
            f"{len(demoted)} phantom flag(s) demoted]") if status != a.status else ""
    print(f"wrote {path} (status={status}){note}")


if __name__ == "__main__":
    main()
