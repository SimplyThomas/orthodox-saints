# Festal-icon pipeline (#350) + Theophany A1–A4 wiring (#367) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the festal-icon data pipeline so `/feast/[id]` pages can carry icons, then wire the 56 remaining Theophany Works icons from #367 A1–A4 (26 feast + 12 Christ + 15 Theotokos + 3 saint).

**Architecture:** Mirror `hostlib.py`'s image pipeline verbatim in `feastlib.py` (local licence helpers, `validate_feast_images`/`validate_feast_depictions` folded into `feastlib.validate`, image join in `to_record`). `build.py` needs no change — it already calls `feastlib.validate` + `feastlib.emit_feasts_json`. One small frontend change makes the feast hero caption link to the product page (honoring the Theophany grant). Icons are downloaded from Theophany product pages, resized/thumbed with ImageMagick, self-hosted, and referenced from two new source CSVs.

**Tech Stack:** Python 3.11 (stdlib `csv`/`re`/`json`), Astro/TS frontend, ImageMagick (`magick`) for resize, `curl` for download.

**Two PRs:** Phase 1 (Tasks 1–7) = pipeline + A1, closes #350. Phase 2 (Tasks 8–10) = A2–A4.

---

## File structure

**Phase 1 (PR 1):**
- Modify: `feastlib.py` — image constants, licence helpers, load/validate/join functions.
- Modify: `tests/test_feastlib.py` — tests for the new functions.
- Modify: `src/lib/feasts.ts` — add `imageSource?`/`imagePermission?`/`imageVendor?`/`imageAttribution?` to `Feast`.
- Modify: `src/pages/feast/[id].astro` — hero caption links to `imageSource`.
- Create: `data/feast_images.csv`, `data/feast_depictions.csv` — source of truth.
- Create (git-ignored): `dist/theophany/fetch_icons.py` — the download+resize+thumb helper.
- Create (deploys with site): `static/icons/permission/theophany-works/feasts/*.jpg` + thumbs.
- Modify: `docs/data-model.md` — document the two new feast image CSVs (§5a change → doc update rule).

**Phase 2 (PR 2):**
- Modify: `data/saint_depictions.csv` — append A2–A4 carousel rows.
- Add images under `static/icons/permission/theophany-works/` + thumbs.

---

## PHASE 1 — Festal-icon pipeline + A1

### Task 1: feastlib image constants + licence helpers + loaders

**Files:**
- Modify: `feastlib.py` (add after the existing header constants near the top, ~line 30, and add loader functions near the other `load_*`)
- Test: `tests/test_feastlib.py`

- [ ] **Step 1: Write failing tests** — append to `tests/test_feastlib.py`:

```python
class TestFeastImageHelpers(unittest.TestCase):
    def test_license_ok(self):
        self.assertTrue(feastlib.license_ok("PD"))
        self.assertTrue(feastlib.license_ok("CC-BY-SA-4.0"))
        self.assertFalse(feastlib.license_ok("All rights reserved"))

    def test_permission_slug(self):
        self.assertEqual(feastlib.permission_slug("Permission:theophany-works"),
                         "theophany-works")
        self.assertIsNone(feastlib.permission_slug("PD"))

    def test_load_feast_images_empty_when_absent(self):
        with mock.patch.object(feastlib, "FEAST_IMAGES_CSV",
                               Path("/nonexistent/x.csv")):
            self.assertEqual(feastlib.load_feast_images(), {})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `python -m unittest tests.test_feastlib.TestFeastImageHelpers -v`
Expected: FAIL — `AttributeError: module 'feastlib' has no attribute 'license_ok'`.

- [ ] **Step 3: Add constants + helpers + loaders to `feastlib.py`**

After the existing `DATA = ROOT / "data"` block add (mirroring hostlib.py:29–70):

```python
STATIC = ROOT / "static"  # Astro publicDir; self-hosted icons live in static/icons/

# Self-hosted festal imagery — same shape + §9 licensing gate as data/saint_images
# and data/host_images. One hero per feast (feast_images) + MANY carousel cards
# (feast_depictions), keyed by FF-####. (#350)
FEAST_IMAGES_CSV = DATA / "feast_images.csv"
FEAST_IMAGES_HEADER = ["feast_id", "image_path", "license", "credit", "source"]
FEAST_DEPICTIONS_CSV = DATA / "feast_depictions.csv"
FEAST_DEPICTIONS_HEADER = ["feast_id", "image_path", "license", "credit", "source",
                           "kind", "tag", "title", "era", "by"]
IMAGE_PERMISSIONS_CSV = DATA / "image_permissions.csv"
IMAGE_PERMISSIONS_HEADER = ["vendor_slug", "vendor_name", "attribution",
                            "homepage", "granted", "status", "terms"]
