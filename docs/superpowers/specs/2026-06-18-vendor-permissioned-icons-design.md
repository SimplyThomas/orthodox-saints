# Vendor-permissioned saint icons — design

**Date:** 2026-06-18
**Status:** approved (brainstorming)
**Branch:** `feat/vendor-permission-icons` (isolated worktree)

## Problem

We have received permission to use saint icons from **Theophany Works**
(<https://theophanyworks.com/holy-icons/>) — high-quality images that are hard to
source reliably in the public domain. Using them both improves the site and drives
traffic to the iconographer/dealer (the site is non-commercial; no revenue motive).

Two things block this today:

1. **The build only accepts open licenses.** `build.py` (`license_ok` / `OPEN_LICENSES`)
   passes only `PD` / `PD-art` / `PD-old` / `CC0` / `CC-BY*` / `CC-BY-SA*`. A
   "used with permission" image is none of these and would **fail the build** (CLAUDE.md §9).
2. **"Used with permission" is a different legal category.** It is a *revocable,
   per-project grant*, not a redistributable open license. The repo otherwise advertises
   "Data: CC0" — vendor images are an explicit, tracked exception.

The user's primary concern: **manageability across multiple vendors.** If several vendors
grant permission and one later withdraws it, untangling that vendor's images must be
trivial and unambiguous — not a scavenger hunt.

Theophany Works wants to **see a sample page** before committing fully, so Phase 1 is a
trial demonstrated on one enriched page (the Theotokos, `OS-0001`).

## Goals

- Let the build accept and correctly attribute vendor-permission images.
- Make every permission image **traceable to its vendor** and **removable in one move**.
- Demonstrate the result on the Theotokos page via a **Cloudflare PR preview** (no
  production deploy until the vendor commits).
- Lay groundwork that scales to a **bulk backfill** (Phase 2) with zero schema changes.

## Non-goals (this PR)

- The bulk catalog backfill itself (Phase 2 — separate effort).
- Widening the open-license gate or changing how PD/CC images are handled.
- Any production deploy. Phase 1 ships only to the PR preview.

## Design

### 1. Permissions registry — `data/image_permissions.csv` (new, source of truth)

One row per vendor grant. This is the single place that controls attribution text and the
on/off switch.

```
vendor_slug,vendor_name,attribution,homepage,granted,status,terms
theophany-works,Theophany Works,"Icon used with permission from Theophany Works.",https://theophanyworks.com/holy-icons/,2026-06-18,active,"See docs/permissions/theophany-works.md"
```

| Column | Meaning |
|---|---|
| `vendor_slug` | Permanent kebab-case key. Ties images, the icon folder, and the docs record together. |
| `vendor_name` | Display name used in attribution. |
| `attribution` | The lead sentence rendered on the saint page. |
| `homepage` | Vendor's icon homepage (link target / traffic driver). |
| `granted` | ISO date permission was granted. |
| `status` | `active` or `revoked`. **The kill-switch.** |
| `terms` | Short summary / pointer to the redacted docs record. |

**Revocation = one line.** Set `status=revoked`. The build then **excludes every image
from that vendor** from the emitted data (saints fall back to the monogram avatar) and
prints a prominent warning listing the residual files under
`static/icons/permission/<slug>/` to delete. Full untangle:
`status=revoked` → `rm -rf static/icons/permission/<slug>/` → drop the matching
`saint_images.csv` rows → optionally remove the registry row + docs record. All four
touch points are keyed by the same `vendor_slug`.

### 2. `data/saint_images.csv` ties an image to a vendor — header unchanged

```
OS-0001,icons/permission/theophany-works/OS-0001.jpg,Permission:theophany-works,,https://theophanyworks.com/icon-of-the-sweet-kissing-theotokos-glykophiloussa-detail-21st-c-00vmt002/
```

- `license` = `Permission:<vendor_slug>`. Greppable per vendor; validated against the registry.
- `image_path` lives under `static/icons/permission/<vendor_slug>/` — physically grouped per vendor.
- `source` = the **specific** icon page (required for permission images).
- `credit` left blank — derived from the registry's `vendor_name`.

### 3. Build changes — `build.py`

- **Recognize `Permission:<slug>`** in the image-validation path *before* `license_ok`
  (which would otherwise reject it). For such rows, validate instead:
  - the file exists under `static/` (existing check);
  - the `<slug>` exists in `data/image_permissions.csv` (else **fatal**);
  - the vendor's `status` is `active` — if `revoked`, **exclude** the image from output
    and emit a warning (not a hard error, so the site still builds/deploys);
  - a non-empty `source` is present (else **fatal** — permission images must link out).
- **Load the registry** (`data/image_permissions.csv`); fail loud on a bad `status`
  value, duplicate `vendor_slug`, or missing required columns — mirroring the existing
  groups/images validation style.
- **Emit** onto the saint record for an active permission image:
  - `image` (path, as today),
  - `imagePermission: true`,
  - `imageVendor` (vendor_name),
  - `imageAttribution` (the registry `attribution` sentence),
  - `imageVendorHome` (homepage),
  - `imageSource` (the per-row specific icon page).
  - `imageLicense` is **not** set for permission images (the wording carries the meaning).
- Open-license (PD/CC) images are unchanged.

### 4. Attribution rendering — `src/components/SaintView.astro`

Permission images render the agreed wording instead of the compact `Icon · credit · license`
caption:

> Icon used with permission from Theophany Works.
> Original icon: [View on Theophany Works →](https://theophanyworks.com/icon-of-the-sweet-kissing-theotokos-glykophiloussa-detail-21st-c-00vmt002/)

- Branch on `m.imagePermission`. When true: render `imageAttribution`, then
  `Original icon: ` + a link to `imageSource` with text `View on {imageVendor}`.
- When false: the existing PD/CC caption is unchanged.
- Plumb the new fields through `src/lib/types.ts`, `src/lib/saintView.ts` (and the
  trimmed finder index if it carries image meta — verify during implementation).

### 5. The grant record — `docs/permissions/theophany-works.md` (new, **redacted**)

A committed, human-readable record of the permission: grant date, vendor, the icon URL(s)
covered, a summary of the terms, and the attribution wording in use. **Personal contact
details (email address, phone, signature block) are stripped** — the repo is public.
*(Requires the user to paste the email so it can be redacted into this file.)*

### 6. The Theotokos demo image

- Source: <https://theophanyworks.com/icon-of-the-sweet-kissing-theotokos-glykophiloussa-detail-21st-c-00vmt002/>
  (Sweet Kissing Theotokos / Glykophilousa).
- Download the image, resize per CLAUDE.md §5 (scale width ≤ 800 px, then top-crop height
  ≤ 800 px, JPEG quality 80), save to
  `static/icons/permission/theophany-works/OS-0001.jpg`.
- **First implementation step is to verify the page/image is fetchable**; if not, escalate
  before proceeding.
- The existing `static/icons/OS-0001.jpg` (PD-art) is left in place untouched; we only
  repoint OS-0001's row, so reverting is a one-line CSV change.

### 7. CLAUDE.md §9 update

Document the new vendor-permission category alongside the open-license rules: the
`Permission:<slug>` convention, the registry, the per-vendor folder, the revocation
procedure, and the standing rule that vendor imagery is a tracked, revocable exception to
the otherwise-open licensing.

### 8. Delivery

All of the above on the `feat/vendor-permission-icons` branch → PR → the **Cloudflare
Pages preview** URL is the sample page shared with Theophany Works. No squash-merge to
`main` (which would deploy to production) until the vendor confirms.

## Validation / definition of done (Phase 1)

- `make validate` clean (0 errors), `make build` succeeds, OS-0001 record carries the new
  permission fields.
- `make web-lint` and `make web-test` green (frontend touched).
- The Theotokos page renders the Theophany Works icon with the agreed attribution
  (verified on the preview).
- Revocation path manually sanity-checked: flipping `status=revoked` drops the image from
  output with a warning, and the build still succeeds.

## Phase 2 (sketch — not this PR): bulk backfill

After the vendor commits, match their full catalog to our saints and backfill icons. The
registry / `Permission:theophany-works` / per-vendor folder structure absorbs every new
image with **no schema changes**. The hard part is **correct icon→saint matching** (their
catalog naming → our `OS-####`); this will be a *reviewed* matching pass (a contact-sheet /
review-queue workflow like the existing Wikimedia downloader), never a blind bulk insert —
a wrong-saint attribution is worse than a missing icon. Designed as its own spec → plan →
implementation cycle.

## Risks / notes

- **Revocable grant:** images are non-redistributable; the registry + per-vendor folder
  make removal a one-line + one-`rm` operation.
- **Provisional permission:** Phase 1 stays on the preview; production waits on the vendor.
- **Clergy/correct-saint review** (CLAUDE.md §9) still applies — especially for the Phase 2
  bulk match.
