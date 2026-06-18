"""Deterministic Emit-stage bookkeeping for one saint (Grounded Generation §5/§6).

The Emit agent (Haiku) freelanced filenames, garbled coverage-row schemas, and
stringified the verifier's claim objects (calibration batch 1 findings). So all
of that is owned here instead: the agent only writes the upstream artifacts
(profile/verdict/dossier JSON) verbatim and runs this one command. Every path is
pinned, the coverage row is schema-correct, the verdict is persisted verbatim,
and `sources` is derived from the dossier (anchor + external) — never invented —
so a draft never ships `sources: []` and breaks `npm run build`.
"""
import argparse
import json
import re
from pathlib import Path

from tools.profilegen import coverage, dossier as dossier_mod, emit

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"


def coverage_path(date: str) -> Path:
    """The ONE canonical coverage log for a batch (no per-agent freelancing)."""
    return DIST / f"profilegen_{date}.csv"


def verdicts_path(date: str) -> Path:
    """The ONE canonical verbatim verdict log for a batch."""
    return DIST / f"profilegen_{date}_verdicts.json"


def sources_from_dossier(dossier: dict) -> list[str]:
    """The profile's sources, derived from the dossier: anchor citations first,
    then each external item's source URL — deduped, order-preserving, no blanks.
    The anchor row always carries Sources (CSV minimum, §10), so this is the
    deterministic guarantee that a generated profile is never source-less."""
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
    saints.csv row (keyed by the schema-validated id). The Gather agent sometimes
    overwrites the seeded values — e.g. dropping the region context or replacing
    the CSV citation with a fetched URL — so name/region/anchor-sources must come
    from the row, not the model. `external[]` (the real gather contribution) is
    untouched. Unknown ids pass through unchanged (synthetic test dossiers)."""
    sid = (dossier.get("id") or "").strip()
    try:
        base = dossier_mod.for_id(sid)
    except SystemExit:
        return dossier
    anchor = {**(dossier.get("anchor") or {}),
              "context": base["anchor"]["context"],
              "sources": base["anchor"]["sources"]}
    return {**dossier, "name": base["name"], "anchor": anchor}


def dossier_chars(dossier: dict) -> int:
    """Total factual material in the dossier — anchor prose + external extracts."""
    anchor = dossier.get("anchor") or {}
    n = sum(len(anchor.get(k) or "") for k in ("brief", "notes", "customs"))
    for e in dossier.get("external") or []:
        n += len((e or {}).get("text") or "")
    return n


def coverage_row(dossier: dict) -> dict:
    """A schema-correct coverage row (coverage.LOG_HEADER columns)."""
    anchor = dossier.get("anchor") or {}
    n_ext = len({((e or {}).get("source") or "").strip()
                 for e in (dossier.get("external") or [])
                 if ((e or {}).get("source") or "").strip()})
    chars = dossier_chars(dossier)
    return {
        "saint_id": dossier.get("id", ""),
        "name": dossier.get("name", ""),
        "region": (anchor.get("context") or {}).get("Region of Origin", ""),
        "external_sources": n_ext,
        "dossier_chars": chars,
        "verdict": coverage.verdict(dossier_chars=chars, external_sources=n_ext),
    }


def profile_text(profile: dict) -> str:
    """Every line of human prose in the profile, concatenated — the corpus a
    verifier claim's `quote` must be found in. A flagged claim whose text is NOT
    here is one the profile never actually made (the verifier paraphrased or
    invented it), and is discarded as a phantom flag."""
    parts: list[str] = []
    if isinstance(profile.get("lifespan"), str):
        parts.append(profile["lifespan"])
    parts += [s for s in (profile.get("overview") or []) if isinstance(s, str)]
    parts += [s for s in (profile.get("patronage") or []) if isinstance(s, str)]
    for t in profile.get("timeline") or []:
        if isinstance(t, dict):
            parts += [str(t.get(k, "")) for k in ("when", "title", "body")]
    for sec in profile.get("sections") or []:
        if isinstance(sec, dict):
            parts.append(str(sec.get("heading", "")))
            parts += [s for s in (sec.get("body") or []) if isinstance(s, str)]
    return "\n".join(parts)


# Cosmetic glyph differences that must not defeat an honest substring match.
_FOLD = {"‐": "-", "‑": "-", "‒": "-", "–": "-",
         "—": "-", "―": "-", "‘": "'", "’": "'",
         "“": '"', "”": '"', "′": "'"}


def _norm(s: str) -> str:
    """Fold smart quotes/dashes, collapse whitespace, casefold — so a verbatim
    quote still matches across trivial serialization differences."""
    s = s or ""
    for a, b in _FOLD.items():
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip().casefold()


def reconcile_status(profile: dict, verdict: dict) -> tuple[str, list[dict]]:
    """Recompute draft/flagged deterministically, dropping PHANTOM flags — an
    unsupported claim whose `quote` is not actually present in the profile (the
    verifier flagged text the Write stage never emitted; calibration batch 30,
    OS-0695 'Rigoula'). A flag is HONORED when its quote is found in the profile,
    or when the claim carries no quote at all (can't disprove it → trust the
    adversarial verifier, never silently add flags). Returns (status, demoted)."""
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


def append_verdict(path: Path, entry: dict) -> None:
    """Append the verifier's verdict to a JSON array, VERBATIM — the nested
    {claim, supported, reason} objects must survive (Plan 3 reads the booleans)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
    data.append(entry)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def record(*, sid: str, date: str, profile: dict, verdict: dict, dossier: dict,
           verifier_status: str | None = None) -> tuple[Path, str, list[dict]]:
    """Write the profile YAML + append the coverage row + persist the verdict.
    The final draft/flagged status is recomputed here from the verdict via
    reconcile_status (phantom flags demoted), NOT taken on the verifier's word.
    `sources` come from the dossier (fallback to whatever Write returned).
    Returns (path, final_status, demoted_phantom_claims)."""
    dossier = reanchor(dossier)  # name/region/anchor-sources from the CSV, not the model
    sources = sources_from_dossier(dossier) or list(profile.get("sources") or [])
    status, demoted = reconcile_status(profile, verdict)
    path = emit.write_profile(
        ROOT / "src" / "content" / "profiles", profile,
        sources=sources, generated=date, status=status,
    )
    coverage.log_row(coverage_path(date), coverage_row(dossier))
    entry = {"id": sid, "status": status, "claims": verdict.get("claims", [])}
    if verifier_status and verifier_status != status:
        entry["verifier_status"] = verifier_status  # transparency: what changed and why
    if demoted:
        entry["demoted_flags"] = demoted  # phantom flags, kept for monitoring
    append_verdict(verdicts_path(date), entry)
    return path, status, demoted


def _load(p: str) -> dict:
    return json.loads(Path(p).read_text(encoding="utf-8"))


def main() -> None:
    ap = argparse.ArgumentParser(description="Deterministic profile Emit bookkeeping.")
    ap.add_argument("--id", required=True)
    ap.add_argument("--date", required=True)
    # The verifier's own draft/flagged call. ADVISORY ONLY: emit_one recomputes
    # the final status from the verdict (phantom flags demoted) and may override.
    ap.add_argument("--status", required=True, choices=["draft", "flagged"])
    ap.add_argument("--profile-file", required=True)
    ap.add_argument("--verdict-file", required=True)
    ap.add_argument("--dossier-file", required=True)
    a = ap.parse_args()
    path, status, demoted = record(
        sid=a.id, date=a.date, verifier_status=a.status,
        profile=_load(a.profile_file), verdict=_load(a.verdict_file),
        dossier=_load(a.dossier_file))
    note = (f"  [reconciled from verifier '{a.status}': "
            f"{len(demoted)} phantom flag(s) demoted]") if status != a.status else ""
    print(f"wrote {path} (status={status}){note}")


if __name__ == "__main__":
    main()
