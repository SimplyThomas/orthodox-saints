"""hostlib.py — the Heavenly Hosts database (HH-####).

Third sibling of the saints/feasts pipelines: data/heavenly_hosts.csv is SOURCE
OF TRUTH, this module loads it, assigns blank HH-#### ids (writing them back),
validates fail-loud, and emits public/hosts.json. Orchestrated by build.py;
never run directly. Design spec:
docs/superpowers/specs/2026-07-07-heavenly-hosts-database-design.md.

The angelic ranks, named archangels, and individual angels of Scripture and
Tradition. Angels are excluded from data/saints.csv (CLAUDE.md §7); this is
where the bodiless powers become first-class records. Central commitment:
source-register fidelity (Scripture / Deuterocanon / Holy Tradition / Liturgical
/ Patristic / Second Temple / Early Christian / Later Tradition never blurred).
"""

from __future__ import annotations

import csv
import json
import re
import urllib.parse
from pathlib import Path

import feastlib  # reused: MONTHS / _check_month_day for Feast Day(s) tokens

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
PUBLIC = ROOT / "public"
STATIC = ROOT / "static"  # Astro publicDir; self-hosted icons live in static/icons/
HOSTS_CSV = DATA / "heavenly_hosts.csv"
HOST_PROFILES_DIR = ROOT / "src" / "content" / "hosts"

# Self-hosted host portraits (data/host_images.csv), same shape + licensing gate
# as data/saint_images.csv (§9): one row per host, an existing local file under
# static/, and an accepted OPEN license (CC-BY* requires a credit).
HOST_IMAGES_CSV = DATA / "host_images.csv"
HOST_IMAGES_HEADER = ["host_id", "image_path", "license", "credit", "source"]
# Additional depictions (data/host_depictions.csv) power the host page's
# "Depictions & Icons" carousel — MANY images per host, same licensing gate as
# host_images (open license OR Permission:<vendor>), each with card metadata.
HOST_DEPICTIONS_CSV = DATA / "host_depictions.csv"
HOST_DEPICTIONS_HEADER = ["host_id", "image_path", "license", "credit", "source",
                          "kind", "tag", "title", "era", "by"]
DEPICTION_KINDS = {"museum", "iconographer", "shop"}
OPEN_LICENSES = {"PD", "PD-art", "PD-old", "CC0"}
OPEN_LICENSE_LIST = "PD / PD-art / PD-old / CC0 / CC-BY / CC-BY-SA"

# Vendor-permission images (CLAUDE.md §9): a revocable, per-vendor grant recorded
# in data/image_permissions.csv. A host image may use `license = Permission:<slug>`
# instead of an open license; the file lives under static/icons/permission/<slug>/
# and the record MUST carry a `source` linking the specific vendor icon page
# (often the grant condition). Same registry the saint images use.
IMAGE_PERMISSIONS_CSV = DATA / "image_permissions.csv"
IMAGE_PERMISSIONS_HEADER = [
    "vendor_slug", "vendor_name", "attribution", "homepage", "granted", "status", "terms"]
PERMISSION_LICENSE_RE = re.compile(r"^Permission:([a-z0-9]+(?:-[a-z0-9]+)*)$")


def license_ok(lic: str) -> bool:
    lic = lic.strip()
    return lic in OPEN_LICENSES or bool(re.match(r"^CC-BY(-SA)?(-\d(\.\d)?)?$", lic))


def license_requires_credit(lic: str) -> bool:
    return lic.strip().upper().startswith("CC-BY")


def permission_slug(lic: str) -> str | None:
    """Return the vendor slug if `lic` is a `Permission:<slug>` token, else None."""
    m = PERMISSION_LICENSE_RE.match(lic.strip())
    return m.group(1) if m else None


