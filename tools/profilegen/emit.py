"""Write a per-saint profile YAML file in Plan 1's content-collection format
(src/content/profiles/OS-####.yaml). Authoring-only; needs pyyaml.

`yaml` is imported lazily inside write_profile so this module (and the test
suite that imports it) loads even where pyyaml isn't installed — pyyaml is an
authoring-only dependency, deliberately kept out of requirements.txt (the app
never parses YAML in Python: build.py uses regex, Astro parses it natively)."""
import re
from pathlib import Path

ID_RE = re.compile(r"^OS-\d{4,}$")


def write_profile(profiles_dir: Path, profile: dict, *, sources: list[str],
                  generated: str, status: str = "draft",
                  flag_reasons: list[dict] | None = None) -> Path:
    import yaml

    sid = (profile.get("id") or "").strip()
    if not ID_RE.match(sid):
        raise ValueError(f"profile id must be OS-####, got {sid!r}")
    # Mirror the Zod gate (src/content.config.ts): draft/flagged profiles MUST
    # cite a source. Fail loudly here rather than emit a YAML that reds the build.
    if status != "reviewed" and not [s for s in (sources or []) if (s or "").strip()]:
        raise ValueError(
            f"{sid}: {status} profile must list >=1 source (build would reject)")
    full = {**profile, "id": sid, "status": status,
            "sources": sources, "generated": generated}
    # The verifier's honored concerns (real_flags), surfaced on the flagged banner
    # in previews so a reviewer sees WHY a profile is held back, not just THAT it is.
    if flag_reasons:
        full["flagReasons"] = flag_reasons
    profiles_dir.mkdir(parents=True, exist_ok=True)
    path = profiles_dir / f"{sid}.yaml"
    path.write_text(
        yaml.safe_dump(full, allow_unicode=True, sort_keys=False, width=10000),
        encoding="utf-8",
    )
    return path
