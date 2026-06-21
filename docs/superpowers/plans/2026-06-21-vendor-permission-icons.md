# Vendor-Permission Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the build accept, attribute, and cleanly revoke vendor-permissioned saint icons, and demonstrate it on the Theotokos page (OS-0001) with a Theophany Works icon for a trial preview.

**Architecture:** A new `data/image_permissions.csv` registry (one row per vendor, with a `status` kill-switch) is the source of truth for attribution + on/off. `data/saint_images.csv` rows reference a vendor via a `Permission:<slug>` license token; vendor image files live under `static/icons/permission/<slug>/`. `build.py` validates permission rows against the registry (instead of the open-license gate), excludes revoked vendors, and emits permission attribution fields onto each saint record. `SaintView.astro` renders the agreed wording with a link to the specific icon page.

**Tech Stack:** Python 3.11 stdlib (`csv`, `sqlite3`), `unittest`; Astro + TypeScript frontend; Pillow for image resize.

---

## File structure

| File | Responsibility | Action |
|---|---|---|
| `data/image_permissions.csv` | Vendor-grant registry (source of truth for attribution + status) | Create |
| `data/saint_images.csv` | Add OS-0001 permission row | Modify |
| `static/icons/permission/theophany-works/OS-0001.jpg` | The Theophany Works Theotokos icon | Create |
| `build.py` | Registry loader/validator; permission-license recognition; record join | Modify |
| `tests/test_build.py` | Tests for registry + permission validation + join | Modify |
| `src/lib/types.ts` | `Saint` permission image fields | Modify |
| `src/lib/saintView.ts` | `SaintViewModel` fields + mapping | Modify |
| `src/components/SaintView.astro` | Permission attribution caption | Modify |
| `docs/permissions/theophany-works.md` | Redacted permission record | Create |
| `CLAUDE.md` | §9 vendor-permission documentation | Modify |

**Field contract** (names used across all tasks — keep consistent):
Registry columns: `vendor_slug,vendor_name,attribution,homepage,granted,status,terms`.
License token: `Permission:<vendor_slug>`.
Record fields emitted for an active permission image: `image`, `imagePermission` (bool `True`), `imageVendor`, `imageAttribution`, `imageVendorHome`, `imageSource`. (No `imageLicense`/`imageCredit` for permission images.)

---

## Task 1: Permission registry — constants, loader, validator (build.py)

**Files:**
- Modify: `build.py` (constants near line 65; new functions near `load_saint_images`/`validate_saint_images`)
- Test: `tests/test_build.py` (new `ImagePermissionTests` class)

- [ ] **Step 1: Add constants and a license-parse helper.** In `build.py`, after the `SAINT_IMAGES_HEADER`/`OPEN_LICENSES` block (line ~66), add:

```python
# Vendor-permission image registry (data/image_permissions.csv). A "used with
# permission" image is NOT an open license — it is a revocable, per-vendor grant
# (CLAUDE.md §9). Each saint_images.csv row that uses one carries a license token
# `Permission:<vendor_slug>` joined to a row here. `status` is the kill-switch:
# flip to `revoked` and the build stops publishing that vendor's images.
IMAGE_PERMISSIONS_CSV = DATA / "image_permissions.csv"
IMAGE_PERMISSIONS_HEADER = [
    "vendor_slug", "vendor_name", "attribution", "homepage", "granted", "status", "terms"
]
PERMISSION_STATUSES = {"active", "revoked"}
PERMISSION_LICENSE_RE = re.compile(r"^Permission:([a-z0-9]+(?:-[a-z0-9]+)*)$")


def permission_slug(lic: str) -> str | None:
    """Return the vendor slug if `lic` is a `Permission:<slug>` token, else None."""
    m = PERMISSION_LICENSE_RE.match(lic.strip())
    return m.group(1) if m else None
```

- [ ] **Step 2: Add the loader.** After `load_saint_images` (line ~610), add:

