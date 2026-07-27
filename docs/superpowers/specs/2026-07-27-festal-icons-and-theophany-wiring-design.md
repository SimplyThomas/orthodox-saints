# Festal-icon pipeline (#350) + wiring the remaining Theophany icons (#367 A1–A4)

**Date:** 2026-07-27
**Issues:** [#350](https://github.com/SimplyThomas/orthodox-saints/issues/350) (festal-icon pipeline), [#367](https://github.com/SimplyThomas/orthodox-saints/issues/367) A1–A4 (wire 56 remaining Theophany Works icons)

## Problem

Theophany Works granted full permission to use their icons (confirmed 2026-06-23;
condition: **each image links back to its product page**). PRs #193 + #208 wired 183 of
their 261 icons. Issue #367 audits the remaining 78; sections **A1–A4** cover 56 icons with
a confident target:

- **A1 (26):** feast-scene icons → `/feast/[id]`. **Blocked** — the feast page renders
  `image`/`imageCredit`/`depictions[]` but there is **no data source**; the #350 festal-icon
  pipeline does not exist yet.
- **A2 (12):** Christ portraits → OS-0000.
- **A3 (15):** Theotokos icons → OS-0001.
- **A4 (3):** individual saints → OS-0050 (John of SF), OS-0021 (Basil the Great).

A2–A4 use the existing saint-image pipeline; A1 requires building #350 first.

## Scope & sequencing — two PRs

### PR 1 — Build the #350 festal-icon pipeline, then wire A1 (26 feast icons)

**Pipeline design mirrors `hostlib.py` verbatim** (the established precedent: hostlib
duplicates the licence helpers locally rather than importing from `build.py`, because
`build.py` imports `feastlib`/`hostlib` — importing back would be circular).

New source-of-truth CSVs (CRLF, `"; "` multi-sep, same as the other data CSVs):
- `data/feast_images.csv` — header `feast_id,image_path,license,credit,source`. **One hero
  festal icon per feast**, keyed by `FF-####`.
- `data/feast_depictions.csv` — header
  `feast_id,image_path,license,credit,source,kind,tag,title,era,by`. **Many carousel cards
  per feast**, rendered in file order.

`feastlib.py` additions (mirroring the hostlib functions):
- Constants: `FEAST_IMAGES_CSV`, `FEAST_IMAGES_HEADER`, `FEAST_DEPICTIONS_CSV`,
  `FEAST_DEPICTIONS_HEADER`. Reuse the existing `IMAGE_PERMISSIONS_CSV` registry.
- Licence helpers duplicated locally (`license_ok`, `license_requires_credit`,
  `permission_slug`, `load_image_permissions`) — identical to hostlib.
- `load_feast_images()` → `feast_id -> {path, license, credit, source}`.
- `image_thumb(path)` → thumb path if it exists under `icons/thumbs/…`, else None
  (identical to hostlib).
- `validate_feast_images(valid_ids)` → §9 gate: known FF id, existing local file under
  `static/`, an accepted **open** licence (CC-BY* needs a credit) **or** a
  `Permission:<vendor>` token validated against `data/image_permissions.csv`. Fail-loud on
  violation; a revoked vendor warns and the row is excluded.
- `load_feast_depictions()` → `feast_id -> [card, …]`.
- `validate_feast_depictions(valid_ids)` → same gate + required `title` + known `kind`
  (`museum`/`iconographer`/`shop`).
- Join into `to_record(...)`: attach `image`, `imageThumb`, `imageCredit`, `imageSource`,
  and (for a permission hero) `imagePermission`/`imageVendor`/`imageAttribution`; attach
  `depictions[]` where a permission card carries `permission`/`vendor`/`attribution` and an
  open card carries `license`/`credit`. Permission cards emit `source` (the product page)
  and **omit** the raw `Permission:<slug>` token (so the caption shows a clean linked
  credit, not the ugly token).

`build.py` wiring: call `feastlib.validate_feast_images` / `validate_feast_depictions`
alongside the existing `feastlib.validate` call, folding their errors/warnings into the
build's fail-loud aggregate (exactly as `build.py` invokes the host image validators).

**Frontend gap to close in this PR (required to honor the grant):** the feast hero caption
(`src/pages/feast/[id].astro`) currently renders `f.imageCredit` as **plain text**. The
Theophany grant requires each image to link to its product page, so:
- Add `imageSource?: string` (and `imagePermission?`, `imageVendor?`, `imageAttribution?`
  as needed) to the `Feast` interface in `src/lib/feasts.ts`.
- Update the hero caption to render a link to `imageSource` when present (mirroring the
  saint hero in `IconGifts.astro`, which links each permission image back to its page).
- The `depictions[]` carousel already links `source`; no change needed there. For a
  permission card, emit `credit` = vendor name so the linked caption reads cleanly and
  omit `license` (the card renderer appends `· {license}` — undesirable for a permission
  token).

**Wiring A1 — 26 icons → 12 feasts.** Download each from Theophany (extract the CDN image
from the product page's `og:image`, upsize the BigCommerce dimension segment), resize to
≤800px wide / ≤800px tall top-crop at JPEG q80, generate a ~200px thumb, self-host under
`static/icons/permission/theophany-works/feasts/`. For a feast with several candidates, the
**most classic historical** version becomes the hero (`feast_images.csv`); the rest become
carousel cards (`feast_depictions.csv`, `kind=shop`, `tag=Available to order`,
`by=Theophany Works`, `era` from the icon's dateline). Feast → icon mapping (from #367 A1):

| Feast | FF id | # | Icons (hero = classic historical version) |
|---|---|---|---|
| Pascha / Resurrection | FF-0001 | 5 | vatopedi 14th c, greek 14th c, protaton 13th c, crete 15th c, 21st c |
| Entrance of the Theotokos | FF-0004 | 1 | 21st c |
| Nativity of Christ | FF-0005 | 3 | 20th c, 21th c, gifts of the magi 21st c |
| Theophany / Baptism | FF-0006 | 2 | crete 15th c, meteora athos 14th c |
| Presentation of Christ | FF-0007 | 1 | 16th c |
| Annunciation | FF-0008 | 4 | base, with-st-george 15th c, 21st c, royal-doors set |
| Dormition | FF-0013 | 3 | base, 17th c, 21st c |
| Raising of Lazarus | FF-0043 | 1 | larnaca cyprus |
| Communion of the Apostles | FF-0047 | 1 | 21st c |
| Crucifixion / Holy Friday | FF-0048 | 3 | crucifixion, christ bearing the cross crete 15th c, deposition 15th c |
| Lamentation / Epitaphios | FF-0049 | 1 | 15th c |
| Life-Giving Spring | FF-0051 | 1 | base |

Total = 26. Exact hero picks finalized during implementation from the live images
(classic historical version preferred; "gifts of the magi" is a Nativity carousel card,
never the Nativity hero).

### PR 2 — Wire A2–A4 (30 saint icons; existing pipeline, no pipeline changes)

All four targets (OS-0000, OS-0001, OS-0021, OS-0050) **already have hero portraits**, so
every A2/A3/A4 icon becomes a **carousel card** in `data/saint_depictions.csv`
(`kind=shop`, `tag=Available to order`, `by=Theophany Works`, `title`/`era` from the icon):

- **A2 → OS-0000 (Jesus Christ):** 12 Christ portraits.
- **A3 → OS-0001 (Theotokos):** 15 Theotokos icons.
- **A4 → OS-0050, OS-0021:** John of SF (2) + Basil the Great (1).

Download/resize/thumb + self-host exactly as PR 1. **De-dupe** by actual product URL:
- Skip any `source` URL already present in `data/saint_depictions.csv` / `saint_images.csv`.
- The issue list contains ~3 duplicate SKUs (two `00vmt008`, two `00mtc014`, two
  `00ljc018`) — collapse by product URL, keep distinct products only.

## Guardrails (CLAUDE.md §9)

- Permission-gated images: `license = Permission:theophany-works`, files under
  `static/icons/permission/theophany-works/…`, each row's `source` = the specific product
  page (grant condition, also the required backlink). No clergy licence review needed —
  the grant is confirmed active in `data/image_permissions.csv`.
- No copyrighted text reproduced; images self-hosted (no hotlinks).
- Every image resized + thumbed like saint portraits (§5).

## Testing / definition of done (each PR)

- `make validate` clean (0 violations); `make test` if `build.py`/`feastlib.py` touched.
- `make web-build` + `make web-test` green (required CI gates), `make web-lint` clean.
- Manually confirm on the Astro dev server: a wired feast shows a linked hero + carousel;
  OS-0000/0001 show the new carousel cards.
- Cloudflare Pages preview link in each PR (previews render drafts/flagged too).
- PR 1 closes #350; both reference #367.

## Out of scope

- #367 sections B (identity checks), C1 (gap saints), C2 (OT/Trinity scenes), C3
  (multi-subject sets) — deferred, separate decisions.
- Festal icons from PD sources — the pipeline accepts them, but this work sources only the
  Theophany permission icons already granted.
