# Legacy Icons — Image Harvest Plan

**Goal:** Turn the Legacy Icons permission grant (`docs/permissions/legacy-icons.md`)
into wired portraits across all three databases, without ever guessing a saint's
identity and without crawling a partner's storefront harder than a guest should.

**Why it matters, in one number:** 2,766 of our 2,908 saints have no real icon —
**144 covered, 4.95%**. The Legacy Icons saints category alone holds **651 products**.
Even a conservative match rate roughly triples portrait coverage, and that is the
single largest visual gap on the site.

---

## What we know about the catalog

Established 2026-08-03 by inspection; re-verify before a long run.

| Fact | Value |
|---|---|
| Platform | **BigCommerce** (store hash `s-8npwm6ltcj`) |
| Saints category | `https://legacyicons.com/icons/saints/` — **651 products** |
| Other categories | `/icons/jesus-christ/`, `/icons/virgin-mary/`, `/icons/holy-trinity/` |
| Pagination | `?page=N`; per-page selector offers 8/12/16/20/40/**100**/all |
| Sitemap | `https://legacyicons.com/xmlsitemap.php` |
| Product URL | `/<slugified-title>-<sku>/` e.g. `/saint-nicholas-of-myra-icon-s220/` |
| Title format | `Saint Nicholas of Myra Icon - S220` — **the saint is named in the title** |
| SKU prefix | `S###` = saints & angels · `F###` = feasts/scenes of Christ |
| Full-size image | `cdn11.bigcommerce.com/s-8npwm6ltcj/images/stencil/**1280x1280**/products/<pid>/<iid>/<file>.jpg?c=1&imbypass=on` |
| Structured data | BreadcrumbList only — **no JSON-LD Product schema**; parse `og:image` + `<title>` |

**The image path segment is resizable** (`/1280x1280/` → any dimensions), but fetch at
1280 and resize locally — we trim before scaling, and the CDN cannot do that.

### Their photography is staged, and that shapes the ingest

Legacy Icons photographs the **mounted plaque on a white sweep with a drop shadow**, and
every image carries a **"LEGACY ICONS" watermark** across the middle. This is not
Theophany Works, whose files are edge-to-edge icon art (the shipped `OS-0012.jpg` is a
bare 432×648 panel). Two ingest rules follow, both implemented in
`scripts/download_legacy_icons.py` and decided 2026-08-03:

- **Trim the staging, keep the watermark.** The trim stops at the plaque's own red edge,
  so it removes the photographic backdrop and nothing else. **The watermark stays fully
  intact** — stripping a vendor's mark from an image used under a revocable courtesy
  would be indefensible; cropping the white around it is just cropping. A trim that
  would remove more than half the area is treated as a misfire and discarded.
- **Fit inside 800×800 instead of scale-width-then-top-crop.** The house top-crop
  (CLAUDE.md §5) exists for photographs, where the face is near the top and the bottom is
  background. These are whole icon panels at roughly 4:5, so the top crop would cut the
  bottom fifth off every one — Mary of Egypt loses her blessing hand. Fitting inside the
  box honours the same ≤800px ceiling with nothing cut.

Worth raising with Dean eventually: whether they hold unwatermarked or unstaged art.
Not a blocker — the trimmed images are good — but it would close the gap with the
Theophany files.

### robots.txt — read this before writing a fetch loop

`legacyicons.com/robots.txt` disallows `*` only from account/cart/checkout/login/search
and admin paths. Category and product pages are permitted. **But it also names a long
list of AI crawlers — `Claude-Web`, `GPTBot`, and others — and gives them
`Crawl-delay: 10`.**

We are not crawling as a training bot, and we hold a written grant. That is not licence
to be fast. **Honour the 10-second delay anyway**, send a descriptive User-Agent that
identifies this project with a contact address, and fetch serially. The OCA harvester's
docstring records what the alternative costs: a burst of failing requests tripped their
WAF and got this machine IP-blocked *by the very people who had granted the permission*.
Do not repeat that with Legacy Icons.

