"""Write a per-feast profile YAML file in the content-collection format
(src/content/feasts/FF-####.yaml). Authoring-only; needs pyyaml.

Mirror of tools/profilegen/emit.py with the FF id gate; `yaml` is imported
lazily so the test suite loads without pyyaml (authoring-only dependency)."""
import re
from pathlib import Path

ID_RE = re.compile(r"^FF-\d{4,}$")


def write_profile(profiles_dir: Path, profile: dict, *, sources: list[str],
                  generated: str, status: str = "draft",
                  flag_reasons: list[dict] | None = None) -> Path:
    import yaml

    fid = (profile.get("id") or "").strip()
    if not ID_RE.match(fid):
        raise ValueError(f"feast profile id must be FF-####, got {fid!r}")
    # Mirror the Zod gate (src/content.config.ts): draft/flagged profiles MUST
    # cite a source. Fail loudly here rather than emit a YAML that reds the build.
    if status != "reviewed" and not [s for s in (sources or []) if (s or "").strip()]:
        raise ValueError(
            f"{fid}: {status} profile must list >=1 source (build would reject)")
    full = {**profile, "id": fid, "status": status,
            "sources": sources, "generated": generated}
    if flag_reasons:
        full["flagReasons"] = flag_reasons
    profiles_dir.mkdir(parents=True, exist_ok=True)
    path = profiles_dir / f"{fid}.yaml"
    path.write_text(
        yaml.safe_dump(full, allow_unicode=True, sort_keys=False, width=10000),
        encoding="utf-8",
    )
    return path