```python
def load_image_permissions() -> dict[str, dict[str, str]]:
    """vendor_slug -> {name, attribution, homepage, granted, status, terms}.
    Empty if the file is absent. Loads ALL rows (incl. revoked) so callers can
    decide; validation enforces correctness separately."""
    out: dict[str, dict[str, str]] = {}
    if not IMAGE_PERMISSIONS_CSV.exists():
        return out
    with IMAGE_PERMISSIONS_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != IMAGE_PERMISSIONS_HEADER:
            sys.exit(f"FATAL: {IMAGE_PERMISSIONS_CSV} header must be "
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


def validate_image_permissions() -> tuple[list[str], list[str]]:
    """Validate data/image_permissions.csv: valid slug, known status, a name and
    attribution, and no duplicate slugs."""
    errors: list[str] = []
    warnings: list[str] = []
    if not IMAGE_PERMISSIONS_CSV.exists():
        return errors, warnings
    with IMAGE_PERMISSIONS_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != IMAGE_PERMISSIONS_HEADER:
            return ([f"image_permissions.csv header must be "
                     f"{IMAGE_PERMISSIONS_HEADER}, got {reader.fieldnames!r}"], warnings)
        seen: set[str] = set()
        for i, row in enumerate(reader, 2):
            if not any((v or "").strip() for v in row.values()):
                continue
            slug = (row.get("vendor_slug") or "").strip()
            status = (row.get("status") or "").strip()
            where = f"image_permissions.csv line {i}"
            if not slug:
                errors.append(f"{where}: empty vendor_slug.")
            elif not SLUG_RE.match(slug):
                errors.append(f"{where}: vendor_slug {slug!r} is not kebab-case.")
            elif slug in seen:
                errors.append(f"{where}: duplicate vendor_slug {slug!r}.")
            seen.add(slug)
            if not (row.get("vendor_name") or "").strip():
                errors.append(f"{where} ({slug}): empty vendor_name.")
            if not (row.get("attribution") or "").strip():
                errors.append(f"{where} ({slug}): empty attribution.")
            if status not in PERMISSION_STATUSES:
                errors.append(f"{where} ({slug}): status {status!r} must be one of "
                              f"{sorted(PERMISSION_STATUSES)}.")
    return errors, warnings
```

- [ ] **Step 3: Write the failing tests.** In `tests/test_build.py`, after `SaintImageTests` (line ~482), add:

```python
class ImagePermissionTests(unittest.TestCase):
    """data/image_permissions.csv registry loader + validation."""

    def _run(self, rows):
        import csv as _csv, tempfile
        from pathlib import Path
        tmp = Path(tempfile.mkdtemp())
        csv_path = tmp / "image_permissions.csv"
        with csv_path.open("w", encoding="utf-8", newline="") as fh:
            w = _csv.DictWriter(fh, fieldnames=build.IMAGE_PERMISSIONS_HEADER)
            w.writeheader()
            w.writerows(rows)
        old = build.IMAGE_PERMISSIONS_CSV
        try:
            build.IMAGE_PERMISSIONS_CSV = csv_path
            return build.load_image_permissions(), build.validate_image_permissions()
        finally:
            build.IMAGE_PERMISSIONS_CSV = old

    def _row(self, **over):
        row = {"vendor_slug": "theophany-works", "vendor_name": "Theophany Works",
               "attribution": "Icon used with permission from Theophany Works.",
               "homepage": "https://theophanyworks.com/holy-icons/",
               "granted": "2026-06-17", "status": "active", "terms": "see docs"}
        row.update(over)
        return row

    def test_permission_slug_parses_token(self):
        self.assertEqual(build.permission_slug("Permission:theophany-works"),
                         "theophany-works")
        self.assertIsNone(build.permission_slug("PD"))
        self.assertIsNone(build.permission_slug("Permission:Bad Slug"))

    def test_clean_registry_loads_and_validates(self):
        loaded, (errs, _) = self._run([self._row()])
        self.assertEqual(errs, [])
        self.assertEqual(loaded["theophany-works"]["status"], "active")
        self.assertEqual(loaded["theophany-works"]["name"], "Theophany Works")

    def test_bad_status_errors(self):
        _, (errs, _) = self._run([self._row(status="maybe")])
        self.assertTrue(any("status" in e for e in errs))

    def test_duplicate_slug_errors(self):
        _, (errs, _) = self._run([self._row(), self._row()])
        self.assertTrue(any("duplicate vendor_slug" in e for e in errs))

    def test_missing_attribution_errors(self):
        _, (errs, _) = self._run([self._row(attribution="")])
        self.assertTrue(any("empty attribution" in e for e in errs))
```

