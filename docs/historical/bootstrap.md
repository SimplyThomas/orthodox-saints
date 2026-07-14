# bootstrap.md — Stand up the Orthodox Saints Database in Claude Code

**Purpose.** Run this once in a fresh Claude Code session to scaffold the whole project:
the build tool, the static site, the GitHub Actions pipeline, and the seed data. After
this completes and deploys, day-to-day work follows `CLAUDE.md` instead.

**How to use.** Paste into Claude Code: *"Read bootstrap.md and CLAUDE.md, then execute
the steps in bootstrap.md in order. Pause after Step 8 so I can enable GitHub Pages."*

---

## Prerequisites

- A **public** GitHub repository, cloned locally (open-source; public = free Actions + Pages).
- **Python 3.11+** available.
- The **seed data** files placed at:
  - `data/saints.csv` — 372 saints, 26 columns (provided with this bootstrap).
  - `data/vocabulary.csv` — controlled vocabulary in `category,term` long form (provided).
- Decide the licenses up front (defaults in brackets): code license [**MIT**];
  data license [**CC0 1.0** — public domain dedication].
- Sourcing is **decided**: a single synaxarion as the **spine** (walked Jan 1 → Dec 31),
  then merge other jurisdictions by identity (see `CLAUDE.md` §8). Default spine: the OCA
  daily "Lives of the Saints" (oca.org) — confirm or swap per `CLAUDE.md` §8. This affects
  authoring order only, not the build/architecture.

---

## Step 0 — Verify seed data

Confirm `data/saints.csv` has a header row plus 372 rows and exactly these 26 columns
(in order): `Saint ID, Name, Also Known As, Gender, Rank / Type, Church Status,
Family / Life State, Vocation, Life Experience, Virtue, Commonly Asked Intercessions,
Region of Origin, Tradition of Veneration, Era, Century, Feast Day(s),
Short Prayer (Intercession), Hymn / Apolytikion, Icon, Brief Life, Notes,
Customs & Traditions, Works by the Saint, Works About the Saint, Video / Media, Sources`.

Confirm `data/vocabulary.csv` has header `category,term` and ~200 rows. The `category`
values map to the controlled saint columns by name (e.g. `Rank / Type`, `Region of
Origin`, `Era`, `Century`, etc.).

If either file is missing, STOP and ask the user for it.

## Step 1 — Create the directory structure

```
build.py
Makefile
README.md
requirements.txt
.gitignore
LICENSE                # code license (MIT)
LICENSE-data           # data dedication (CC0 1.0)
CLAUDE.md              # already provided — keep at repo root
data/                  # already has saints.csv, vocabulary.csv
web/  index.html  app.js  styles.css
.github/workflows/  ci.yml  deploy.yml
public/  .gitkeep      # build output (git-ignored)
dist/    .gitkeep      # build output (git-ignored)
```

## Step 2 — `requirements.txt`, `.gitignore`, `Makefile`

`requirements.txt`:
```
openpyxl>=3.1
```

`.gitignore` (generated artifacts are never committed):
```
public/*
!public/.gitkeep
dist/*
!dist/.gitkeep
__pycache__/
*.pyc
*.sqlite
.DS_Store
```

`Makefile`:
```make
.PHONY: build validate serve xlsx clean
build:    ; python build.py
validate: ; python build.py --check-only
xlsx:     ; python build.py --xlsx-only
serve:    ; python build.py && cd public && python -m http.server 8000
clean:    ; rm -rf public/* dist/* && touch public/.gitkeep dist/.gitkeep
```

## Step 3 — Implement `build.py` (the heart of the project)

`build.py` must, in order:

1. **Load** `data/vocabulary.csv` into a dict: `{category -> set(terms)}`.
2. **Load** `data/saints.csv` (utf-8) preserving column order.
3. **Assign IDs:** for any row with a blank `Saint ID`, assign the next sequential
   `OS-####` (4-digit zero-pad, max existing + 1). If any IDs were assigned, **write the
   CSV back** so committed source carries stable IDs. IDs are never reused/renumbered.
4. **Build an in-memory SQLite db** (`sqlite3.connect(":memory:")`): a `saints` table
   (one column per CSV field, plus derived `months` and `feast_sort`), and a
   `vocabulary(category, term)` table. This is the validation/query engine and is
   discarded at the end.
