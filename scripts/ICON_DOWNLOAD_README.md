# Saint icon downloader — `download_saint_icons.py`

Searches Wikimedia Commons for an open-licensed Orthodox icon of each saint in
`dist/saint_image_worklist.csv`, downloads the best match into
`static/icons/<saint_id>.jpg`, and queues everything for human review.

Every result is written with `image_status = needs_review`. **Nothing is
published automatically** — a person must verify each icon (right saint, right
license) and promote it into `data/saint_images.csv` before it ships (see
CLAUDE.md §5 and §9).

## What it does

For each saint:

1. **Search** Commons full-text in the File namespace
   (`generator=search`, `gsrnamespace=6`) for `"<name> Orthodox icon"`, with
   simpler fallback queries (`"<bare name> icon"`, `"<core name> icon"`) to lift
   the hit rate. Imageinfo + `extmetadata` come back in the *same* request.
2. **Filter by license** — keeps only reusable licenses and rejects NC/ND:
   - `PD` / `PD-art` / `PD-old` / public domain
   - `CC0`
   - `CC-BY` (any version)
   - `CC-BY-SA` (any version)
3. **Filter for relevance** — the candidate's title must contain a distinctive
   token from the saint's Name or *Also Known As*, normalised so transliteration
   variants match (`Photini`≈`Fotini`, `Symeon`≈`Simeon`). This rejects the junk
   loose queries attract: street signs, an artist who merely shares the saint's
   given name, unrelated book scans. Candidates are then ranked by how many
   distinct tokens they match (so "Isaac the **Syrian**" beats "Sacrifice of
   Isaac", "Tikhon of **Moscow**" beats "Tikhon of Voronezh").
4. **Restrict to raster images** — `jpeg/png/gif/webp` only (skips `tiff`,
   `djvu`, `pdf`, `svg`).
5. **Download + resize** — scale width to ≤800px, top-crop height to ≤800px,
   save JPEG quality 80 (matches CLAUDE.md §5).
6. **Record** — write `image_url`, `image_source_url`, `license`, `credit`,
   `image_status=needs_review` back into the worklist CSV, and append the saint
   to `dist/image_review.csv`.

## Safety / idempotency

- **Skips already-approved saints** — any `saint_id` present in
  `data/saint_images.csv` (the curated source of truth) is never touched.
- **Skips already-downloaded files** — a re-run won't re-fetch an existing
  `static/icons/<id>.jpg`. Pass `--force` to override.
- Interrupting with Ctrl-C saves progress so far before exiting.

## Two gotchas this script gets right (and the first attempt didn't)

1. **User-Agent.** Wikimedia enforces a [UA policy](https://meta.wikimedia.org/wiki/User-Agent_policy).
   A generic UA (e.g. `Mozilla/5.0 (test)`) gets **HTTP 403** from both the API
   and the `upload.wikimedia.org` CDN. The script sends a descriptive UA with a
   contact URL/email, which works anonymously.
2. **Search endpoint.** File discovery must use `list`/`generator=search` with
   `srnamespace=6` (full-text). `opensearch` only matches page-title *prefixes*
   and returns nothing useful for icons.

## Usage

```bash
# one-time: authoring-only deps (NOT in requirements.txt — see CLAUDE.md §4)
pip install requests Pillow python-dotenv

make download-icons                    # or: python scripts/download_saint_icons.py
make docker-download-icons             # containerised alternative
```

Useful flags:

```bash
python scripts/download_saint_icons.py --limit 25     # try first 25 (smoke test)
python scripts/download_saint_icons.py --start 500    # resume from row 500
python scripts/download_saint_icons.py --force        # re-fetch existing files
```

### Optional: Commons bot login (higher rate limit)

Anonymous access works fine. To authenticate, put credentials in `.env`
(see `.env.example`):

```
WIKIMEDIA_BOT_USER=YourAccount@BotName
WIKIMEDIA_BOT_PASSWORD=...
```

## After the run — review workflow

1. Open `dist/image_review.csv`. For each row, open `image_source_url` and the
   local image and confirm: it's the right saint, it's a traditional icon, the
   license is correct.
2. For approved icons, add a row to **`data/saint_images.csv`**
   (`saint_id,image_path,license,credit,source`), e.g.:
   ```csv
   OS-0058,icons/OS-0058.jpg,PD-art,,https://commons.wikimedia.org/wiki/File:Saint_Phanourios_Cretan_Icon.jpg
   ```
   `CC-BY*` rows **must** include a `credit` (the build enforces this).
3. Delete rejected images from `static/icons/`.
4. `make validate` (license/existence gate) → `make build` → `make serve`.

## Known residual error modes (why review is mandatory)

- **Same-name, different saint** — "Sacrifice of Isaac" (the patriarch) vs
  St. Isaac the Syrian; "Tikhon of Voronezh" vs "of Moscow". Token-count ranking
  reduces but doesn't eliminate these.
- **Group icons** — a saint may appear in a multi-figure icon (e.g. "Saints of
  Alaska"). Often acceptable, sometimes not — a human decides.
- **No open-licensed icon exists** — many modern/obscure saints (e.g. St.
  Porphyrios, St. Paisios) have only in-copyright photos on Commons; the script
  correctly downloads nothing and they keep their generated monogram.
