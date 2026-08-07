# Image permission — Legacy Icons

**Vendor:** Legacy Icons — <https://legacyicons.com/>
**Granted:** 2026-08-03, by Dean Hunt (CMO | COO, Legacy Icons)
**Requested by:** Shelby Krug, on behalf of A Cloud of Witnesses / OrthodoxSaintFinder.com
**Status:** active — full grant, on the same terms as Theophany Works
**Standard terms:** [`AGREEMENT.md`](AGREEMENT.md) — written after this grant was
given, and describing it rather than changing it. See `emails.md` template 2 for
the note that puts the arrangement on record with the vendor.
**In use as of 2026-08-07:** 254 images across 267 placements — 153 saint portraits,
4 saint carousel cards, 18 feast portraits, 74 feast cards, 2 angel portraits,
16 angel cards.

## Grant

The request (2026-07-20) described the project as a free, non-commercial educational
database that shows an icon on a saint's page with a visible credit and a link back to
the vendor's own page for that icon, and set out the existing Theophany Works
arrangement as the model: an informal, revocable courtesy, no money exchanged, no
exclusivity. Legacy Icons granted it by email reply:

> "We had a chance to review the information and discuss it internally. We would like to
> move forward and allow you to use our images and links to our site. I would in the
> beginning just approach it like Theophany Works."

The grant is therefore **the Theophany Works terms applied to Legacy Icons**: their
images may be displayed on the relevant saint pages, each carrying a visible
"used with permission" credit and linking back to that specific icon's page on
legacyicons.com. It is a **revocable, non-redistributable, per-vendor courtesy** — not
an open license, and never to be relabelled as one (§9).

Dean also asked what we need from their end to get started; that conversation (image
sourcing, and whether they would prefer we route our outbound links through tracked or
affiliate URLs) is a relationship item, not a licensing term, and does not change what
is recorded here.

## Terms as implemented

- **Each image links to its specific icon page** on legacyicons.com — the `source`
  column of the image's row in `data/saint_images.csv` (the saint's primary portrait)
  and/or `data/saint_depictions.csv` (the "Depictions & Icons" carousel cards). The
  build **fails** a permission row that has no `source`, so this cannot be forgotten.
- **Visible attribution on the saint page:** the primary portrait shows "Icon used with
  permission from Legacy Icons. Original icon: View on Legacy Icons" (the hero icon
  caption in `src/components/SaintView.astro`, driven by the `attribution` column of the
  registry row); each carousel card links back to its vendor icon page.
- Images are tracked as a **revocable, per-vendor grant** in
  `data/image_permissions.csv` (vendor_slug `legacy-icons`); the image files live under
  `static/icons/permission/legacy-icons/` and each row's license is
  `Permission:legacy-icons`.

## To revoke (if permission is ever withdrawn)

1. Set `status=revoked` for `legacy-icons` in `data/image_permissions.csv` — the build
   then excludes every Legacy Icons image from output (saints fall back to the monogram
   avatar) and prints a warning listing the files to remove.
2. `rm -rf static/icons/permission/legacy-icons/`
3. Remove the matching rows from `data/saint_images.csv` and
   `data/saint_depictions.csv` (and, if no longer needed, the registry row and this
   record).

## Provenance

Permission was requested by email (2026-07-20) and granted by email reply from Legacy
Icons' CMO | COO. Personal contact details (email addresses, phone numbers) are
intentionally omitted from this public record; the original correspondence is retained
privately by the site owner.