---

## Task 0 — Ask Dean for a product feed first (do this before writing any crawler)

BigCommerce exports a product CSV — name, SKU, URL, image URL — from the admin in about
three clicks. If Dean sends one, **the entire crawl disappears**: no fetch loop, no delay
budget, no WAF risk, and the titles are authoritative rather than scraped.

- [ ] Email Dean asking for a product export or media kit (draft below), noting that we
      will otherwise crawl slowly and politely, so either answer is fine.
- [ ] If a feed arrives, drop it at `dist/legacy_icons_feed.csv` and **skip Task 1's
      fetch stage entirely** — go straight to matching.

This task is first because it is cheap, it is courteous, and it can delete the most
fragile part of the plan.

---

## Task 1 — `scripts/download_legacy_icons.py` (propose-only harvester)

Model it on `scripts/download_saint_hymns.py`: cache to disk, fetch serially, and
**write a review queue, never the real data files.** The reason is the same one that
governs every join in this repo — *the join is by saint identity, and identity is exactly
what automated name matching gets wrong.* There are five Barlaams in `saints.csv`. A
portrait filed against the wrong man is worse than no portrait, because it looks right.

- [ ] **Stage A — catalog.** Walk `/icons/saints/?page=N&limit=100` (7 pages) plus the
      Christ / Virgin Mary / Holy Trinity categories. Cache raw HTML under
      `dist/legacy_icons/`. Extract per product: title, SKU, product URL, thumbnail URL.
      **Category pages only at this stage** — do not touch 651 product pages to learn
      651 titles you already have.
- [ ] **Stage B — match.** For each product title, strip the ` Icon - S###` suffix and
      the parenthetical iconographer/century marks (`(Whirledge)`, `(XXIc)`,
      `(Fiorenzo)`), then score against `saints.csv` Name + Also Known As with the
      hymn harvester's `fold`/`tokens`/`jaccard` helpers. Emit **every** candidate with
      its score so a reviewer sorts by risk.