def load_image_permissions() -> dict[str, dict[str, str]]:
    """vendor_slug -> {name, attribution, homepage, granted, status, terms}.
    Loads ALL rows (incl. revoked); validation decides. Empty if file absent."""
    out: dict[str, dict[str, str]] = {}
    if not IMAGE_PERMISSIONS_CSV.exists():
        return out
    with IMAGE_PERMISSIONS_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != IMAGE_PERMISSIONS_HEADER:
            raise SystemExit(f"FATAL: {IMAGE_PERMISSIONS_CSV} header must be "
                             f"{IMAGE_PERMISSIONS_HEADER}, got {reader.fieldnames!r}")
        for row in reader:
            slug = (row.get("vendor_slug") or "").strip()
            if not slug:
                continue
            out[slug] = {
                "name": (row.get("vendor_name") or "").strip(),
                "attribution": (row.get("attribution") or "").strip(),
                "homepage": (row.get("homepage") or "").strip(),
                "granted": (row.get("granted") or "").strip(),
                "status": (row.get("status") or "").strip(),
                "terms": (row.get("terms") or "").strip(),
            }
    return out

HOSTS_HEADER = [
    "Host ID", "Name", "Also Known As", "Entity Type", "Celestial Order",
    "Canonical Status", "Primary Source", "Scripture References",
    "Deuterocanonical Sources", "Extra-Biblical Sources", "Feast Day(s)",
    "Related Feasts", "Related Saints", "Related Beings", "Brief", "Tags",
    "Icon", "Notes", "Sources",
]

# Controlled columns -> vocabulary category. All four are single-value.
CONTROLLED = {
    "Entity Type": "Entity Type",
    "Celestial Order": "Celestial Order",
    "Canonical Status": "Canonical Status",
    "Primary Source": "Host Source Type",
}
SINGLE_VALUE = set(CONTROLLED)
REQUIRED = ["Name", "Entity Type", "Canonical Status", "Brief", "Sources"]
MULTI_SEP = "; "

HH_ID_RE = re.compile(r"^HH-\d{4,}$")
OS_ID_RE = re.compile(r"^OS-\d{4,}$")
FF_ID_RE = re.compile(r"^FF-\d{4,}$")

# The nine Dionysian ranks, in descending hierarchy — drives both the sort and
# the derived triad. Index 0..8 == hierarchy rank 1..9.
NINE_ORDERS = ["Seraphim", "Cherubim", "Thrones", "Dominions", "Virtues",
               "Powers", "Principalities", "Archangels", "Angels"]
ORDER_INDEX = {name: i for i, name in enumerate(NINE_ORDERS)}
# Triad is DERIVED from Celestial Order, never authored (mirrors feasts' cycle).
TRIAD = ["First", "First", "First", "Second", "Second", "Second",
         "Third", "Third", "Third"]

RANK_TYPE = "Angelic Rank"
NAMED_TYPE = "Named Angel"

# Entity Type -> sort bucket (ranks first, then named, then the rest).
TYPE_ORDER = {"Angelic Rank": 0, "Named Angel": 1, "Scriptural Angel": 2,
              "Angelic Class": 3, "Collective": 4, "Fallen": 5}

# Short JSON keys (the saints data.json convention). Date/derived fields are
# handled in to_record().
JSON_KEYS = {
    "Host ID": "id", "Name": "name", "Also Known As": "aka",
    "Entity Type": "entityType", "Celestial Order": "order",
    "Canonical Status": "canonicalStatus", "Primary Source": "primarySource",
    "Scripture References": "scripture",
    "Deuterocanonical Sources": "deuterocanonical",
    "Extra-Biblical Sources": "extraBiblical", "Feast Day(s)": "feasts",
    "Related Feasts": "relatedFeasts", "Related Saints": "relatedSaints",
    "Related Beings": "relatedBeings", "Brief": "brief", "Tags": "tags",
    "Icon": "icon", "Notes": "notes", "Sources": "sources",
}
ARRAY_COLUMNS = {"Also Known As", "Scripture References",
                 "Deuterocanonical Sources", "Extra-Biblical Sources",
                 "Feast Day(s)", "Related Feasts", "Related Saints",
                 "Related Beings", "Tags", "Sources"}