- [ ] **Step 4: Run the tests.**

Run: `python -m unittest tests.test_build.ImagePermissionTests -v`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit.**

```bash
git add build.py tests/test_build.py
git commit -m "feat: image-permission registry loader + validation"
```

---

## Task 2: Recognize `Permission:<slug>` in image validation (build.py)

**Files:**
- Modify: `build.py` `validate_saint_images` (lines ~613-665)
- Test: `tests/test_build.py` `SaintImageTests` (extend)

- [ ] **Step 1: Add permission handling to `validate_saint_images`.** Change the signature and the license-check block. New signature (line ~613):

```python
def validate_saint_images(valid_ids: set[str],
                          permissions: dict[str, dict[str, str]] | None = None
                          ) -> tuple[list[str], list[str]]:
```

Immediately after the signature's docstring/`if not SAINT_IMAGES_CSV.exists()` guard, resolve permissions:

```python
    if permissions is None:
        permissions = load_image_permissions()
```

Replace the license-validation block (the `if not lic: ... elif not license_ok(lic): ... elif license_requires_credit(lic) ...`) with:

```python
            slug = permission_slug(lic)
            if not lic:
                errors.append(f"{where} ({sid}): empty license. Self-hosted images "
                              "must declare an open license or a Permission:<vendor> "
                              "token (§9).")
            elif slug is not None:
                vendor = permissions.get(slug)
                if vendor is None:
                    errors.append(f"{where} ({sid}): permission vendor {slug!r} is "
                                  "not in data/image_permissions.csv.")
                elif vendor.get("status") == "revoked":
                    warnings.append(f"{where} ({sid}): vendor {slug!r} permission is "
                                    "REVOKED — image excluded from output; delete "
                                    f"the file under static/icons/permission/{slug}/.")
                if not source:
                    errors.append(f"{where} ({sid}): permission image requires a "
                                  "'source' linking the specific vendor icon page (§9).")
            elif not license_ok(lic):
                errors.append(f"{where} ({sid}): license {lic!r} is not an accepted "
                              "open license (PD / PD-art / PD-old / CC0 / CC-BY / "
                              "CC-BY-SA) or a Permission:<vendor> token.")
            elif license_requires_credit(lic) and not credit:
                errors.append(f"{where} ({sid}): license {lic} requires a 'credit' "
                              "(attribution).")
```

- [ ] **Step 2: Write the failing tests.** In `tests/test_build.py` `SaintImageTests`, extend `_run_image_validation` to accept and monkeypatch permissions, and add tests. Replace the `_run_image_validation` method body's `try:` block so it also sets a permissions registry:

```python
    def _run_image_validation(self, rows_csv, files, permissions=None):
        """Validate a synthetic saint_images.csv against a temp static/ dir.
        `permissions` is an optional {slug: {...}} registry."""
        import csv as _csv
        import tempfile
        from pathlib import Path

        tmp = Path(tempfile.mkdtemp())
        (tmp / "icons").mkdir()
        for f in files:
            (tmp / f).parent.mkdir(parents=True, exist_ok=True)
            (tmp / f).write_bytes(b"\x89PNG\r\n")
        csv_path = tmp / "saint_images.csv"
        with csv_path.open("w", encoding="utf-8", newline="") as fh:
            w = _csv.DictWriter(fh, fieldnames=build.SAINT_IMAGES_HEADER)
            w.writeheader()
            w.writerows(rows_csv)
        old_csv, old_static = build.SAINT_IMAGES_CSV, build.STATIC
        try:
            build.SAINT_IMAGES_CSV, build.STATIC = csv_path, tmp
            return build.validate_saint_images({"OS-0001", "OS-0002"},
                                               permissions=permissions or {})
        finally:
            build.SAINT_IMAGES_CSV, build.STATIC = old_csv, old_static
```