5. **Validate** (collect ALL violations, then report; see Step 4). On any violation:
   print a clear report and `sys.exit(1)`.
6. If `--check-only`: exit 0 now (no output files).
7. **Derive per saint:**
   - `months`: list of 3-letter month abbreviations parsed from `Feast Day(s)`.
   - `feast_sort`: `min(monthIndex*100 + day)` across parsed dates (monthIndex 1–12);
     used for calendar ordering. (Mirrors the original site's behavior.)
   - Link fields: if `Hymn / Apolytikion` / `Icon` / `Video / Media` are blank, derive
     Google / Google-Images / YouTube **search** URLs from the Name (URL-encoded). A
     non-blank cell overrides the derived default.
   - Split multi-value fields on `"; "` into arrays for the JSON.
8. **Emit `public/data.json`**: an array of saint objects (schema in Step 5). Keep keys
   short and stable. Include `id` for every saint (powers deep links `?s=OS-0192`).
9. **Emit a search index** for the SPA: either ship a prebuilt MiniSearch index JSON, or
   include in `data.json` a `search` haystack string per saint (name + aka + brief +
   notes + customs + all facet values). Prebuilt index preferred once data is large.
10. **Emit `dist/Orthodox_Saints_Database.xlsx`** via openpyxl: a "Saints Database" sheet
    (all 26 columns), a "Controlled Vocabulary" sheet (from vocabulary.csv), and a "Read
    Me" sheet. This preserves the human-friendly export.
11. (Optional) **Emit `public/saints.sqlite`** as a read-only artifact for power users /
    future in-browser querying. Off by default; enable with a flag.

Flags: `--check-only` (validate only), `--xlsx-only` (skip site emit), `--sqlite`
(also write public/saints.sqlite).

## Step 4 — Validation rules (the merge gate)

`build.py` must FAIL (exit 1) on any of:

- **Unknown vocabulary term:** any value in a controlled column (Gender, Rank / Type,
  Church Status, Family / Life State, Vocation, Life Experience, Virtue, Commonly Asked
  Intercessions, Region of Origin, Tradition of Veneration, Era, Century) that is not in
  `vocabulary.csv` for that category. Report saint ID + column + offending term.
- **Duplicate Saint ID**, or an ID not matching `^OS-\d{4,}$`.
- **Missing required field:** Name, Rank / Type, Gender, Feast Day(s), Short Prayer,
  Sources, and (Era or Century) must be non-empty.
- **Unparseable Feast Day(s):** at least one recognizable `Mon D` token required.
- **Column-count / header mismatch** against the canonical 26-column header.

Warnings (report, but do **not** fail the build):
- Exact duplicate `Name`, or near-duplicate (same normalized name) — possible dup saint.
- Empty `Commonly Asked Intercessions` on a non-stub saint (finder-coverage nudge).

## Step 5 — `public/data.json` schema (per saint)

```json
{
  "id": "OS-0192",
  "name": "Martyr Hermione of Ephesus",
  "aka": ["Hermione, daughter of Philip the Deacon"],
  "gender": "Female",
  "rank": ["Martyr"],
  "church": ["Layperson"],
  "family": ["Single Adult"],
  "vocation": ["Physician"],
  "experience": ["Persecution"],
  "virtue": ["Faith","Courage","Charity"],
  "intercession": ["Healing"],
  "origin": ["Asia Minor"],
  "tradition": ["Pan-Orthodox"],
  "era": "Pre-Nicene",
  "century": "2nd",
  "feast": "Sep 4",
  "months": ["Sep"],
  "feastSort": 904,
  "prayer": "Holy Martyr Hermione, pray to God for us.",
  "brief": "…",
  "notes": "",
  "customs": "",
  "works": [], "about": [], "sources": "Synaxarion",
  "hymn": "https://www.google.com/search?q=…",
  "icon": "https://www.google.com/search?tbm=isch&q=…",
  "video": "https://www.youtube.com/results?search_query=…"
}
```

## Step 6 — The SPA (`web/`)

Static, no backend, no browser-storage APIs. It must:

- On load, `fetch('data.json')` (relative path; the build colocates it). Show a loading state.
- Provide **search** (free text over the haystack/index) and **faceted filters** for at
  least: Commonly Asked Intercessions, Life Experience, Rank/Type, Region of Origin,
  Tradition, Era/Century, Gender. Facets are the product's whole point — make them
  prominent. Combine facets with AND across categories, OR within a category.
- **Results list** → click a saint → **detail view** with a stable URL (`?s=OS-0192` or
  `#/saint/OS-0192`) so saints are shareable/bookmarkable. Detail shows Brief Life, all
  populated facets, Feast Day(s), the composed Short Prayer, Customs (only if present),
  Works, Sources, and **link-out buttons** for Hymn / Icon / Video.
- Masthead: heading reads **"Cloud of Witnesses"** (the app's display name) alongside a
  simple gold cross ornament (☦); the HTML `<title>` is also "Cloud of Witnesses", and the
  descriptive subtitle is the masthead tagline + `<meta name="description">`. No
  external/unlicensed imagery.
- Search index: use MiniSearch or FlexSearch (loaded from a CDN or vendored). Naive
  filtering is fine now; switch to a prebuilt index when the dataset grows large.
- Keep CSS in `styles.css`; keep it clean, readable, mobile-friendly.

## Step 7 — GitHub Actions

`.github/workflows/ci.yml` (PR gate — build + validate, no deploy):
```yaml
name: CI
on:
  pull_request:
  push:
    branches-ignore: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r requirements.txt
      - run: python build.py --check-only
```

`.github/workflows/deploy.yml` (build + deploy to Pages on main):
```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r requirements.txt
      - run: python build.py            # validates; fails the deploy if data is bad
      - name: Assemble site
        run: |
          mkdir -p _site
          cp -r web/* _site/
          cp public/data.json _site/
          # copy any prebuilt index / optional sqlite if present
          [ -f public/search-index.json ] && cp public/search-index.json _site/ || true
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: _site }
      - id: deploy
        uses: actions/deploy-pages@v4
```

(If you prefer the Excel export downloadable from the site, also `cp dist/*.xlsx _site/`.)

## Step 8 — Supporting files

- `README.md`: what the project is, the data-flow diagram, how to build locally
  (`pip install -r requirements.txt && make build && make serve`), how to contribute
  (edit `data/saints.csv`, run `make validate`, open a PR), the licenses, and a clear
  **disclaimer** that the data awaits clergy/source review and is not an official
  liturgical resource.
- `LICENSE` (MIT) for code; `LICENSE-data` (CC0 1.0) for `data/`.

**PAUSE HERE** and tell the user to enable Pages: GitHub repo → Settings → Pages →
Build and deployment → Source = **GitHub Actions**.

## Step 9 — Local verification (before first push)

- `pip install -r requirements.txt`
- `make validate` → must report CLEAN, exit 0.
- `make build` → `public/data.json` exists with **372** records; `dist/*.xlsx` exists.
- `make serve` → open `localhost:8000`, confirm search + a facet filter + a saint detail
  page + the hymn/icon link-outs all work.

## Step 10 — First commit & deploy

- `git add` everything **except** generated `public/`/`dist/` (gitignore handles this).
- Commit: `chore: bootstrap project (build pipeline, SPA, CI/CD, 372-saint seed)`.
- Push to `main`. Confirm the **Deploy** workflow is green and the Pages URL serves the
  site with all 372 saints.

---

## Acceptance checklist (bootstrap is done when all true)

- [ ] `make validate` is CLEAN on the 372-saint seed.
- [ ] `make build` emits `public/data.json` (372 records) and `dist/*.xlsx`.
- [ ] Generated dirs are git-ignored; only source + code + workflows are committed.
- [ ] `ci.yml` runs `--check-only` on PRs; `deploy.yml` builds + deploys on `main`.
- [ ] GitHub Pages is set to "GitHub Actions" and the live site loads, searches, filters,
      and deep-links to a saint by ID.
- [ ] New-saint flow verified: append a row with a blank Saint ID → `make build` assigns
      the next `OS-####` and writes it back to `data/saints.csv`.
- [ ] `CLAUDE.md` is at the repo root for all future sessions.

Once every box is checked, switch to the day-to-day workflow in **CLAUDE.md** (§12).
