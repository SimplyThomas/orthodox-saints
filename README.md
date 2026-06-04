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
                  ├─► build.py ──► (in-memory SQLite) ──► validate ──► EMIT:
data/vocabulary.csv┘                                       ├─ public/data.json   (for the SPA)
                                                           ├─ public/saints.sqlite (optional)
                                                           └─ dist/Orthodox_Saints_Database.xlsx
web/ (static SPA)  ── fetches ──► public/data.json
GitHub Actions     ── build → deploy public/ + web/ ──► GitHub Pages
```

The CSVs in `data/` are the **source of truth** — text, committed, reviewable in pull
requests. SQLite is a build-time validation/query engine, created fresh each run and
discarded. Everything in `public/` and `dist/` is **generated and never committed**.

## Build locally

Requires **Python 3.11+**.

```bash
pip install -r requirements.txt
make build      # validate + emit public/data.json, the site, and the Excel export
make serve      # build, then serve at http://localhost:8000
```

Other targets:

```bash
make validate   # validate only (exit non-zero on any violation) — the CI gate
make test       # run the build.py unit suite
make xlsx       # emit only the Excel export
make clean      # remove generated output
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

1. Edit **`data/saints.csv`** (one row per saint, 26 columns) or **`data/vocabulary.csv`**.
   To use a new controlled-vocabulary term, **add it to `data/vocabulary.csv` first**.
2. Leave the **Saint ID** blank on a new row — the build assigns the next stable
   `OS-####` and writes it back. IDs are permanent and never reused or renumbered.
3. Run `make validate` — it must report **CLEAN** (zero violations) before you open a PR
   (and `make test` if you changed `build.py`).
4. Open a pull request. `main` is branch-protected: CI (unit tests + `build.py --check-only`)
   must pass before merge, and the site deploys automatically when changes land on `main`.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contributor workflow and
[`CLAUDE.md`](CLAUDE.md) for the full operating contract (data model, sourcing strategy,
guardrails, and authoring conventions).

## Licenses

- **Code:** MIT — see [`LICENSE`](LICENSE).
- **Data** (`data/` and derived artifacts): dedicated to the public domain under
  Creative Commons Zero 1.0 (CC0 1.0) — see [`LICENSE-data`](LICENSE-data). Use it freely,
  even commercially, with no attribution required (a link back is appreciated). The CC0
  dedication covers only data authored here; linked third-party material (hymn
  translations, icon images, vendor photos) is not included.
