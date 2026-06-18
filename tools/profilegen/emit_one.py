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
from pathlib import Path

from tools.profilegen import coverage, emit

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
    n_ext = sum(1 for e in (dossier.get("external") or [])
                if ((e or {}).get("source") or "").strip())
    chars = dossier_chars(dossier)
    return {
        "saint_id": dossier.get("id", ""),
        "name": dossier.get("name", ""),
        "region": (anchor.get("context") or {}).get("Region of Origin", ""),
        "external_sources": n_ext,
        "dossier_chars": chars,
        "verdict": coverage.verdict(dossier_chars=chars, external_sources=n_ext),
    }


def append_verdict(path: Path, entry: dict) -> None:
    """Append the verifier's verdict to a JSON array, VERBATIM — the nested
    {claim, supported, reason} objects must survive (Plan 3 reads the booleans)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
    data.append(entry)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def record(*, sid: str, date: str, status: str,
           profile: dict, verdict: dict, dossier: dict) -> Path:
    """Write the profile YAML + append the coverage row + persist the verdict.
    `sources` come from the dossier (fallback to whatever Write returned)."""
    sources = sources_from_dossier(dossier) or list(profile.get("sources") or [])
    path = emit.write_profile(
        ROOT / "src" / "content" / "profiles", profile,
        sources=sources, generated=date, status=status,
    )
    coverage.log_row(coverage_path(date), coverage_row(dossier))
    append_verdict(verdicts_path(date),
                   {"id": sid, "status": status, "claims": verdict.get("claims", [])})
    return path


def _load(p: str) -> dict:
    return json.loads(Path(p).read_text(encoding="utf-8"))


def main() -> None:
    ap = argparse.ArgumentParser(description="Deterministic profile Emit bookkeeping.")
    ap.add_argument("--id", required=True)
    ap.add_argument("--date", required=True)
    ap.add_argument("--status", required=True, choices=["draft", "flagged"])
    ap.add_argument("--profile-file", required=True)
    ap.add_argument("--verdict-file", required=True)
    ap.add_argument("--dossier-file", required=True)
    a = ap.parse_args()
    path = record(sid=a.id, date=a.date, status=a.status,
                  profile=_load(a.profile_file), verdict=_load(a.verdict_file),
                  dossier=_load(a.dossier_file))
    print(f"wrote {path} (status={a.status})")


if __name__ == "__main__":
    main()
