"""Write a per-saint profile YAML file in Plan 1's content-collection format
(src/content/profiles/OS-####.yaml). Authoring-only; needs pyyaml."""
import re
from pathlib import Path

import yaml

ID_RE = re.compile(r"^OS-\d{4,}$")


def write_profile(profiles_dir: Path, profile: dict, *, sources: list[str],
                  generated: str, status: str = "draft") -> Path:
    sid = (profile.get("id") or "").strip()
    if not ID_RE.match(sid):
        raise ValueError(f"profile id must be OS-####, got {sid!r}")
    full = {**profile, "id": sid, "status": status,
            "sources": sources, "generated": generated}
    profiles_dir.mkdir(parents=True, exist_ok=True)
    path = profiles_dir / f"{sid}.yaml"
    path.write_text(
        yaml.safe_dump(full, allow_unicode=True, sort_keys=False, width=10000),
        encoding="utf-8",
    )
    return path