Then add these test methods:

```python
    def test_permission_license_with_known_active_vendor_ok(self):
        perms = {"theophany-works": {"status": "active"}}
        errs, _ = self._run_image_validation(
            [self._img(image_path="icons/permission/theophany-works/OS-0001.jpg",
                       license="Permission:theophany-works", source="https://tw/x")],
            ["icons/permission/theophany-works/OS-0001.jpg"], permissions=perms)
        self.assertEqual(errs, [])

    def test_permission_license_unknown_vendor_errors(self):
        errs, _ = self._run_image_validation(
            [self._img(license="Permission:nobody", source="https://x")],
            ["icons/a.jpg"], permissions={})
        self.assertTrue(any("not in data/image_permissions.csv" in e for e in errs))

    def test_permission_license_without_source_errors(self):
        perms = {"theophany-works": {"status": "active"}}
        errs, _ = self._run_image_validation(
            [self._img(license="Permission:theophany-works", source="")],
            ["icons/a.jpg"], permissions=perms)
        self.assertTrue(any("requires a 'source'" in e for e in errs))

    def test_revoked_vendor_warns_not_errors(self):
        perms = {"theophany-works": {"status": "revoked"}}
        errs, warns = self._run_image_validation(
            [self._img(license="Permission:theophany-works", source="https://x")],
            ["icons/a.jpg"], permissions=perms)
        self.assertEqual(errs, [])
        self.assertTrue(any("REVOKED" in w for w in warns))
```

- [ ] **Step 3: Run the tests.**

Run: `python -m unittest tests.test_build.SaintImageTests -v`
Expected: PASS (all existing image tests + 4 new).

- [ ] **Step 4: Commit.**

```bash
git add build.py tests/test_build.py
git commit -m "feat: validate Permission:<vendor> image licenses against the registry"
```

---

## Task 3: Join permission attribution into the saint record (build.py)

**Files:**
- Modify: `build.py` `to_record` (image-join block, lines ~1062-1069)
- Test: `tests/test_build.py` `SaintImageTests`

- [ ] **Step 1: Thread permissions into `to_record`.** Find the `to_record` signature (it currently ends with `images=...`) and add a `permissions` param defaulting to `None`. Locate the call signature (search `def to_record(`) and add `permissions: dict[str, dict[str, str]] | None = None,` as the last parameter. At the top of the function body add:

```python
    if permissions is None:
        permissions = {}
```

- [ ] **Step 2: Replace the image-join block.** Replace the existing block (lines ~1062-1069):

```python
    img = images.get(r["Saint ID"].strip())
    if img and img.get("path"):
        rec["image"] = img["path"]
        if img.get("license"):
            rec["imageLicense"] = img["license"]
        if img.get("credit"):
            rec["imageCredit"] = img["credit"]
        if img.get("source"):
            rec["imageSource"] = img["source"]
```

with:

```python
    img = images.get(r["Saint ID"].strip())
    if img and img.get("path"):
        slug = permission_slug(img.get("license", ""))
        if slug is not None:
            vendor = permissions.get(slug)
            # Publish a permission image only if the vendor grant is active.
            if vendor and vendor.get("status") != "revoked":
                rec["image"] = img["path"]
                rec["imagePermission"] = True
                rec["imageVendor"] = vendor.get("name", "")
                rec["imageAttribution"] = vendor.get("attribution", "")
                rec["imageVendorHome"] = vendor.get("homepage", "")
                if img.get("source"):
                    rec["imageSource"] = img["source"]
            # revoked / unknown vendor → no image key (monogram fallback)
        else:
            rec["image"] = img["path"]
            if img.get("license"):
                rec["imageLicense"] = img["license"]
            if img.get("credit"):
                rec["imageCredit"] = img["credit"]
            if img.get("source"):
                rec["imageSource"] = img["source"]
```

