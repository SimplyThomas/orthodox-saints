# Cloud of Witnesses

*Find Orthodox saints by feast day, vocation, region, virtue, and intercession.*

A searchable, open-source database of **canonical Eastern Orthodox saints**, built so that
catechumens, inquirers, and the faithful can find a **patron saint or intercessor** for a
particular need, life situation, vocation, region, or background.

The heart of the project is the **finder**: matching a person's situation — an illness, a
job, grief, a place, a life experience — to saints through controlled-vocabulary facets.

> **Disclaimer.** This dataset is a work in progress and is **not** an authoritative or
> official liturgical resource. It awaits review by competent clergy and sources. Hymns
> and icons are **linked out**, never reproduced, to respect copyright.

## Data flow

```
data/saints.csv ──┐
data/feasts.csv ──┼─► build.py ──► (in-memory SQLite) ──► validate ──► EMIT:
data/vocabulary.csv┘                                       ├─ public/data.json   (Astro build input)
                                                           ├─ public/feasts.json (feasts/fasts + Pascha table)
                                                           ├─ public/saints.sqlite (optional)
                                                           └─ dist/Orthodox_Saints_Database.xlsx
src/ (Astro SSG)   ── imports public/data.json at build ──► _site/ (static HTML per page + per saint)
GitHub Actions     ── python build.py → astro build → deploy _site/ ──► GitHub Pages
```

The CSVs in `data/` are the **source of truth** — text, committed, reviewable in pull
requests. SQLite is a build-time validation/query engine, created fresh each run and
discarded. The **frontend is [Astro](https://astro.build)** in `src/` (static-site
generator; pre-renders one page per route and one per saint). Everything in `public/`,
`dist/`, and `_site/` is **generated and never committed**.

## Build the data locally

Requires **Python 3.11+**.

```bash
pip install -r requirements.txt
make build      # validate + emit public/data.json and the Excel export
make validate   # validate only (exit non-zero on any violation) — a CI gate
make test       # run the build.py unit suite
make xlsx       # emit only the Excel export
make clean      # remove generated output
```

## Run the site locally

Requires **Node 24+** (the data build above produces `public/data.json`, which Astro reads).

```bash
make web-install   # npm ci  (first time only)
make serve         # python build.py --no-xlsx && npm run dev  — the live site
make web-build     # build the static site into _site/
make web-lint      # ESLint + Prettier  (a CI gate)
make web-test      # Playwright smoke tests  (a CI gate)
```

## Build with Docker (no local Python or deps needed)

If you'd rather not install Python and `openpyxl` on your machine, use the containerized
build environment (Python 3.11, matching CI). It mounts the repo, so source edits are live
and generated output (`public/`, `dist/`) lands back on the host — owned by you, not root.

```bash
make docker-validate   # build image, then validate (the CI gate)
make docker-build      # full build: public/data.json + the Excel export
make docker-serve      # build, then serve at http://localhost:8000
make docker-xlsx       # emit only the Excel export
make docker-shell      # open a shell in the build environment
```

Requires Docker with Compose. The image is defined in `Dockerfile`; the mount and port
mapping in `docker-compose.yml`.

## Contribute

1. Edit **`data/saints.csv`** (one row per saint, 26 columns), **`data/feasts.csv`**
   (one row per liturgical feast/fast, 19 columns), or **`data/vocabulary.csv`**.
   To use a new controlled-vocabulary term, **add it to `data/vocabulary.csv` first**.
   Column meanings and editing gotchas (CRLF line endings, the `"; "` separator):
   [`docs/data-model.md`](docs/data-model.md).
2. Leave the **Saint ID / Feast ID** blank on a new row — the build assigns the next
   stable `OS-####` / `FF-####` and writes it back. IDs are permanent and never
   reused or renumbered.
3. Run `make validate` — it must report **CLEAN** (zero violations) before you open a PR
   (and `make test` if you changed `build.py`).
4. Open a pull request. `main` is branch-protected: CI (unit tests + `build.py --check-only`)
   must pass before merge, and the site deploys automatically when changes land on `main`.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contributor workflow,
[`docs/data-model.md`](docs/data-model.md) for the hand-editing data reference,
[`docs/maintenance.md`](docs/maintenance.md) for maintaining the project (including
entirely without AI tooling), [`docs/infrastructure.md`](docs/infrastructure.md) for what
runs where (hosting, DNS, previews, the corrections Worker, analytics, and credentials),
and [`CLAUDE.md`](CLAUDE.md) for the full operating contract (data model, sourcing
strategy, guardrails, and authoring conventions).

## Licenses

- **Code:** MIT — see [`LICENSE`](LICENSE).
- **Data we authored** — the saints, feasts, hosts, vocabulary, groups, and name-variant
  tables, plus our own profile prose: dedicated to the public domain under Creative
  Commons Zero 1.0 (CC0 1.0). Use it freely, even commercially, with no attribution
  required (a link back is appreciated).
- **Some of `data/` is NOT ours to give away**, and the dedication does not reach it:
  hymn texts held under a revocable permission from the OCA (`data/saint_hymns.csv`), the
  join rows for vendor-permission images, and the daily lectionary, which is harvested
  from the MIT-licensed [orthocal.info](https://orthocal.info) rather than authored here.
  **Read [`LICENSE-data`](LICENSE-data) before reusing anything from `data/`** — it lists
  exactly what is dedicated and what is not, file by file.
- **Permissions** granted to this project (two icon publishers, and the OCA for text) are
  revocable courtesies, not licences, and do not travel to you with a copy of this
  repository. They are recorded in [`docs/permissions/`](docs/permissions/) — see its
  [`README`](docs/permissions/README.md) for how each is enforced and revoked, and
  [`AGREEMENT.md`](docs/permissions/AGREEMENT.md) for the terms we offer a publisher.
- **Something of yours here without permission?** Write to contact@orthodoxsaintfinder.com
  and it comes down — see [Rights & takedown](docs/permissions/README.md#revoking).
