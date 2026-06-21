# Image permission — Theophany Works

**Vendor:** Theophany Works — <https://theophanyworks.com/holy-icons/>
**Granted:** 2026-06-17, by Emmelia Rodriguez (Theophany Works)
**Requested by:** Shelby Krug, on behalf of A Cloud of Witnesses / OrthodoxSaintFinder.com
**Status:** active (trial — a sample page was provided for the vendor's review before
full commitment)

## Grant (verbatim condition)

> "We certainly would be willing to grant permission for this if the link to the
> icon page is clearly shared. If you can send a page example that would be great!"

The original request asked to use Theophany Works' saint images on our saint pages
"with clear attribution and have each image link directly back to the corresponding
page on your website."

## Terms as implemented

- **Each image links to its specific icon page** on theophanyworks.com — the `source`
  column of the image's row in `data/saint_images.csv` (the grant's stated condition).
- **Visible attribution on each saint page:** "Icon used with permission from
  Theophany Works. Original icon: View on Theophany Works" (rendered by
  `src/components/SaintView.astro`).
- Images are tracked as a **revocable, per-vendor grant** in
  `data/image_permissions.csv` (vendor_slug `theophany-works`); the image files live
  under `static/icons/permission/theophany-works/` and each row's license is
  `Permission:theophany-works`.

## To revoke (if permission is ever withdrawn)

1. Set `status=revoked` for `theophany-works` in `data/image_permissions.csv` — the
   build then excludes every Theophany Works image from output (saints fall back to the
   monogram avatar) and prints a warning listing the files to remove.
2. `rm -rf static/icons/permission/theophany-works/`
3. Remove the matching rows from `data/saint_images.csv` (and, if no longer needed, the
   registry row and this record).

## Provenance

Permission was obtained via the Theophany Works "Contact Us" form (2026-06-16) and
granted by email reply (2026-06-17). Personal contact details (email addresses, phone
number) are intentionally omitted from this public record; the original correspondence
is retained privately by the site owner.