- [ ] **Step 3: Write the failing tests.** In `SaintImageTests`, add:

```python
    def test_to_record_joins_permission_attribution(self):
        images = {"OS-0001": {"path": "icons/permission/theophany-works/OS-0001.jpg",
                              "license": "Permission:theophany-works", "credit": "",
                              "source": "https://tw/icon-page"}}
        perms = {"theophany-works": {"name": "Theophany Works",
                 "attribution": "Icon used with permission from Theophany Works.",
                 "homepage": "https://theophanyworks.com/holy-icons/",
                 "status": "active"}}
        rec = build.to_record(valid_row(), vendors=[], name_variants={},
                              images=images, permissions=perms)
        self.assertEqual(rec["image"], "icons/permission/theophany-works/OS-0001.jpg")
        self.assertTrue(rec["imagePermission"])
        self.assertEqual(rec["imageVendor"], "Theophany Works")
        self.assertEqual(rec["imageAttribution"],
                         "Icon used with permission from Theophany Works.")
        self.assertEqual(rec["imageVendorHome"], "https://theophanyworks.com/holy-icons/")
        self.assertEqual(rec["imageSource"], "https://tw/icon-page")
        self.assertNotIn("imageLicense", rec)

    def test_to_record_excludes_revoked_permission_image(self):
        images = {"OS-0001": {"path": "icons/permission/x/OS-0001.jpg",
                              "license": "Permission:x", "credit": "",
                              "source": "https://x"}}
        perms = {"x": {"name": "X", "attribution": "a", "homepage": "h",
                       "status": "revoked"}}
        rec = build.to_record(valid_row(), vendors=[], name_variants={},
                              images=images, permissions=perms)
        self.assertNotIn("image", rec)
```

- [ ] **Step 4: Run the tests.**

Run: `python -m unittest tests.test_build.SaintImageTests -v`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add build.py tests/test_build.py
git commit -m "feat: emit permission attribution fields on the saint record"
```

---

## Task 4: Wire the registry into the build flow (build.py)

**Files:**
- Modify: `build.py` — the validation entrypoint (call to `validate_saint_images`, line ~308) and the record-build loop (where `images = load_saint_images()` is loaded and `to_record(...)` is called, lines ~522 and ~1033).

- [ ] **Step 1: Load + validate the registry in the validation flow.** Near line ~299-308 where `validate_saint_images(_img_valid_ids)` is called, add the registry load + validation and pass it in:

```python
    permissions = load_image_permissions()
    perm_errors, perm_warnings = validate_image_permissions()
    img_errors, img_warnings = validate_saint_images(_img_valid_ids, permissions)
```

Then include `perm_errors`/`perm_warnings` wherever `img_errors`/`img_warnings` are aggregated into the overall error/warning lists (match the surrounding pattern — search for `img_errors` usage and mirror it for `perm_errors`).

- [ ] **Step 2: Pass permissions into the record loop.** Find each `images = load_saint_images()` (lines ~522, ~1033) and add immediately after it:

```python
    permissions = load_image_permissions()
```

Then update each `to_record(...)` call that passes `images=images` to also pass `permissions=permissions`.

- [ ] **Step 3: Run the full Python suite + validation.**

Run: `make test && make validate`
Expected: tests PASS; `make validate` prints `VALIDATION CLEAN` with 0 errors (warnings about finder coverage are fine).

- [ ] **Step 4: Commit.**

```bash
git add build.py
git commit -m "feat: wire image-permission registry into build + validation"
```

---

## Task 5: Frontend — permission attribution rendering

**Files:**
- Modify: `src/lib/types.ts` (line ~56, after `imageSource?`)
- Modify: `src/lib/saintView.ts` (interface ~59 + mapping ~156)
- Modify: `src/components/SaintView.astro` (lines ~60, ~98-114)

- [ ] **Step 1: Add fields to the `Saint` type.** In `src/lib/types.ts`, after `imageSource?: string;` (line ~56) add:

```typescript
  /** vendor-permission image (data/image_permissions.csv); absent for open-license */
  imagePermission?: boolean;
  imageVendor?: string;
  imageAttribution?: string;
  imageVendorHome?: string;