def split_multi(value: str) -> list[str]:
    return [v.strip() for v in value.split(MULTI_SEP) if v.strip()]


def derive_triad(order: str) -> str | None:
    i = ORDER_INDEX.get(order.strip())
    return TRIAD[i] if i is not None else None


# --------------------------------------------------------------------------- #
# Self-hosted host portraits (data/host_images.csv) — the saint_images pattern
# --------------------------------------------------------------------------- #
def load_host_images() -> dict[str, dict[str, str]]:
    """host_id -> {path, license, credit, source}. Empty if the file is absent."""
    out: dict[str, dict[str, str]] = {}
    if not HOST_IMAGES_CSV.exists():
        return out
    with HOST_IMAGES_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != HOST_IMAGES_HEADER:
            raise SystemExit(f"FATAL: {HOST_IMAGES_CSV} header must be "
                             f"{HOST_IMAGES_HEADER}, got {reader.fieldnames!r}")
        for row in reader:
            hid = (row.get("host_id") or "").strip()
            if not hid:
                continue
            out[hid] = {
                "path": (row.get("image_path") or "").strip(),
                "license": (row.get("license") or "").strip(),
                "credit": (row.get("credit") or "").strip(),
                "source": (row.get("source") or "").strip(),
            }
    return out


def image_thumb(path: str) -> str | None:
    """static/-relative avatar thumb for a portrait, or None (missing → degrade
    to the full image, never a 404). Thumbs mirror icons/ under icons/thumbs/."""
    if re.match(r"^(https?:)?//", path) or not path.startswith("icons/"):
        return None
    rel = path[len("icons/"):]
    stem, _, _ = rel.rpartition(".")
    thumb = f"icons/thumbs/{stem or rel}.jpg"
    return thumb if (STATIC / thumb).is_file() else None