DEPICTION_KINDS = {"museum", "iconographer", "shop"}
OPEN_LICENSES = {"PD", "PD-art", "PD-old", "CC0"}
OPEN_LICENSE_LIST = "PD / PD-art / PD-old / CC0 / CC-BY / CC-BY-SA"
PERMISSION_LICENSE_RE = re.compile(r"^Permission:([a-z0-9]+(?:-[a-z0-9]+)*)$")


def license_ok(lic: str) -> bool:
    lic = lic.strip()
    return lic in OPEN_LICENSES or bool(re.match(r"^CC-BY(-SA)?(-\d(\.\d)?)?$", lic))


def license_requires_credit(lic: str) -> bool:
    return lic.strip().upper().startswith("CC-BY")


def permission_slug(lic: str) -> str | None:
    m = PERMISSION_LICENSE_RE.match(lic.strip())
    return m.group(1) if m else None


def load_image_permissions() -> dict[str, dict[str, str]]:
    """vendor_slug -> row. Empty if the registry is absent."""
    out: dict[str, dict[str, str]] = {}
    if not IMAGE_PERMISSIONS_CSV.exists():
        return out
    with IMAGE_PERMISSIONS_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            slug = (row.get("vendor_slug") or "").strip()
            if slug:
                out[slug] = {k: (row.get(k) or "").strip()
                             for k in IMAGE_PERMISSIONS_HEADER}
    return out


def load_feast_images() -> dict[str, dict[str, str]]:
    """feast_id -> {path, license, credit, source}. Empty if the file is absent."""
    out: dict[str, dict[str, str]] = {}
    if not FEAST_IMAGES_CSV.exists():
        return out
    with FEAST_IMAGES_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != FEAST_IMAGES_HEADER:
            raise SystemExit(f"FATAL: {FEAST_IMAGES_CSV} header must be "
                             f"{FEAST_IMAGES_HEADER}, got {reader.fieldnames!r}")
        for row in reader:
            fid = (row.get("feast_id") or "").strip()
            if not fid:
                continue
            out[fid] = {
                "path": (row.get("image_path") or "").strip(),
                "license": (row.get("license") or "").strip(),
                "credit": (row.get("credit") or "").strip(),
                "source": (row.get("source") or "").strip(),
            }
    return out


def image_thumb(path: str) -> str | None:
    """static/-relative avatar thumb for a festal icon, or None (missing → degrade
    to the full image, never a 404). Thumbs mirror icons/ under icons/thumbs/."""
    if re.match(r"^(https?:)?//", path) or not path.startswith("icons/"):
        return None
    rel = path[len("icons/"):]
    stem, _, _ = rel.rpartition(".")
    thumb = f"icons/thumbs/{stem or rel}.jpg"
    return thumb if (STATIC / thumb).is_file() else None


def load_feast_depictions() -> dict[str, list[dict[str, str]]]:
    """feast_id -> ordered list of {path, license, credit, source, kind, tag,
    title, era, by} (the carousel cards). MANY rows per feast, in file order."""
    out: dict[str, list[dict[str, str]]] = {}
    if not FEAST_DEPICTIONS_CSV.exists():
        return out
    with FEAST_DEPICTIONS_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != FEAST_DEPICTIONS_HEADER:
            raise SystemExit(f"FATAL: {FEAST_DEPICTIONS_CSV} header must be "
                             f"{FEAST_DEPICTIONS_HEADER}, got {reader.fieldnames!r}")
        for row in reader:
            fid = (row.get("feast_id") or "").strip()
            if not fid:
                continue
            out.setdefault(fid, []).append(
                {k: (row.get(c) or "").strip() for k, c in (
                    ("path", "image_path"), ("license", "license"),
                    ("credit", "credit"), ("source", "source"),
                    ("kind", "kind"), ("tag", "tag"), ("title", "title"),
                    ("era", "era"), ("by", "by"))})
    return out