```

- [ ] **Step 2: Add fields to `SaintViewModel` and the mapping.** In `src/lib/saintView.ts`, after `imageSource?: string;` (line ~59) add:

```typescript
  imagePermission?: boolean;
  imageVendor?: string;
  imageAttribution?: string;
  imageVendorHome?: string;
```

And in the returned object after `imageSource: s.imageSource,` (line ~156) add:

```typescript
    imagePermission: s.imagePermission,
    imageVendor: s.imageVendor,
    imageAttribution: s.imageAttribution,
    imageVendorHome: s.imageVendorHome,
```

- [ ] **Step 3: Update the caption gate + render in `SaintView.astro`.** Change `showCredit` (line ~60) to also fire for permission images:

```typescript
const showCredit = !!saint.image && !!(m.imageCredit || m.imageLicense || m.imagePermission);
```

Replace the caption block (lines ~98-114, the `showCredit && (<div class="sv-icon-cap">...</div>)`) with a branch on `m.imagePermission`:

```jsx
      {
        showCredit && (
          m.imagePermission ? (
            <div class="sv-icon-cap">
              {m.imageAttribution}
              {m.imageSource && (
                <>
                  {" "}Original icon:{" "}
                  <a href={m.imageSource} target="_blank" rel="noopener noreferrer">
                    View on {m.imageVendor}
                  </a>
                </>
              )}
            </div>
          ) : (
            <div class="sv-icon-cap">
              Icon ·{" "}
              {m.imageSource ? (
                <a href={m.imageSource} target="_blank" rel="noopener noreferrer">
                  {m.imageCredit || "source"}
                </a>
              ) : (
                m.imageCredit
              )}
              {m.imageLicense && (
                <span class="sv-icon-lic"> · {m.imageLicense}</span>
              )}
            </div>
          )
        )
      }
```

- [ ] **Step 4: Lint.**

Run: `make web-lint`
Expected: PASS (ESLint + Prettier clean). If Prettier reports formatting, run `npx prettier --write src/components/SaintView.astro src/lib/types.ts src/lib/saintView.ts` and re-run.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/types.ts src/lib/saintView.ts src/components/SaintView.astro
git commit -m "feat: render vendor-permission icon attribution on the saint page"
```

---

## Task 6: The Theophany Works Theotokos icon (data)

**Files:**
- Create: `data/image_permissions.csv`
- Create: `static/icons/permission/theophany-works/OS-0001.jpg`
- Modify: `data/saint_images.csv` (OS-0001 row)
- Create: `docs/permissions/theophany-works.md`

- [ ] **Step 1: Verify the icon is fetchable, then download it.** The icon page is
  <https://theophanyworks.com/icon-of-the-sweet-kissing-theotokos-glykophiloussa-detail-21st-c-00vmt002/>.
  Fetch the page, find the product image URL (likely a BigCommerce CDN `cdn11.bigcommerce.com/...` link), and download it:

```bash
curl -sSL -A "Mozilla/5.0" "<icon-page-url>" -o /tmp/tw_page.html && \
  grep -oE 'https://cdn11\.bigcommerce\.com/[^"]+\.(jpg|jpeg|png)' /tmp/tw_page.html | sort -u | head
```

Pick the largest product image and download to `/tmp/tw_theotokos.jpg`.
**If the site blocks automated download (403/empty), STOP and ask the user to save the image manually to `/tmp/tw_theotokos.jpg`.**

- [ ] **Step 2: Resize per CLAUDE.md §5 and place the file.**

```bash
mkdir -p static/icons/permission/theophany-works
python -c "
from PIL import Image
img = Image.open('/tmp/tw_theotokos.jpg')
if img.mode in ('RGBA','P','LA'): img = img.convert('RGB')
w,h = img.size
MAX=800
if w>MAX: img = img.resize((MAX, round(h*MAX/w)), Image.LANCZOS)
if img.height>MAX: img = img.crop((0,0,img.width,MAX))
img.save('static/icons/permission/theophany-works/OS-0001.jpg','JPEG',quality=80,optimize=True)
print('saved', Image.open('static/icons/permission/theophany-works/OS-0001.jpg').size)
"
```