- [ ] **Stage C — route.** Classify each product before matching, because they do not all
      belong to the same database:

  | Product | Destination |
  |---|---|
  | A named saint | `data/saint_images.csv` / `saint_depictions.csv` |
  | Archangels, Guardian Angels | `data/host_images.csv` / `host_depictions.csv` (**HH-####**) |
  | Christ (`I Am the Vine`, `Walking on the Water`) | OS-0000 |
  | The Theotokos | OS-0001 |
  | A feast or scene (`F###` SKUs, `The Visitation…`) | `data/feast_images.csv` / `feast_depictions.csv` (**FF-####**) |
  | Not-yet-glorified figures (`Father Seraphim Rose of Platina`) | **SKIP — §9 canonization caution** |
  | Prayer cards, micro icons | skip when the same icon exists as a full product |

  The catalog carries at least three Guardian Angel icons and several archangels, so the
  Heavenly Hosts DB (18 host images today) is a real beneficiary, not an afterthought.

- [ ] **Stage D — review CSV.** Write `dist/legacy_icons_review.csv`:
      `product_title, sku, product_url, image_url, guess_db, guess_id, guess_name,
      score, existing_image, decision`. `existing_image` matters — it tells the reviewer
      at a glance whether this is a new hero or a carousel card.
- [ ] **Stage E — download.** Only for rows a human has marked `decision=accept`. Fetch
      the 1280px CDN image, then `save_resized()` (≤800px wide, top-crop to ≤800px tall,
      JPEG q80) into `static/icons/permission/legacy-icons/`, then
      `python3 scripts/make_icon_thumbs.py` for the ~200px avatar thumbs.

**Flags:** `--limit N` to cap products, `--no-fetch` to re-parse the cache, `--delay`
defaulting to **10.0** and documented as *do not lower*.

---

## Task 2 — Review and promote, in batches

- [ ] Run `make report` (or `python3 build.py --report`) and intersect its ranked
      portrait-less saints with the matched catalog. **That intersection is the batch
      order** — the report exists so icon batches are self-directing rather than
      hand-picked (CLAUDE.md §5).
- [ ] Work in batches of ~30–40 saints, one PR each. That is how the Theophany icons
      landed after the initial backfill (#367 A–C), and it keeps a bad match reviewable.
- [ ] For each accepted row write into `data/saint_images.csv` (or the host/feast
      sibling):

  ```
  OS-####,icons/permission/legacy-icons/OS-####.jpg,Permission:legacy-icons,,<product_url>
  ```

  `license` is the `Permission:legacy-icons` token; `credit` stays **empty** (the
  registry's `attribution` column supplies the wording); `source` is the **specific
  product page** — the grant's stated condition. The build **fails** a permission row
  with no `source`, so this cannot be silently forgotten.

### Hero vs carousel — the default, and why

- Saint has **no** portrait → the Legacy icon becomes the **hero**. This is where nearly
  all the value is: 2,766 saints are in this bucket.
- Saint **already has** a portrait (Theophany, or public-domain) → the Legacy icon
  becomes a **carousel card** in `saint_depictions.csv`.

Do **not** churn an existing wired hero to promote a Legacy one. The Theophany backfill
demoted PD heroes to the carousel because the vendor icons were markedly better for a
hero crop; there is no such reason here, and re-shuffling one partner's icons to feature
another's is a bad look for a project whose whole pitch to both of them was *we are a
museum wall label, not a shop competing for the sale.*

Depiction cards need `kind` (`shop` for a vendor product), a `title`, and their own
`source`. File extra images for one saint as `OS-####-<slug>.jpg`, the convention already
used for the Christ carousel (`OS-0000-pantocrator.jpg`).

### Identity guardrails — the ones that will actually bite

- **Two products, same name, different saints.** `Saint Patrick Icon - S228` and
  `- S410` are two icons of *one* saint (hero + card). `Saint Nicholas of Myra` vs
  `St. Nicholas, Enlightener of Japan` (OS-0590, rank 13 on the report) are two saints.
  Read the product description — Legacy Icons writes a real biography on each page, which
  is a far better disambiguator than the title.
- **`Saint Anthony`** — verify it is Anthony the Great and not Anthony of Padua, who is
  post-schism Western and out of scope entirely (§1).
- **Pre-schism Western saints are in scope** — Patrick, Augustine, Dymphna, Benedict all
  belong here, and several sit high on the report.
- **Never match on first name alone.** Where the title gives no epithet
  (`Saint George (XXIc)`), confirm against the description before accepting.

---

## Definition of done, per batch

1. `python3 build.py --check-only` → **CLEAN, 0 errors**.
2. Every new file exists under `static/icons/permission/legacy-icons/` with a thumb
   under `static/icons/thumbs/`.
3. Every row carries a `source` pointing at that icon's own product page.
4. Spot-check the rendered credit on the preview deploy: *"Icon used with permission
   from Legacy Icons. Original icon: View on Legacy Icons."*
5. PR notes any identity judgment call, per the template's checklist (§12.7).

## Revocation rehearsal (run it against the FIRST batch)

Flip `status=revoked` for `legacy-icons` in `data/image_permissions.csv`, run
`make validate`, confirm every Legacy image drops out with a warning listing the files,
then flip it back. We promised Dean the switch works; verify it while the catalog is
still small enough to check by eye.

- [x] Run against the empty registry row (2026-08-03) — validation stays clean and the
      row round-trips. This proves the plumbing, **not** the kill-switch: with zero
      Legacy images there is nothing for it to drop.
- [x] **Re-run against a real wired image (OS-1365, 2026-08-03) — the switch works.**
      `status=revoked` → the build warns `saint_images.csv line 146 (OS-1365): vendor
      'legacy-icons' permission is REVOKED — image excluded from output`, names the file
      to delete, and `public/data.json` emits `image: None` for that saint. Back to
      `active` → the image and its `imageVendor: Legacy Icons` attribution return. The
      promise to Dean is now tested, not asserted.