```

Confirm `import csv` and `import re` are already at the top of feastlib.py (they are).

- [ ] **Step 4: Run tests, verify pass**

Run: `python -m unittest tests.test_feastlib.TestFeastImageHelpers -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add feastlib.py tests/test_feastlib.py
git commit -m "feat(feastlib): festal-icon constants, licence helpers, CSV loaders (#350)"
```

---

### Task 2: feastlib image validators + fold into `validate`

**Files:**
- Modify: `feastlib.py` (add `validate_feast_images`/`validate_feast_depictions`; call them from `validate`)
- Test: `tests/test_feastlib.py`

- [ ] **Step 1: Write failing tests** — append to `tests/test_feastlib.py`:

```python
class TestFeastImageValidation(unittest.TestCase):
    def _imgs(self, rows):
        # rows: list of dicts with FEAST_IMAGES_HEADER keys
        import io, csv as _csv
        buf = io.StringIO()
        w = _csv.DictWriter(buf, fieldnames=feastlib.FEAST_IMAGES_HEADER)
        w.writeheader()
        w.writerows(rows)
        buf.seek(0)
        return buf.getvalue()

    def test_unknown_feast_id_errors(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "feast_images.csv"
            p.write_text(self._imgs([{"feast_id": "FF-9999",
                "image_path": "icons/x.jpg", "license": "PD",
                "credit": "", "source": ""}]), encoding="utf-8")
            with mock.patch.object(feastlib, "FEAST_IMAGES_CSV", p):
                errors, _ = feastlib.validate_feast_images({"FF-0001"})
            self.assertTrue(any("not a known Feast ID" in e for e in errors))

    def test_missing_file_errors(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "feast_images.csv"
            p.write_text(self._imgs([{"feast_id": "FF-0001",
                "image_path": "icons/does-not-exist.jpg", "license": "PD",
                "credit": "", "source": ""}]), encoding="utf-8")
            with mock.patch.object(feastlib, "FEAST_IMAGES_CSV", p):
                errors, _ = feastlib.validate_feast_images({"FF-0001"})
            self.assertTrue(any("not found under" in e for e in errors))

    def test_bad_license_errors(self):
        # Use an https path so the file-existence check passes; licence is bad.
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "feast_images.csv"
            p.write_text(self._imgs([{"feast_id": "FF-0001",
                "image_path": "https://example.com/x.jpg",
                "license": "All rights reserved", "credit": "", "source": ""}]),
                encoding="utf-8")
            with mock.patch.object(feastlib, "FEAST_IMAGES_CSV", p):
                errors, _ = feastlib.validate_feast_images({"FF-0001"})
            self.assertTrue(any("not an accepted open license" in e for e in errors))
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `python -m unittest tests.test_feastlib.TestFeastImageValidation -v`
Expected: FAIL — `validate_feast_images` not defined.

- [ ] **Step 3: Add validators to `feastlib.py`** (mirroring hostlib.py:203–320):

```python
def validate_feast_images(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """§9 gate: known feast, an existing local file under static/, and either an
    accepted open license (with a credit when CC-BY* requires one) OR a
    Permission:<vendor> token validated against data/image_permissions.csv
    (revoked vendor warns + is excluded from output, not an error)."""
    errors: list[str] = []
    warnings: list[str] = []
    images = load_feast_images()
    permissions = load_image_permissions()
    for fid, img in images.items():
        where = f"feast_images {fid}"
        if fid not in valid_ids:
            errors.append(f"{where}: not a known Feast ID")
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


def validate_feast_depictions(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """Same §9 licensing gate as feast_images (open license OR Permission:<vendor>),
    but MANY rows per feast, each with a `title` and a `kind` in
    {museum, iconographer, shop}."""
    errors: list[str] = []
    warnings: list[str] = []
    permissions = load_image_permissions()
    for fid, cards in load_feast_depictions().items():
        if fid not in valid_ids:
            errors.append(f"feast_depictions {fid}: not a known Feast ID")
        for d in cards:
            where = f"feast_depictions {fid} ({d['title'] or d['path']})"
            path, lic, credit, source, kind, title = (
                d["path"], d["license"], d["credit"], d["source"],
                d["kind"], d["title"])
            if not path:
                errors.append(f"{where}: empty image_path")
            elif not re.match(r"^(https?:)?//", path) and not (STATIC / path).is_file():
                errors.append(f"{where}: image_path {path!r} not found under static/")
            if not title:
                errors.append(f"{where}: a depiction requires a title")
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
                                  f"'source' (§9)")
            elif not license_ok(lic):
                errors.append(f"{where}: license {lic!r} is not an accepted open "
                              f"license ({OPEN_LICENSE_LIST}) or Permission:<vendor>")
            elif license_requires_credit(lic) and not credit:
                errors.append(f"{where}: license {lic} requires a credit")
    return errors, warnings
```

Then fold both into `validate(...)`. `validate` already has `errors`/`warnings` lists and an
`id_set` computed near its top (`id_set = {r["Feast ID"].strip() for r in rows}`). Reuse
that `id_set` — insert right before the existing `validate_feast_profiles(id_set)` block
(near line 277):

```python
    i_errors, i_warnings = validate_feast_images(id_set)
    d_errors, d_warnings = validate_feast_depictions(id_set)
    errors.extend(i_errors + d_errors)
    warnings.extend(i_warnings + d_warnings)
```

- [ ] **Step 4: Run tests, verify pass**

Run: `python -m unittest tests.test_feastlib.TestFeastImageValidation -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Full feastlib suite still green**

Run: `python -m unittest tests.test_feastlib -v 2>&1 | tail -3`
Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add feastlib.py tests/test_feastlib.py
git commit -m "feat(feastlib): validate feast_images/feast_depictions in feastlib.validate (#350)"
```

---

### Task 3: join festal imagery into `to_record`

**Files:**
- Modify: `feastlib.py` (`to_record` signature + join; `emit_feasts_json` threads the joins)
- Test: `tests/test_feastlib.py`

- [ ] **Step 1: Write failing test** — append to `tests/test_feastlib.py`:

```python
class TestFeastImageJoin(unittest.TestCase):
    PERMS = {"theophany-works": {"vendor_slug": "theophany-works",
             "vendor_name": "Theophany Works",
             "attribution": "Icon used with permission from Theophany Works.",
             "homepage": "https://theophanyworks.com/holy-icons/",
             "granted": "2026-06-17", "status": "active", "terms": ""}}

    def test_permission_hero_and_cards_joined(self):
        row = valid_feast(**{"Feast ID": "FF-0001"})
        images = {"FF-0001": {"path": "icons/permission/theophany-works/feasts/x.jpg",
                              "license": "Permission:theophany-works", "credit": "",
                              "source": "https://theophanyworks.com/p1/"}}
        deps = {"FF-0001": [{"path": "icons/permission/theophany-works/feasts/y.jpg",
                             "license": "Permission:theophany-works", "credit": "",
                             "source": "https://theophanyworks.com/p2/", "kind": "shop",
                             "tag": "Available to order", "title": "Resurrection 21st c",
                             "era": "21st c.", "by": "Theophany Works"}]}
        rec = feastlib.to_record(row, images=images, depictions=deps,
                                 permissions=self.PERMS)
        self.assertEqual(rec["image"],
                         "icons/permission/theophany-works/feasts/x.jpg")
        self.assertEqual(rec["imageSource"], "https://theophanyworks.com/p1/")
        self.assertEqual(rec["imageCredit"], "Theophany Works")
        self.assertEqual(len(rec["depictions"]), 1)
        self.assertEqual(rec["depictions"][0]["credit"], "Theophany Works")
        self.assertEqual(rec["depictions"][0]["source"],
                         "https://theophanyworks.com/p2/")
        self.assertNotIn("license", rec["depictions"][0])  # token not surfaced

    def test_no_images_omits_fields(self):
        rec = feastlib.to_record(valid_feast(), images={}, depictions={},
                                 permissions={})
        self.assertNotIn("image", rec)
        self.assertNotIn("depictions", rec)
```

- [ ] **Step 2: Run test, verify it fails**

Run: `python -m unittest tests.test_feastlib.TestFeastImageJoin -v`
Expected: FAIL — `to_record()` got an unexpected keyword argument `images`.

- [ ] **Step 3: Update `to_record` + `emit_feasts_json` in `feastlib.py`.**

Change the signature and add the join before `return rec`. For a permission hero/card, emit `credit = vendor name` (so the feast page's caption link reads cleanly) and OMIT the `Permission:<slug>` token; an open image keeps its own `license`/`credit`:

```python
def to_record(r: dict[str, str],
              images: dict[str, dict[str, str]] | None = None,
              depictions: dict[str, list[dict[str, str]]] | None = None,
              permissions: dict[str, dict[str, str]] | None = None) -> dict:
    if images is None:
        images = load_feast_images()
    if depictions is None:
        depictions = load_feast_depictions()
    if permissions is None:
        permissions = load_image_permissions()
    rec: dict = {}
    # ... existing body unchanged up to `rec["cycle"] = derive_cycle(parsed)` ...
    rec["cycle"] = derive_cycle(parsed)

    fid = r["Feast ID"].strip()
    # Hero festal icon (data/feast_images.csv). A permission hero emits
    # image/imageThumb/imageCredit(=vendor)/imageSource + imagePermission/
    # imageVendor/imageAttribution and is dropped if the grant is revoked; an
    # open image keeps its own license/credit. (#350)
    img = images.get(fid)
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
                rec["imageVendor"] = vendor.get("vendor_name", "")
                rec["imageAttribution"] = vendor.get("attribution", "")
                rec["imageCredit"] = vendor.get("vendor_name", "")
                if img["source"]:
                    rec["imageSource"] = img["source"]
            # revoked / unknown vendor -> no image key (placeholder hero)
        else:
            rec["image"] = img["path"]
            thumb = image_thumb(img["path"])
            if thumb:
                rec["imageThumb"] = thumb
            if img["credit"]:
                rec["imageCredit"] = img["credit"]
            if img["source"]:
                rec["imageSource"] = img["source"]

    # "Depictions & Icons" carousel (data/feast_depictions.csv). The feast page's
    # FeastDepiction renders {image, title, credit, source, license}: a permission
    # card emits credit=vendor name + source (grant backlink) and NO license token;
    # an open card keeps license/credit.
    deps = depictions.get(fid)
    if deps:
        cards: list[dict] = []
        for d in deps:
            if not d.get("path"):
                continue
            card: dict = {"image": d["path"], "title": d.get("title", "")}
            if d.get("source"):
                card["source"] = d["source"]
            dslug = permission_slug(d.get("license", ""))
            if dslug is not None:
                vendor = permissions.get(dslug)
                if not vendor or vendor.get("status") == "revoked":
                    continue  # unknown / revoked vendor -> exclude card
                card["credit"] = vendor.get("vendor_name", "")
            else:
                if d.get("license"):
                    card["license"] = d["license"]
                if d.get("credit"):
                    card["credit"] = d["credit"]
            cards.append(card)
        if cards:
            rec["depictions"] = cards
    return rec
```

Then update `emit_feasts_json` to load once and thread through:

```python
def emit_feasts_json(rows: list[dict[str, str]]) -> list[dict]:
    images = load_feast_images()
    depictions = load_feast_depictions()
    permissions = load_image_permissions()
    records = sorted((to_record(r, images, depictions, permissions) for r in rows),
                     key=_sort_key)
    payload = {"feasts": records, "pascha": pascha_mod.pascha_table(2020, 2040)}
    PUBLIC.mkdir(exist_ok=True)
    with open(PUBLIC / "feasts.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  wrote public/feasts.json ({len(records)} feasts)")
    return records
```

- [ ] **Step 4: Run test, verify pass; full suite green**

Run: `python -m unittest tests.test_feastlib.TestFeastImageJoin -v && python -m unittest tests.test_feastlib 2>&1 | tail -2`
Expected: PASS; `OK`.

- [ ] **Step 5: Commit**

```bash
git add feastlib.py tests/test_feastlib.py
git commit -m "feat(feastlib): join festal hero + carousel into feasts.json records (#350)"
```

---

### Task 4: frontend — feast hero caption links to the product page

**Files:**
- Modify: `src/lib/feasts.ts:35-46` (add fields to `Feast`)
- Modify: `src/pages/feast/[id].astro:121-123` (hero caption link)

- [ ] **Step 1: Extend the `Feast` interface** in `src/lib/feasts.ts` — add inside the interface after `imageCredit?: string;`:

```ts
  imageSource?: string;
  imagePermission?: boolean;
  imageVendor?: string;
  imageAttribution?: string;
```

- [ ] **Step 2: Link the hero caption** — in `src/pages/feast/[id].astro`, replace the caption block (currently `{heroImage ? f.imageCredit : "Icon forthcoming"}`) with:

```astro
            <div class="feast-icon-cap">
              {
                heroImage ? (
                  f.imageSource ? (
                    <a href={f.imageSource} target="_blank" rel="noopener noreferrer">
                      {f.imageCredit || "source"}
                    </a>
                  ) : (
                    f.imageCredit
                  )
                ) : (
                  "Icon forthcoming"
                )
              }
            </div>
```

- [ ] **Step 3: Lint the changed files**

Run: `npx prettier --check "src/lib/feasts.ts" "src/pages/feast/[id].astro"`
Expected: both pass (run `npx prettier --write` on them if not, then re-check).

- [ ] **Step 4: Commit**

```bash
git add src/lib/feasts.ts "src/pages/feast/[id].astro"
git commit -m "feat(feast): link the hero-icon caption to its source (honors vendor grant) (#350)"
```

---

### Task 5: the download helper (`dist/theophany/fetch_icons.py`)

A git-ignored authoring aid (lives beside `map_catalog.py`). Given a manifest of
`(product_url, dest_relpath)`, it fetches the product page's `og:image`, upsizes the
BigCommerce dimension segment to 1280, downloads, resizes to ≤800px (width, then top-crop
height) at q80 with ImageMagick, and writes a ~200px thumb under `icons/thumbs/…`.

**Files:**
- Create: `dist/theophany/fetch_icons.py`

- [ ] **Step 1: Write the helper**

```python
#!/usr/bin/env python3
"""Fetch + resize + thumb Theophany Works product icons for self-hosting.

Usage: python dist/theophany/fetch_icons.py manifest.tsv
  manifest.tsv lines: <product_url>\t<dest_relpath-under-static/>
  e.g. https://theophanyworks.com/icon-of-the-annunciation-00fan001/\ticons/permission/theophany-works/feasts/FF-0008.jpg
Skips a dest that already exists. Prints a summary; exits non-zero if any failed.
"""
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATIC = ROOT / "static"
UA = {"User-Agent": "Mozilla/5.0 (CloudOfWitnesses icon fetch)"}
DIM_RE = re.compile(r"\.(\d+)\.(\d+)\.(jpg|jpeg|png)", re.I)


def og_image(product_url: str) -> str | None:
    req = urllib.request.Request(product_url, headers=UA)
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
    m = re.search(r'<meta property="og:image" content="([^"]+)"', html, re.I)
    return m.group(1) if m else None


def upsize(url: str) -> str:
    # BigCommerce CDN: swap the .W.H. resize segment up to 1280 for a larger source.
    return DIM_RE.sub(r".1280.1280.\3", url)


def fetch(url: str) -> bytes:
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                  timeout=60).read()


def main(manifest: str) -> int:
    failed = []
    for line in Path(manifest).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        product_url, rel = [p.strip() for p in line.split("\t")]
        dest = STATIC / rel
        if dest.exists():
            print(f"skip (exists): {rel}")
            continue
        try:
            og = og_image(product_url)
            if not og:
                raise RuntimeError("no og:image")
            try:
                raw = fetch(upsize(og))
            except Exception:
                raw = fetch(og)  # fall back to the listing-size image
            dest.parent.mkdir(parents=True, exist_ok=True)
            tmp = dest.with_suffix(".orig")
            tmp.write_bytes(raw)
            # width<=800 (only shrink), then top-crop height<=800, q80
            subprocess.run(["magick", str(tmp), "-resize", "800x800>",
                            "-gravity", "North", "-crop", "800x800+0+0", "+repage",
                            "-quality", "80", str(dest)], check=True)
            # ~200px thumb
            thumb = STATIC / "icons" / "thumbs" / rel[len("icons/"):]
            thumb = thumb.with_suffix(".jpg")
            thumb.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["magick", str(dest), "-resize", "200x200>",
                            "-gravity", "North", "-crop", "200x200+0+0", "+repage",
                            "-quality", "80", str(thumb)], check=True)
            tmp.unlink(missing_ok=True)
            print(f"ok: {rel}")
        except Exception as e:  # noqa: BLE001
            print(f"FAIL {rel}: {e}", file=sys.stderr)
            failed.append(rel)
    if failed:
        print(f"\n{len(failed)} failed: {failed}", file=sys.stderr)
        return 1
    print("\nall icons fetched")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1]))
```

- [ ] **Step 2: Smoke-test on ONE icon**

```bash
printf 'https://theophanyworks.com/icon-of-the-annunciation-00fan001/\ticons/permission/theophany-works/feasts/FF-0008.jpg\n' > /tmp/one.tsv
python dist/theophany/fetch_icons.py /tmp/one.tsv
magick identify static/icons/permission/theophany-works/feasts/FF-0008.jpg
```
Expected: `ok:` line; `identify` shows a JPEG ≤800×800. If it fails, inspect the product page's `og:image` and adjust before proceeding. (No commit — `dist/` is git-ignored; `static/…` icons are committed with Task 6.)

---

### Task 6: fetch A1 icons + author the two feast CSVs

Uses the #367 A1 table. Hero = the most classic historical version per feast; the rest are
carousel cards. Cross-check every FF id + product URL against the issue before downloading.

**Files:**
- Create/modify: `static/icons/permission/theophany-works/feasts/*.jpg` (+ thumbs)
- Create: `data/feast_images.csv`, `data/feast_depictions.csv`

- [ ] **Step 1: Build the A1 manifest** `dist/theophany/a1_manifest.tsv` — one line per icon,
  `<product_url>\t<dest_relpath>`. Hero dest = `…/feasts/FF-XXXX.jpg`; carousel dest =
  `…/feasts/FF-XXXX-<slug>.jpg`. Full mapping (26 rows; hero marked H):

  - FF-0001 Pascha: **H** resurrection-vatopedi-14th-c; cards greek-14th-c, protaton-13th-c, crete-15th-c (00ljc013), 21st-c
  - FF-0004 Entrance: **H** entrance-21st-c
  - FF-0005 Nativity: **H** nativity-20th-c; cards nativity-21th-c, gifts-of-the-magi-21st-c
  - FF-0006 Theophany: **H** baptism-crete-15th-c; card baptism-meteora-athos-14th-c
  - FF-0007 Presentation: **H** presentation-16th-c (00ljc016)
  - FF-0008 Annunciation: **H** annunciation-with-st-george-15th-c; cards annunciation (00fan001), annunciation-21st-c, annunciation-royal-doors-set
  - FF-0013 Dormition: **H** dormition-17th-c; cards dormition (00fdt001), dormition-21st-c
  - FF-0043 Lazarus: **H** raising-of-lazarus-larnaca
  - FF-0047 Communion of Apostles: **H** communion-of-the-apostles-21st-c
  - FF-0048 Crucifixion: **H** crucifixion-holy-friday; cards christ-bearing-the-cross-crete-15th-c (00ljc012), deposition-apokathelosis-15th-c
  - FF-0049 Lamentation: **H** lamentation-epitaphios-15th-c
  - FF-0051 Life-Giving Spring: **H** life-giving-spring

- [ ] **Step 2: Fetch them**

Run: `python dist/theophany/fetch_icons.py dist/theophany/a1_manifest.tsv`
Expected: `all icons fetched` (26 ok). If any FAIL, note the gap (grant condition: skip a
dead product page, wire the rest) and continue.

- [ ] **Step 3: Author `data/feast_images.csv`** (CRLF, header exact). One hero row per feast:

```
feast_id,image_path,license,credit,source
FF-0001,icons/permission/theophany-works/feasts/FF-0001.jpg,Permission:theophany-works,,https://theophanyworks.com/icon-of-the-resurrection-of-christ-vatopedi-mt-athos-14th-c-00fpa003/
...(one row per the 12 feasts)...
```

- [ ] **Step 4: Author `data/feast_depictions.csv`** (CRLF, header exact). One row per
  carousel card (the non-hero icons), `kind=shop`, `tag=Available to order`,
  `by=Theophany Works`, `era` from the icon dateline, `title` a readable label:

```
feast_id,image_path,license,credit,source,kind,tag,title,era,by
FF-0001,icons/permission/theophany-works/feasts/FF-0001-greek-14th-c.jpg,Permission:theophany-works,,https://theophanyworks.com/icon-of-the-resurrection-of-christ-greek-14th-c-00fpa002/,shop,Available to order,Resurrection of Christ (Greek),14th c.,Theophany Works
...(one row per non-hero card)...
```

  Write both files with CRLF endings, e.g. in Python:
  `Path("data/feast_images.csv").write_bytes(text.replace("\n","\r\n").encode())`.

- [ ] **Step 5: Validate**

Run: `python build.py --no-xlsx 2>&1 | grep -E "VALIDATION|feast_images|feast_depictions|error"`
Expected: `VALIDATION CLEAN`, no feast image errors. Fix any path/id/licence errors.

- [ ] **Step 6: Verify the join landed in feasts.json**

Run: `python -c "import json;d=json.load(open('public/feasts.json'));f=[x for x in d['feasts'] if x['id']=='FF-0001'][0];print(f.get('image'),f.get('imageSource'));print(len(f.get('depictions',[])),'cards')"`
Expected: hero path + source printed; 4 cards for FF-0001.

- [ ] **Step 7: Commit**

```bash
git add data/feast_images.csv data/feast_depictions.csv static/icons/permission/theophany-works/feasts
git commit -m "data: wire 26 A1 festal icons (Theophany Works) to feast pages (#367)"
```

---

### Task 7: Phase-1 gates + docs + PR

**Files:**
- Modify: `docs/data-model.md` (document the two feast image CSVs under §5a)

- [ ] **Step 1: Update `docs/data-model.md`** — add a short subsection under the Feasts &
  Fasts area noting `data/feast_images.csv` (one hero per feast) and
  `data/feast_depictions.csv` (many carousel cards), same §9 licence gate as saint images,
  joined by `feastlib` into `public/feasts.json` (`image`/`imageCredit`/`imageSource`/
  `depictions[]`). Commit:

```bash
git add docs/data-model.md
git commit -m "docs: document the festal-icon CSVs (#350)"
```

- [ ] **Step 2: Install web deps + full validate + build + e2e**

```bash
npm ci
python build.py --no-xlsx
npm run lint
npm run build
npm test
```
Expected: validation clean; lint clean; astro build succeeds; Playwright green. Fix any
failures before proceeding.

- [ ] **Step 3: Manual visual check (dev server)**

```bash
npm run dev &   # then open /feast/FF-0001 and /feast/FF-0008
```
Confirm: hero shows the festal icon with a caption LINKING to the Theophany product page;
the "Depictions & Icons" carousel shows the other icons, each caption linking to its page.
Stop the dev server.

- [ ] **Step 4: Push + open PR 1**

```bash
git push -u origin worktree-festal-icons-350
gh pr create --title "feat: festal-icon pipeline + wire 26 A1 feast icons (closes #350, #367)" \
  --body "$(cat <<'EOF'
Builds the #350 festal-icon data pipeline (feast_images.csv / feast_depictions.csv →
feastlib join → feasts.json) and wires the 26 A1 Theophany Works feast-scene icons.

- feastlib mirrors hostlib's image pipeline (local licence helpers, validators folded into
  feastlib.validate, join in to_record). build.py unchanged.
- Feast hero caption now LINKS to the product page (honors the Theophany grant condition).
- 26 icons across 12 feasts, permission-gated, self-hosted + thumbed.

Closes #350. Part of #367 (A1).

## Preview
<!-- add Cloudflare Pages preview URL once the check is green -->
EOF
)"
```
Report the PR URL and remind the user to paste the Cloudflare preview link. **Do not merge**
(merges are user-only).

---

## PHASE 2 — A2–A4 (new branch off updated main after PR 1 merges, or a stacked branch)

> Start Phase 2 only after confirming with the user (PR 1 may still be in review). Branch
> from the latest `main` (or stack on PR 1's branch if the user wants it in parallel).

### Task 8: fetch A2–A4 icons + de-dupe

**Files:**
- Create/modify: `static/icons/permission/theophany-works/*.jpg` (+ thumbs)

- [ ] **Step 1: Build de-duped manifest** `dist/theophany/a2a4_manifest.tsv`. For each of the
  30 A2–A4 product URLs (12 Christ→OS-0000, 15 Theotokos→OS-0001, 2 John→OS-0050,
  1 Basil→OS-0021): dest = `icons/permission/theophany-works/OS-XXXX-<slug>.jpg`. **Before
  adding a line, drop it if its product URL already appears** in `data/saint_depictions.csv`
  or `data/saint_images.csv`:

```bash
python - <<'PY'
import csv
seen=set()
for fn in ("data/saint_images.csv","data/saint_depictions.csv"):
    for r in csv.DictReader(open(fn,encoding="utf-8")):
        s=(r.get("source") or "").strip()
        if s: seen.add(s)
print(len(seen),"existing source URLs")
# print membership for each A2-A4 URL you plan to add:
PY
```
  Also collapse the ~3 duplicate SKUs in the issue (two `00vmt008`, two `00mtc014`, two
  `00ljc018`) to distinct product URLs only. `log()` (note in the PR) any dropped as dupes.

- [ ] **Step 2: Fetch**

Run: `python dist/theophany/fetch_icons.py dist/theophany/a2a4_manifest.tsv`
Expected: all ok (minus any dupes you excluded). Note gaps for dead pages.

---

### Task 9: append A2–A4 carousel rows to `saint_depictions.csv`

**Files:**
- Modify: `data/saint_depictions.csv` (append rows; preserve CRLF)

- [ ] **Step 1: Append rows** (CRLF-safe). One row per fetched icon, `kind=shop`,
  `tag=Available to order`, `by=Theophany Works`, `title` a readable label, `era` from the
  dateline, e.g.:

```
OS-0000,icons/permission/theophany-works/OS-0000-pantocrator-15th-c.jpg,Permission:theophany-works,,https://theophanyworks.com/icon-of-christ-the-pantocrator-15th-c-00ljc020/,shop,Available to order,Christ the Pantocrator,15th c.,Theophany Works
```
  Append with CRLF: `open("data/saint_depictions.csv","ab").write(rows_text.replace("\n","\r\n").encode())` — verify the file still ends consistently (`cat -A data/saint_depictions.csv | tail -2` shows `^M$`).

- [ ] **Step 2: Validate**

Run: `python build.py --no-xlsx 2>&1 | grep -E "VALIDATION|saint_depictions|error"`
Expected: `VALIDATION CLEAN`, no depiction errors.

- [ ] **Step 3: Verify the cards landed**

Run: `python -c "import json;d=json.load(open('public/data.json'));r=[x for x in d['saints'] if x['id'] in ('OS-0000','OS-0001')];[print(x['id'],len(x.get('depictions',[])),'cards') for x in r]"`
Expected: OS-0000 and OS-0001 card counts increased by the A2/A3 additions.

- [ ] **Step 4: Commit**

```bash
git add data/saint_depictions.csv static/icons/permission/theophany-works
git commit -m "data: wire A2-A4 Theophany icons (Christ, Theotokos, John of SF, Basil) (#367)"
```

---

### Task 10: Phase-2 gates + PR

- [ ] **Step 1: Full gates**

```bash
python build.py --no-xlsx && npm run lint && npm run build && npm test
```
Expected: all green.

- [ ] **Step 2: Manual visual check** — dev server, open `/saint/OS-0000` and `/saint/OS-0001`;
  confirm the new carousel cards render, each linking to its Theophany page.

- [ ] **Step 3: Push + open PR 2**

```bash
git push -u origin <phase2-branch>
gh pr create --title "data: wire A2-A4 Theophany icons to Christ/Theotokos/saint pages (#367)" \
  --body "Wires the 30 A2-A4 Theophany Works icons (12 Christ→OS-0000, 15 Theotokos→OS-0001, John of SF ×2, Basil ×1) as carousel cards. De-duped by product URL. Part of #367.

## Preview
<!-- Cloudflare Pages preview URL -->"
```
Report the PR URL; do not merge.

---

## Self-review notes (coverage vs spec)

- Pipeline (CSVs, feastlib load/validate/join, fail-loud, build unchanged): Tasks 1–3. ✓
- §9 licence gate reused (open OR Permission, revoked warns): Tasks 1–2. ✓
- Frontend hero-caption backlink (grant condition): Task 4. ✓
- A1 26 icons → 12 feasts, hero = classic historical: Tasks 5–6. ✓
- A2–A4 30 icons as carousel cards, de-duped: Tasks 8–9. ✓
- Thumbs, resize ≤800 q80, self-hosted under permission dir: Task 5 helper. ✓
- Gates (validate/test/lint/build/e2e) + previews + PRs, no self-merge: Tasks 7, 10. ✓
- Docs (data-model.md) updated for the §5a data-model change: Task 7. ✓