- [ ] **Step 3: Create the registry file.** Write `data/image_permissions.csv`:

```csv
vendor_slug,vendor_name,attribution,homepage,granted,status,terms
theophany-works,Theophany Works,Icon used with permission from Theophany Works.,https://theophanyworks.com/holy-icons/,2026-06-17,active,Email permission granted 2026-06-17; condition: each image links to its icon page. See docs/permissions/theophany-works.md
```

- [ ] **Step 4: Repoint OS-0001 in `data/saint_images.csv`.** Change the existing `OS-0001` row from the PD-art row to:

```csv
OS-0001,icons/permission/theophany-works/OS-0001.jpg,Permission:theophany-works,,https://theophanyworks.com/icon-of-the-sweet-kissing-theotokos-glykophiloussa-detail-21st-c-00vmt002/
```

(Leave the old `static/icons/OS-0001.jpg` file in place — untouched, so reverting is a one-line CSV change.)

- [ ] **Step 5: Write the redacted permission record.** Create `docs/permissions/theophany-works.md`:

```markdown
# Image permission — Theophany Works

**Vendor:** Theophany Works — <https://theophanyworks.com/holy-icons/>
**Granted:** 2026-06-17, by Emmelia Rodriguez (Theophany Works)
**Requested by:** Shelby Krug, on behalf of A Cloud of Witnesses / OrthodoxSaintFinder.com
**Status:** active (trial — sample page provided for vendor review)

## Grant (verbatim condition)

> "We certainly would be willing to grant permission for this if the link to the
> icon page is clearly shared. If you can send a page example that would be great!"

## Terms as implemented

- Each image on the site links directly back to its specific icon page on
  theophanyworks.com (the `source` column in `data/saint_images.csv`).
- Visible attribution on each saint page: "Icon used with permission from
  Theophany Works. Original icon: View on Theophany Works".
- Images are tracked as a revocable, per-vendor grant via
  `data/image_permissions.csv` (vendor_slug `theophany-works`). To revoke: set
  `status=revoked`, delete `static/icons/permission/theophany-works/`, and remove
  the matching `data/saint_images.csv` rows.

## Provenance

Permission obtained via the Theophany Works "Contact Us" form (Jun 16, 2026) and
granted by email reply (Jun 17, 2026). Personal contact details (email addresses,
phone) are intentionally omitted; the original correspondence is retained privately
by the site owner.
```

- [ ] **Step 6: Build and verify the join.**

Run: `make validate && python build.py --no-xlsx`
Expected: `VALIDATION CLEAN`, 0 errors. Then confirm the record carries permission fields:

```bash
python -c "import json; r=[s for s in json.load(open('public/data.json'))['saints'] if s['id']=='OS-0001'][0]; print(r.get('image'), r.get('imagePermission'), r.get('imageVendor'), r.get('imageAttribution'), r.get('imageSource'))"
```
Expected: prints the permission path, `True`, `Theophany Works`, the attribution sentence, and the icon-page URL.

- [ ] **Step 7: Commit.**

```bash
git add data/image_permissions.csv data/saint_images.csv static/icons/permission/theophany-works/OS-0001.jpg docs/permissions/theophany-works.md
git commit -m "data: add Theophany Works permission + Theotokos icon (OS-0001)"
```

---

## Task 7: Document the vendor-permission category in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` §9 (Guardrails — Copyright/Images paragraph) and the §5 "Saint portraits" license list.

- [ ] **Step 1: Add a vendor-permission note to §9.** After the existing image-licensing sentences in §9 (the paragraph ending "...anything else **fails the build**"), add:

