# Image permission — Theophany Works

**Vendor:** Theophany Works — <https://theophanyworks.com/holy-icons/>
**Granted:** 2026-06-17 (conditional); **confirmed in full 2026-06-23**, by Emmelia
Rodriguez (Theophany Works)
**Requested by:** Shelby Krug, on behalf of A Cloud of Witnesses / OrthodoxSaintFinder.com
**Status:** active — full grant (the vendor reviewed a live sample page and approved)

## Grant

The original request asked to use Theophany Works' saint images on our saint pages
"with clear attribution and have each image link directly back to the corresponding
page on your website." The first reply (2026-06-17) granted this conditionally:

> "We certainly would be willing to grant permission for this if the link to the
> icon page is clearly shared. If you can send a page example that would be great!"

After a sample saint page was shared for review, the vendor confirmed the grant in full
(2026-06-23):

> "Please use any of our images that work for this purpose."

The grant is broad ("any of our images") but remains a **revocable, non-redistributable,
per-vendor courtesy** — not an open license. The stated condition (each image links back
to its icon page) is honored throughout. The vendor also offered to run a promotional
story on social media when the site goes live, and raised the possibility of a future
partnership; those are relationship items, not licensing terms.

## Terms as implemented

- **Each image links to its specific icon page** on theophanyworks.com (the grant's
  stated condition) — the `source` column of the image's row in `data/saint_images.csv`
  (the saint's primary portrait) and/or `data/saint_depictions.csv` (the "Depictions &
  Icons" carousel cards).
- **Visible attribution on the saint page:** the primary portrait shows "Icon used with
  permission from Theophany Works. Original icon: View on Theophany Works" (the hero icon
  caption in `src/components/SaintView.astro`); each carousel card links back to its
  vendor icon page.
- Images are tracked as a **revocable, per-vendor grant** in
  `data/image_permissions.csv` (vendor_slug `theophany-works`); the image files live
  under `static/icons/permission/theophany-works/` and each row's license is
  `Permission:theophany-works`.

## To revoke (if permission is ever withdrawn)

1. Set `status=revoked` for `theophany-works` in `data/image_permissions.csv` — the
   build then excludes every Theophany Works image from output (saints fall back to the
   monogram avatar) and prints a warning listing the files to remove.
2. `rm -rf static/icons/permission/theophany-works/`
3. Remove the matching rows from `data/saint_images.csv` and
   `data/saint_depictions.csv` (and, if no longer needed, the registry row and this
   record).

## Provenance

Permission was obtained via the Theophany Works "Contact Us" form (2026-06-16), granted
conditionally by email reply (2026-06-17), and confirmed in full by email (2026-06-23)
after the vendor reviewed a live sample page. Personal contact details (email addresses,
phone number) are intentionally omitted from this public record; the original
correspondence is retained privately by the site owner.
