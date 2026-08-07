# Permissions

Every third-party image or text on this site is used under one of three things: a
public-domain or open license, **a permission recorded in this folder**, or nothing
— in which case it is not used at all. A source link is not permission (CLAUDE.md
§9).

This folder is the register. It exists so that a grant given in one email in one
year can be honoured, checked, and — most importantly — **undone** by someone who
was never party to the conversation.

## What is here

| File | What it is |
|---|---|
| [`AGREEMENT.md`](AGREEMENT.md) | **The standard terms.** The document we send a publisher when we ask. Plain language, no legalese; what we do with an image, what we never do, how to revoke. |
| [`emails.md`](emails.md) | Wording for the three emails: asking a new publisher, confirming a grant already given, acknowledging a revocation. |
| [`theophany-works.md`](theophany-works.md) | Image grant — Theophany Works, 2026-06-17 / confirmed 2026-06-23. |
| [`legacy-icons.md`](legacy-icons.md) | Image grant — Legacy Icons, 2026-08-03. |
| [`oca.md`](oca.md) | **Text** grant — the Orthodox Church in America, 2026-07-18 and 2026-07-30. Text only; the OCA cannot grant its icons. |

## Two registries, deliberately separate

| | Images | Text |
|---|---|---|
| Registry | `data/image_permissions.csv` | `data/text_permissions.csv` |
| Key column | `vendor_slug` | `source_slug` |
| Token in the data | `license = Permission:<slug>` | `translation = Permission:<slug>` |
| Files live under | `static/icons/permission/<slug>/` | — |

They are separate files on purpose. The OCA granted us its **words** and said
plainly that it cannot grant its **icons**; if one registry served both, a text
grant would be reachable from the image gate and that distinction could be lost by
accident.

Both registries share a shape: `slug, name, attribution, homepage, granted, status,
terms`. `status` is the kill switch — see [Revoking](#revoking).

## What the build enforces

None of this rests on anyone remembering it. `build.py` fails or drops:

- A `Permission:<slug>` token whose slug is **not in the registry** → build fails.
- A permission image or text with **no `source`** → build fails. Every grant so far
  is conditioned on crediting *and* linking the rights-holder's own page, so a
  permission row with nowhere to link cannot honour its terms.
- A registry row whose `status` is **`revoked`** → every image or text from that
  holder is dropped from the output, with a warning listing the files to delete.
  Saints fall back to the monogram avatar; hymns simply do not render.
- Permission material **never reaches the redistributable artifacts**.
  `dist/Orthodox_Saints_Database.xlsx` and `public/saints.sqlite` are emitted from
  the source CSV columns only, which carry no image paths and no permission text.
  Keep it that way — a web page is not a redistribution, a downloadable dataset is.

The attribution renders **beside the image or text**, never as a page-level
footnote. The credit is the condition the material is used under, so it travels with
the material.

## Adding a publisher

1. **Ask**, using template 1 in [`emails.md`](emails.md). Offer a live sample page.
2. **Write the record** — a new `docs/permissions/<slug>.md`, following the shape of
   the two existing image files: grantor, date, who granted it, the request as made,
   the reply **quoted verbatim**, the terms as implemented, the revocation steps, and
   provenance. Quote the grant rather than paraphrasing it; the paraphrase is what
   drifts. Keep personal contact details out (this record is public) and retain the
   original correspondence privately.
3. **Add the registry row** to `data/image_permissions.csv` with `status=active`, an
   `attribution` line, and a `terms` summary pointing at the record.
4. **Put the files** under `static/icons/permission/<slug>/`, resized as in
   CLAUDE.md §5 (≤800 px, JPEG q80, plus a ~200 px thumb).
5. **Wire the rows** in `data/saint_images.csv` / `data/saint_depictions.csv` (and
   the feast and host equivalents) with `license = Permission:<slug>` and a `source`
   pointing at that icon's own page on the publisher's site.
6. `make validate` — clean.

## Revoking

The whole point of the register. Triggered by an email from the publisher, or by
this site ceasing to be free (which would void the OCA text grant, and is a promise
made in `AGREEMENT.md` §7 to every image publisher too).

1. Set `status=revoked` for the slug in the registry. **This alone stops the
   material shipping** — the build drops all of it and warns, listing what to delete.
2. `rm -rf static/icons/permission/<slug>/` (images), or delete the
   `Permission:<slug>` rows from `data/saint_hymns.csv` and any profile YAML (text).
3. Remove the matching rows from the image joins.
4. Set the publisher's record in this folder to `revoked`, with the date and reason.
5. `make validate`, then merge and deploy — the deploy purges the Cloudflare edge
   cache, so the images stop being served rather than lingering in front of the site.
6. Confirm in writing, using template 3 in [`emails.md`](emails.md). Send it after
   the removal, not before.

A **partial** revocation — one image, or a set — is the same process minus step 1:
delete the rows and files, and **record the restriction** in the publisher's file so
it is not undone by the next person sourcing icons.

## Counting what is in use

Before sending a confirmation email or updating the appendix in `AGREEMENT.md`:

```sh
python3 - <<'PY'
import csv, collections
joins = ["saint_images", "saint_depictions", "feast_images",
         "feast_depictions", "host_images", "host_depictions"]
files = collections.defaultdict(set)
rows = collections.defaultdict(collections.Counter)
for j in joins:
    try:
        f = open(f"data/{j}.csv", newline="", encoding="utf-8-sig")
    except FileNotFoundError:
        continue
    for r in csv.DictReader(f):
        lic = (r.get("license") or "").strip()
        if lic.startswith("Permission:"):
            v = lic.split(":", 1)[1]
            files[v].add(r["image_path"])
            rows[v][j] += 1
for v in sorted(files):
    print(f"\n{v}: {len(files[v])} distinct images, {sum(rows[v].values())} placements")
    for j, n in rows[v].items():
        print(f"   {j}: {n}")
PY
```

## The standing caveat

Permission to reproduce is not review. Everything CLAUDE.md §9 says about clergy
and source review still applies: a permitted image is reliably *sourced*, but
whether it is the right icon of the right saint, and how it is framed on the page,
remains ours to get right.