```markdown
  **Vendor-permission images** are a separate, tracked exception to the otherwise-open
  licensing: a revocable, per-vendor grant (not redistributable). A portrait sourced
  this way uses `license = Permission:<vendor_slug>` in `data/saint_images.csv`, its
  file lives under `static/icons/permission/<vendor_slug>/`, and the vendor is recorded
  in `data/image_permissions.csv` (`vendor_slug,vendor_name,attribution,homepage,granted,status,terms`).
  The build validates the slug against that registry and **requires a `source`** (the
  specific vendor icon page, which the saint page links — often a condition of the grant).
  To revoke a vendor: set its `status=revoked` (the build then excludes every image from
  that vendor and warns), then `rm -rf static/icons/permission/<vendor_slug>/` and drop
  the matching `saint_images.csv` rows. Each grant is recorded under `docs/permissions/`.
```

- [ ] **Step 2: Update the §5 license list.** In §5 "Saint portraits", after the `license` MUST be an accepted open license sentence, add: ``Or a vendor-permission token `Permission:<vendor_slug>` (see §9) for images used under a vendor's written permission.``

- [ ] **Step 3: Commit.**

```bash
git add CLAUDE.md
git commit -m "docs: document vendor-permission image category (CLAUDE.md §5/§9)"
```

---

## Task 8: Full verification + PR

**Files:** none (verification + PR).

- [ ] **Step 1: Full local gate.**

Run: `make validate && make test && make web-lint && make web-build && make web-test`
Expected: all green. `make web-test` runs Playwright e2e against the built site.

- [ ] **Step 2: Visual check of the Theotokos page (dev server).**

Run: `make serve` (then open `/saint/OS-0001`), or rely on the PR preview.
Expected: the Theophany Works icon renders; caption reads "Icon used with permission from Theophany Works. Original icon: View on Theophany Works" with the link to the specific icon page.

- [ ] **Step 3: Push and open the PR.**

```bash
git push -u origin HEAD
gh pr create --title "feat: vendor-permissioned saint icons (Theophany Works trial)" \
  --body "$(cat <<'EOF'
Adds infrastructure for vendor-permissioned saint icons and demonstrates it on the
Theotokos page (OS-0001) with a Theophany Works icon, for a trial preview.

- New `data/image_permissions.csv` registry (status kill-switch per vendor).
- `Permission:<slug>` license token in `data/saint_images.csv`; files under
  `static/icons/permission/<slug>/`.
- Build validates permission rows against the registry, excludes revoked vendors,
  emits attribution fields; `SaintView.astro` renders the agreed wording + icon-page link.
- Redacted permission record in `docs/permissions/theophany-works.md`.

**Trial:** permission is provisional — do NOT merge to main (production) until
Theophany Works confirms after reviewing the preview.

## Preview
<Cloudflare Pages preview URL — add once the check is green>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Add the preview URL.** Once the Cloudflare Pages check is green, the branch alias is `feat-vendor-permission-icons` (≤28 chars). Preview: `https://feat-vendor-permission-icons.orthodox-saints.pages.dev/saint/OS-0001`. Edit the PR body's `## Preview` section with the verified URL.

- [ ] **Step 5: Hand off.** Report the preview URL to the user to share with Theophany Works. **Do not merge** (merging = production deploy; trial pending vendor confirmation).

---

## Notes / self-review

- **Spec coverage:** registry (Task 1), `Permission:<slug>` validation (Task 2), record join (Task 3), build wiring (Task 4), attribution rendering (Task 5), the icon + registry row + redacted record (Task 6), CLAUDE.md (Task 7), preview delivery (Task 8). All spec sections mapped.
- **Finder cards:** the trimmed finder index (`src/lib/data.ts`) carries only `image`, not attribution — so permission thumbnails appear on cards without a caption, and the attribution + icon-page link appears on the saint detail page. This matches existing PD/CC behavior (attribution is detail-page-only) and still satisfies the vendor condition (the icon-page link is clearly shown on the saint page). No change needed.
- **Reversibility:** the old `static/icons/OS-0001.jpg` (PD-art) stays on disk; reverting OS-0001 is a one-line `saint_images.csv` change.
- **Trial safety:** Task 8 explicitly does not merge; production waits on vendor confirmation.