def validate_host_images(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """§9 gate: known host, an existing local file under static/, and either an
    accepted open license (with a credit when CC-BY* requires one) OR a
    Permission:<vendor> token validated against data/image_permissions.csv
    (revoked vendor warns + is excluded from output, not an error)."""
    errors: list[str] = []
    warnings: list[str] = []
    images = load_host_images()
    permissions = load_image_permissions()
    for hid, img in images.items():
        where = f"host_images {hid}"
        if hid not in valid_ids:
            errors.append(f"{where}: not a known Host ID")
        path, lic, credit, source = (img["path"], img["license"],
                                     img["credit"], img["source"])
        if not path:
            errors.append(f"{where}: empty image_path")
        elif not re.match(r"^(https?:)?//", path) and not (STATIC / path).is_file():
            errors.append(f"{where}: image_path {path!r} not found under "
                          f"static/ (expected {(STATIC / path)})")
        slug = permission_slug(lic)
        if not lic:
            errors.append(f"{where}: empty license — must be an open license "
                          f"({OPEN_LICENSE_LIST}) or a Permission:<vendor> token")
        elif slug is not None:
            vendor = permissions.get(slug)
            if vendor is None:
                errors.append(f"{where}: permission vendor {slug!r} is not in "
                              f"data/image_permissions.csv")
            elif vendor.get("status") == "revoked":
                warnings.append(f"{where}: vendor {slug!r} permission is REVOKED "
                                f"— image excluded; delete the file under "
                                f"static/icons/permission/{slug}/")
            elif not source:
                errors.append(f"{where}: permission image requires a 'source' "
                              f"linking the specific vendor icon page (§9)")
        elif not license_ok(lic):
            errors.append(f"{where}: license {lic!r} is not an accepted open "
                          f"license ({OPEN_LICENSE_LIST}) or a Permission:<vendor> "
                          f"token")
        elif license_requires_credit(lic) and not credit:
            errors.append(f"{where}: license {lic} requires a credit")
        if not source and slug is None:
            warnings.append(f"{where}: no source link for provenance review")
    return errors, warnings


def load_host_depictions() -> dict[str, list[dict[str, str]]]:
    """host_id -> ordered list of {path, license, credit, source, kind, tag,
    title, era, by} (the carousel cards). MANY rows per host, in file order."""
    out: dict[str, list[dict[str, str]]] = {}
    if not HOST_DEPICTIONS_CSV.exists():
        return out
    with HOST_DEPICTIONS_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != HOST_DEPICTIONS_HEADER:
            raise SystemExit(f"FATAL: {HOST_DEPICTIONS_CSV} header must be "
                             f"{HOST_DEPICTIONS_HEADER}, got {reader.fieldnames!r}")
        for row in reader:
            hid = (row.get("host_id") or "").strip()
            if not hid:
                continue
            out.setdefault(hid, []).append(
                {k: (row.get(c) or "").strip() for k, c in (
                    ("path", "image_path"), ("license", "license"),
                    ("credit", "credit"), ("source", "source"),
                    ("kind", "kind"), ("tag", "tag"), ("title", "title"),
                    ("era", "era"), ("by", "by"))})
    return out


def validate_host_depictions(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """Same §9 licensing gate as host_images (open license OR Permission:<vendor>),
    but MANY rows per host and a `kind` in {museum, iconographer, shop}."""
    errors: list[str] = []
    warnings: list[str] = []
    permissions = load_image_permissions()
    for hid, cards in load_host_depictions().items():
        if hid not in valid_ids:
            errors.append(f"host_depictions {hid}: not a known Host ID")
        for d in cards:
            where = f"host_depictions {hid} ({d['title'] or d['path']})"
            path, lic, credit, source, kind = (d["path"], d["license"],
                                               d["credit"], d["source"], d["kind"])
            if not path:
                errors.append(f"{where}: empty image_path")
            elif not re.match(r"^(https?:)?//", path) and not (STATIC / path).is_file():
                errors.append(f"{where}: image_path {path!r} not found under static/")
            if kind and kind not in DEPICTION_KINDS:
                errors.append(f"{where}: kind {kind!r} not in "
                              f"{sorted(DEPICTION_KINDS)}")
            slug = permission_slug(lic)
            if not lic:
                errors.append(f"{where}: empty license (open license or "
                              f"Permission:<vendor>)")
            elif slug is not None:
                vendor = permissions.get(slug)
                if vendor is None:
                    errors.append(f"{where}: permission vendor {slug!r} not in "
                                  f"data/image_permissions.csv")
                elif vendor.get("status") == "revoked":
                    warnings.append(f"{where}: vendor {slug!r} REVOKED — depiction "
                                    f"excluded")
                elif not source:
                    errors.append(f"{where}: permission depiction requires a "
                                  f"'source' linking the vendor icon page (§9)")
            elif not license_ok(lic):
                errors.append(f"{where}: license {lic!r} is not an accepted open "
                              f"license ({OPEN_LICENSE_LIST}) or Permission:<vendor>")
            elif license_requires_credit(lic) and not credit:
                errors.append(f"{where}: license {lic} requires a credit")
    return errors, warnings


# --------------------------------------------------------------------------- #
# Load / assign ids / write back (same contract as build.py / feastlib)
# --------------------------------------------------------------------------- #
def load_hosts() -> tuple[list[str], list[dict[str, str]]]:
    if not HOSTS_CSV.exists():
        return HOSTS_HEADER, []
    with open(HOSTS_CSV, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if header != HOSTS_HEADER:
            raise SystemExit(
                f"FATAL: {HOSTS_CSV} header must be {HOSTS_HEADER}, "
                f"got {header!r}")
        rows = [dict(zip(header, r)) for r in reader if any(c.strip() for c in r)]
    return HOSTS_HEADER, rows


def assign_ids(rows: list[dict[str, str]]) -> bool:
    """Assign the next sequential HH-#### to any blank Host ID. Mutates rows in
    place; returns True if any ID was assigned. Pure (no file I/O)."""
    max_num = 0
    for r in rows:
        m = re.match(r"^HH-(\d+)$", r["Host ID"].strip())
        if m:
            max_num = max(max_num, int(m.group(1)))
    assigned = False
    for r in rows:
        if not r["Host ID"].strip():
            max_num += 1
            r["Host ID"] = f"HH-{max_num:04d}"
            assigned = True
            print(f"  assigned {r['Host ID']}  {r['Name']}")
    return assigned


def write_hosts(header: list[str], rows: list[dict[str, str]]) -> None:
    with open(HOSTS_CSV, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)
    print(f"  wrote stable IDs back to {HOSTS_CSV.relative_to(ROOT)}")


# --------------------------------------------------------------------------- #
# Validate (fail loud; same (errors, warnings) contract as build.py / feastlib)
# --------------------------------------------------------------------------- #
def validate(rows: list[dict[str, str]], vocab: dict[str, set[str]],
             saint_ids: set[str],
             feast_ids: set[str]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    id_set = {r["Host ID"].strip() for r in rows}
    seen_names: dict[str, str] = {}
    seen_ids: set[str] = set()

    for r in rows:
        hid = r["Host ID"].strip()
        name = r["Name"].strip()
        where = f"{hid or '(no id)'} {name or '(no name)'}"

        if hid and not HH_ID_RE.match(hid):
            errors.append(f"{where}: Host ID must be HH-#### (4+ digits)")
        if hid in seen_ids:
            errors.append(f"{where}: duplicate Host ID")
        seen_ids.add(hid)

        for col in REQUIRED:
            if not r[col].strip():
                errors.append(f"{where}: required column '{col}' is empty")

        for col, cat in CONTROLLED.items():
            val = r[col].strip()
            if not val:
                continue
            if MULTI_SEP in val:  # every controlled host column is single-value
                errors.append(f"{where}: '{col}' is single-value, got {val!r}")
                continue
            if val not in vocab.get(cat, set()):
                errors.append(f"{where}: '{val}' not in vocabulary category "
                              f"'{cat}' (column '{col}')")

        # A rank IS its order: an Angelic Rank row must name one of the nine
        # orders and set Celestial Order to that same name.
        etype = r["Entity Type"].strip()
        order = r["Celestial Order"].strip()
        if etype == RANK_TYPE:
            if name not in NINE_ORDERS:
                errors.append(f"{where}: Entity Type '{RANK_TYPE}' but Name is "
                              f"not one of the nine orders {NINE_ORDERS}")
            if order and order != name:
                errors.append(f"{where}: an Angelic Rank's Celestial Order "
                              f"({order!r}) must equal its Name ({name!r})")

        # Feast Day(s): each token is a fixed 'Mon D' (reuse the feasts check).
        for tok in split_multi(r["Feast Day(s)"]):
            m = feastlib.FIXED_TOKEN_RE.match(tok)
            if not m:
                errors.append(f"{where}: Feast Day(s) token {tok!r} is not "
                              f"'Mon D' (e.g. 'Nov 8')")
                continue
            err = feastlib._check_month_day(m.group(1), int(m.group(2)))
            if err:
                errors.append(f"{where}: Feast Day(s) {err}")

        for sid in split_multi(r["Related Saints"]):
            if not OS_ID_RE.match(sid):
                errors.append(f"{where}: Related Saints entry {sid!r} "
                              f"is not OS-####")
            elif sid not in saint_ids:
                errors.append(f"{where}: Related Saints {sid} not in "
                              f"data/saints.csv")
        for rfid in split_multi(r["Related Feasts"]):
            if not FF_ID_RE.match(rfid):
                errors.append(f"{where}: Related Feasts entry {rfid!r} "
                              f"is not FF-####")
            elif rfid not in feast_ids:
                errors.append(f"{where}: Related Feasts {rfid} not in "
                              f"data/feasts.csv")
        for rbid in split_multi(r["Related Beings"]):
            if not HH_ID_RE.match(rbid):
                errors.append(f"{where}: Related Beings entry {rbid!r} "
                              f"is not HH-####")
            elif rbid == hid:
                errors.append(f"{where}: Related Beings references itself")
            elif rbid not in id_set:
                errors.append(f"{where}: Related Beings {rbid} not in "
                              f"data/heavenly_hosts.csv")

        if name:
            if name in seen_names:
                warnings.append(f"duplicate host name {name!r} "
                                f"({seen_names[name]} and {hid})")
            seen_names[name] = hid

    p_errors, p_warnings = validate_host_profiles(id_set)
    errors.extend(p_errors)
    warnings.extend(p_warnings)
    i_errors, i_warnings = validate_host_images(id_set)
    errors.extend(i_errors)
    warnings.extend(i_warnings)
    d_errors, d_warnings = validate_host_depictions(id_set)
    errors.extend(d_errors)
    warnings.extend(d_warnings)
    return errors, warnings


HOST_PROFILE_FILE_RE = re.compile(r"^(HH-\d{4,})\.yaml$")
HOST_PROFILE_ID_RE = re.compile(r"^id:\s*(HH-\d{4,})\s*$", re.M)


def validate_host_profiles(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """Cross-check src/content/hosts/*.yaml (the saints/feasts profile pattern):
    filename is HH-####.yaml, names a real host, `id:` matches the filename.
    Shape validation is Zod's job at astro build; this is the Python data gate.
    Empty/missing dir is allowed (no profiles yet)."""
    errors: list[str] = []
    warnings: list[str] = []
    if not HOST_PROFILES_DIR.is_dir():
        return errors, warnings
    for path in sorted(HOST_PROFILES_DIR.glob("*.yaml")):
        m = HOST_PROFILE_FILE_RE.match(path.name)
        if not m:
            errors.append(f"hosts/{path.name}: name must be HH-####.yaml")
            continue
        hid = m.group(1)
        if hid not in valid_ids:
            errors.append(f"hosts/{path.name}: {hid} is not a known Host ID")
        body_id = HOST_PROFILE_ID_RE.search(path.read_text(encoding="utf-8"))
        if not body_id:
            errors.append(f"hosts/{path.name}: missing an `id:` field")
        elif body_id.group(1) != hid:
            errors.append(f"hosts/{path.name}: id {body_id.group(1)} != "
                          f"filename {hid}")
    return errors, warnings


# --------------------------------------------------------------------------- #
# Emit
# --------------------------------------------------------------------------- #
def _sort_key(rec: dict) -> tuple[int, int, str]:
    """Celestial hierarchy first (Seraphim..Angels), grouped by entity type
    (ranks, then named, then scriptural, classes, collectives, fallen), then
    by name — a stable, readable ordering for the browse index."""
    order_i = ORDER_INDEX.get(rec.get("order", ""), len(NINE_ORDERS))
    type_i = TYPE_ORDER.get(rec.get("entityType", ""), 9)
    return (type_i, order_i, rec.get("name", ""))


def to_record(r: dict[str, str], profile_ids: set[str],
              images: dict[str, dict[str, str]],
              permissions: dict[str, dict[str, str]],
              depictions: dict[str, list[dict[str, str]]]) -> dict:
    rec: dict = {}
    for col, key in JSON_KEYS.items():
        val = r[col].strip()
        if col == "Icon":
            q = urllib.parse.quote_plus(r["Name"].strip())
            rec[key] = val or (f"https://www.google.com/search?tbm=isch&q={q}"
                               f"+orthodox+icon")
            continue
        if not val:
            continue  # empty optionals are omitted from the JSON
        rec[key] = split_multi(val) if col in ARRAY_COLUMNS else val
    # Derived, never authored.
    rec["named"] = r["Entity Type"].strip() == NAMED_TYPE
    triad = derive_triad(r["Celestial Order"])
    if triad:
        rec["triad"] = triad
    rec["profileType"] = "host"
    hid = r["Host ID"].strip()
    rec["hasProfile"] = hid in profile_ids
    # Self-hosted portrait. An OPEN-license image emits image/imageCredit/
    # imageLicense/imageSource; a VENDOR-PERMISSION image (license = Permission:
    # <vendor>) emits imagePermission/imageVendor/imageAttribution/
    # imageVendorHome + imageSource (the buy page), and is dropped entirely if the
    # grant is revoked (monogram fallback). Mirrors the saint-image emit.
    img = images.get(hid)
    if img and img["path"]:
        slug = permission_slug(img["license"])
        if slug is not None:
            vendor = permissions.get(slug)
            if vendor and vendor.get("status") != "revoked":
                rec["image"] = img["path"]
                thumb = image_thumb(img["path"])
                if thumb:
                    rec["imageThumb"] = thumb
                rec["imagePermission"] = True
                rec["imageVendor"] = vendor.get("name", "")
                rec["imageAttribution"] = vendor.get("attribution", "")
                rec["imageVendorHome"] = vendor.get("homepage", "")
                if img["source"]:
                    rec["imageSource"] = img["source"]
            # revoked / unknown vendor -> no image key (monogram fallback)
        else:
            rec["image"] = img["path"]
            thumb = image_thumb(img["path"])
            if thumb:
                rec["imageThumb"] = thumb
            if img["license"]:
                rec["imageLicense"] = img["license"]
            if img["credit"]:
                rec["imageCredit"] = img["credit"]
            if img["source"]:
                rec["imageSource"] = img["source"]
    rec["imageAvailable"] = "image" in rec
    # "Depictions & Icons" carousel (data/host_depictions.csv) — many cards per
    # host, in file order. Permission cards carry permission/vendor/attribution
    # and are dropped if the grant is revoked; open cards keep license/credit.
    deps = depictions.get(hid)
    if deps:
        cards: list[dict] = []
        for d in deps:
            if not d.get("path"):
                continue
            card: dict = {"image": d["path"], "kind": d.get("kind") or "museum",
                          "title": d.get("title", "")}
            for k in ("tag", "era", "by"):
                if d.get(k):
                    card[k] = d[k]
            if d.get("source"):
                card["source"] = d["source"]
            dslug = permission_slug(d.get("license", ""))
            if dslug is not None:
                vendor = permissions.get(dslug)
                if not vendor or vendor.get("status") == "revoked":
                    continue  # unknown / revoked vendor -> exclude card
                card["permission"] = True
                card["vendor"] = vendor.get("name", "")
                card["attribution"] = vendor.get("attribution", "")
            else:
                if d.get("license"):
                    card["license"] = d["license"]
                if d.get("credit"):
                    card["credit"] = d["credit"]
            cards.append(card)
        if cards:
            rec["depictions"] = cards
    return rec


def _profile_ids() -> set[str]:
    if not HOST_PROFILES_DIR.is_dir():
        return set()
    return {m.group(1) for p in HOST_PROFILES_DIR.glob("*.yaml")
            if (m := HOST_PROFILE_FILE_RE.match(p.name))}


def emit_hosts_json(rows: list[dict[str, str]]) -> list[dict]:
    pids = _profile_ids()
    images = load_host_images()
    permissions = load_image_permissions()
    depictions = load_host_depictions()
    records = sorted(
        (to_record(r, pids, images, permissions, depictions) for r in rows),
        key=_sort_key)
    PUBLIC.mkdir(exist_ok=True)
    with open(PUBLIC / "hosts.json", "w", encoding="utf-8") as f:
        json.dump({"hosts": records}, f, ensure_ascii=False,
                  separators=(",", ":"))
    print(f"  wrote public/hosts.json ({len(records)} hosts)")
    return records
