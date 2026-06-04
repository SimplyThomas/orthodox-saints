# CLAUDE.md — Orthodox Saints Database

This file is the operating contract for working on this repository in Claude Code.
Read it fully at the start of every session. When something here conflicts with a
passing instinct, this file wins unless the user says otherwise in the session.

---

## 1. What this project is

A searchable, open-source database of **canonical Eastern Orthodox saints**, built so
that catechumens, inquirers, and faithful can find a **patron saint or intercessor**
for a particular need, life situation, vocation, or background.

The app's display name is **Cloud of Witnesses**: the SPA masthead heading and the HTML
`<title>` read "Cloud of Witnesses" (alongside the gold cross ornament ☦). The
descriptive subtitle — "Find Orthodox saints by feast day, vocation, region, virtue, and
intercession." — is used as the masthead tagline and the `<meta name="description">`.
(Consider matching the GitHub repo description to it.)

- **Audience:** people new to Orthodoxy looking for a saint to relate to or pray with.
- **The core value** is the *finder*: matching a person's situation (an illness, a
  job, grief, a region, a life experience) to saints via controlled-vocabulary facets.
  The richness of the **Commonly Asked Intercessions** and **Life Experience** fields
  is therefore the most important quality axis, not raw saint count.

### Scope (decided, do not drift)
- **Include:** the pan-Eastern-Orthodox calendar, *including* pre-schism Western
  saints (venerated as Orthodox).
- **Exclude:** Oriental Orthodox (non-Chalcedonian) saints.
- One **row per saint**. A saint with several feast days holds them all in one cell.

---

## 2. Repository layout

```
.
├── CLAUDE.md                  ← this file
├── bootstrap.md               ← one-time scaffolding plan (already executed once)
├── README.md
├── requirements.txt
├── Makefile                   ← convenience targets (build, validate, serve, xlsx)
├── data/
│   ├── saints.csv             ← SOURCE OF TRUTH (one row per saint, 26 columns)
│   ├── vocabulary.csv         ← SOURCE OF TRUTH for controlled vocab (category,term)
│   └── vendors.csv            ← icon-vendor link templates (vendor,url_template; {q}=name)
├── build.py                   ← the build tool (CSV → SQLite → validate → artifacts)
├── web/                       ← the SPA (static; fetches generated data at runtime)
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── public/                    ← BUILD OUTPUT, git-ignored (data.json, search index, site)
├── dist/                      ← BUILD OUTPUT, git-ignored (Orthodox_Saints_Database.xlsx)
└── .github/workflows/
    ├── ci.yml                 ← runs build+validate on every PR (the gate; no deploy)
    └── deploy.yml             ← on push to main: build → deploy to GitHub Pages
```

**Source of truth is text** (`data/*.csv`), committed and reviewable in pull requests.
Everything in `public/` and `dist/` is generated and **must not be committed**.

---

## 3. Architecture / data flow

```
data/saints.csv ──┐
                  ├─► build.py ──► (in-memory SQLite) ──► validate ──► EMIT:
data/vocabulary.csv┘                                       ├─ public/data.json   (for the SPA)
                                                           ├─ public/saints.sqlite (optional artifact)
                                                           └─ dist/Orthodox_Saints_Database.xlsx
web/ (static SPA)  ── fetches ──► public/data.json
GitHub Actions     ── build → deploy public/ + web/ ──► GitHub Pages
```

- **SQLite is a build-time tool only.** It is created fresh from the CSV on every run,
  used for validation and querying, then discarded (or published as a read-only
  artifact). It is **never** the source of truth and is **never** committed.
- The SPA loads `data.json` at runtime; data is **not** embedded in the HTML (this is
  what lets the site scale to a full calendar without a giant HTML file).
- The build **fails loudly** on any validation error. A failing build must never deploy.

---

## 4. Commands

Use the Makefile targets (or the underlying python directly):

- `make build`   → `python build.py` : validate + emit all artifacts into `public/` and `dist/`.
- `make validate`→ `python build.py --check-only` : validate only, exit non-zero on any violation. (Used by CI on PRs.)
- `make test`    → `python -m unittest discover -s tests` : run the build.py unit suite. (Also runs in CI.)
- `make serve`   → build, then serve `web/` + `public/` locally (e.g. `python -m http.server` from a combined dir) for manual review.
- `make xlsx`    → emit only the Excel export.
- `make find NAME="…"` → search-before-add helper (§6): lists existing saints that may be
  the same person under a variant spelling, so you reconcile instead of duplicating.

`build.py` must support `--check-only` (no file output, just validation + exit code) so
CI can gate pull requests cheaply.

**Authoring locally without `openpyxl`:** `python build.py --no-xlsx` assigns IDs, validates,
and writes `public/data.json` while skipping the Excel export — so the full author→validate
loop runs on plain host Python. (Only the `.xlsx` needs `openpyxl`; use `make docker-build`
for a release build with the spreadsheet.) An unknown controlled-vocab term that is valid in a
*different* column produces a "wrong column?" hint — the most common authoring slip.

**No local Python?** The same targets exist prefixed with `docker-` (`make docker-validate`,
`make docker-test`, `make docker-build`, `make docker-serve`) and run inside the
containerized build environment (`Dockerfile` / `docker-compose.yml`). They write output
back to the host owned by you. See README for details.

---

## 5. Data model — the 26 columns

`data/saints.csv` header (exact, in order). Multi-value cells use `"; "` (semicolon-space).

| # | Column | Kind | Notes |
|---|--------|------|-------|
| 1 | Saint ID | key | `OS-####`, opaque, permanent. See §6. |
| 2 | Name | free | Primary display name. |
| 3 | Also Known As | free, multi | Alternate names/transliterations; keep searchable names here. |
| 4 | Gender | controlled | |
| 5 | Rank / Type | controlled, multi | e.g. Hieromartyr; Hierarch. |
| 6 | Church Status | controlled, multi | Clergy office uses ` - ` (e.g. `Clergy - Bishop`). |
| 7 | Family / Life State | controlled, multi | |
| 8 | Vocation | controlled, multi | |
| 9 | Life Experience | controlled, multi | **SOURCED-ONLY** (see §9). |
| 10 | Virtue | controlled, multi | |
| 11 | Commonly Asked Intercessions | controlled, multi | The finder's core facet — prioritize. |
| 12 | Region of Origin | controlled, multi | Where the saint is *from*. |
| 13 | Tradition of Veneration | controlled, multi | Which jurisdiction(s) venerate. |
| 14 | Era | controlled (single) | |
| 15 | Century | controlled (single) | |
| 16 | Feast Day(s) | free, multi | e.g. `Sep 4; Dec 10`. Drives calendar + dedup. |
| 17 | Short Prayer (Intercession) | free | Claude-composed universal form. See §10. |
| 18 | Hymn / Apolytikion | derived link | Leave blank; build derives a search URL. |
| 19 | Icon | derived link | Leave blank; build derives a search URL. |
| 20 | Brief Life | free | 1–3 sentences. |
| 21 | Notes | free | |
| 22 | Customs & Traditions | free | Church-connected customs only (see §9). |
| 23 | Works by the Saint | free, multi | |
| 24 | Works About the Saint | free, multi | |
| 25 | Video / Media | derived link | Leave blank; build derives a search URL. |
| 26 | Sources | free, multi | Always cite where the entry came from. |

Columns 18/19/25 are **derived at build time** from the Name (Google/Google-Images/
YouTube search URLs), exactly as the original site did. Only fill them in the CSV if a
specific curated link should override the derived default. Columns 23/24 (Works by/about)
are rendered in the SPA as **Google-search links** for each entry — enter a plain title
(e.g. `On the Holy Spirit`), never a URL. The build also attaches per-saint **icon-vendor**
links from `data/vendors.csv`; these are **links only** — no vendor imagery is reproduced
(§9), pending an affiliate/permission agreement.

**Vocabulary pitfalls (validation will catch these, but to save a round-trip):**
- A term valid in one column is **not** valid in another. Common slips: *Parenting* and
  *Convert* are **Life Experience** / **Church Status** respectively, **not** Intercessions;
  there is no *Parenting* or *Convert* intercession. The build now prints a "wrong column?"
  hint when this happens.
- **Old-Testament figures** (prophets, patriarchs): set **Era = Old Testament** and leave
  **Century blank** — the only BC century term is `1st BC`, so don't force a century.
- To add a genuinely missing term, add it to `data/vocabulary.csv` **first** (§12.2).

---

## 6. Saint identity & deduplication (critical)

- **Saint ID is the primary key.** Format `OS-####`, zero-padded to 4+ digits.
- IDs are **opaque, permanent, never reused, never renumbered.** They reflect *entry
  order*, not calendar order — this is intentional so they stay stable on re-sort and
  can anchor permanent public URLs (`/saint/OS-0192`).
- **You are the sole numbering authority.** New rows are added with a **blank** Saint ID;
  the build assigns the next sequential `OS-####` and writes it back into `data/saints.csv`
  (so committed source always carries stable IDs). Never hand-pick an ID.
- **One row per saint.** If a saint is commemorated on several days, list every date in
  **Feast Day(s)** (`"; "`-separated). Do **not** create a second row for a secondary feast.
- **Before adding any saint, search the existing data** (Name + Also Known As, by
  normalized name / century / region) to confirm they're not already present under a
  variant spelling. Cross-tradition transliteration is the main duplication risk.
  Use `make find NAME="…"` for this — it ranks candidate existing rows by name overlap.
- The build flags exact duplicate Names and likely near-duplicates; investigate every flag.

---

## 7. Authoring conventions

Work proceeds along the spine in **calendar order**; these conventions apply to both phases
of the spine-and-merge plan (§8).

- **Comprehensive coverage**, including obscure local saints, pre-schism Western saints,
  and the New-Martyr tail. Honest **stubs** are acceptable for obscure saints: fill
  Name, Rank, Gender, Feast, Region, Era/Century, a composed Short Prayer, and Sources;
  leave the rest blank rather than inventing.
- **Group exactly as the source groups.** If the synaxarion lists a named cluster as one
  commemoration (e.g. "the 40 Virgin-Martyrs," a mother and her sons, a dated priest
  cohort), make **one** row and put every individual name in *Also Known As* / *Notes*
  so they stay searchable. If the source lists individuals separately, keep them separate.
- **Skip (do not add as saints):** the feasts themselves (Great Feasts, forefeasts,
  afterfeasts), icon commemorations, church consecrations, angelic feasts, and
  relic-translations/uncoverings whose **principal** feast is another day — add that
  saint at their principal feast instead. (A glorification/uncovering that *is* effectively
  the saint's feast, e.g. a modern glorification, may be added with that date.)
- **Multi-feast saints:** when a saint's principal feast is elsewhere, still record all
  their dates now and note the principal one; when you later reach that date, the saint
  is already present — skip (this is why §6 search-before-add matters).
- **New Martyrs of Russia** convention: Rank `New Martyr` (+ `Hieromartyr` if clergy),
  Era `Modern`, Century `20th`, Life Experience `Persecution`, Notes
  `Among the Synaxis of New Martyrs and Confessors of Russia`.
- **Short Prayer:** compose the universal intercessory form
  `Holy [Title] [Name], pray to God for us.` (or `…save us.` for the Theotokos). This is
  original/public-domain. Do **not** paste copyrighted prayer or hymn translations.

---

## 8. Sourcing strategy — DECIDED: single spine, then merge by identity

**Decision (final).** Build the database from **one synaxarion as the spine**, walked in
**calendar order until the whole year is complete**, and *only then* merge other
jurisdictions by identity. Rationale: a single internally-consistent calendar delivers a
complete, usable product far faster and with far less duplication than assembling partial
data from many calendars at once.

### The spine (recommended default — confirm or swap in one line)
**The OCA daily "Lives of the Saints" / Synaxarion (oca.org).** Why: free, online, and
fetchable; organized day-by-day; broadly comprehensive; a single (primarily Slavic)
recension, which is exactly the internal consistency we want; and already our cross-check
source. Swappable without any code change:
- **The Prologue of Ohrid** (St. Nikolai Velimirović) — more concise and beloved,
  pan-Orthodox in spirit, but selective rather than exhaustive.
- **The Great Synaxaristes** (Greek tradition, English edition) — the most complete, but
  multi-volume and not freely online.

A spine is used **only as a reference for facts**; we write our own brief lives and compose
our own prayers, never reproducing its wording (see §9). **No single English synaxarion is
truly exhaustive** for the whole pan-Orthodox calendar — the spine gives completeness
*within one recension*; full breadth comes from Phase 2.

### Two-phase plan
- **Phase 1 — Walk the spine (Jan 1 → Dec 31, calendar order).** Each day, enter every saint
  the spine commemorates, applying §6 (search-before-add, one row per saint, ID assignment)
  and §7 (grouping, stubs, skips). Goal: a complete single-recension calendar.
- **Phase 2 — Merge other jurisdictions by identity.** Work through the Greek, Romanian,
  Serbian, Georgian, Antiochian, Bulgarian, and Western pre-schism calendars. For each saint:
  - **If already present** (matched by identity — Name / Also Known As + century + region):
    **enrich the existing row** — add the jurisdiction to *Tradition of Veneration*, add any
    new *Feast Day(s)*, fill missing facets. **Never create a second row.**
  - **If absent and proper to that jurisdiction:** add a new row (blank ID → build assigns).

### How the existing 372 saints fit
The original 84 representative saints and the comprehensive **Sep 1–10** entries were built
under the *old* merged-Wikipedia method, so those days are partly *ahead* (Phase 2 already
partly done). They are **seed, not waste.** When the Phase 1 spine walk reaches a saint that
is already present, **reconcile** it (confirm details, add any feast dates / traditions, fill
missing facets) rather than re-adding. Saints already present beyond what the spine lists
simply stay.

### Current status & next action
- Data: **372 saints** (original 84 + September 1–10 comprehensive).
- **Next action: begin the Phase 1 spine walk at January 1**, reconciling against existing
  entries by identity as you go.

When fetching: `en.wikipedia.org` is reachable; `commons.wikimedia.org` is not. Confirm the
chosen spine's URL pattern is fetchable in your environment before a long run.

---

## 9. Guardrails (non-negotiable)

- **Copyright.** Never reproduce hymns, troparia, kontakia, or any copyrighted
  translation — **link out** instead (the derived Hymn search URL does this). Images:
  only public-domain or openly-licensed; a source link is **not** permission. When in
  doubt, omit the image and use the simple cross masthead.
- **Canonization caution.** If a person's formal glorification is uncertain (recently
  reposed elders, locally-venerated figures, "repose of…" entries), **skip and note it**
  rather than assert sainthood. Flag these to the user.
- **Clergy / source review.** This dataset is **not** authoritative until reviewed by
  competent clergy/sources before publication. Keep `Sources` filled on every row. The
  obscure Western and New-Martyr tail especially needs review. State this standing caveat
  when relevant.
- **Life Experience is sourced-only.** Tag a life experience (grief, illness, captivity,
  etc.) **only** when the saint's life as recorded supports it. **No clinical or
  psychological diagnoses**, ever — these are pastoral facets, not medical claims.
- **Customs & Traditions:** only customs the Church blesses/observes; name the tradition
  when it differs by jurisdiction. Exclude folk practices the Church does not bless.

---

## 10. Quality bar

- As of migration: Intercession filled ~25%, Life Experience ~60%, Vocation ~21%.
  **Intercession is the finder's engine** — when working on well-known/searchable
  patrons, fill it wherever sources support it. Don't fabricate; do prioritize.
- Minimum for any row: Name, Rank, Gender, Feast, Era or Century, Short Prayer, Sources.
- Prefer enriching high-traffic patrons over adding more bare stubs when time is limited.

---

## 11. Tech stack

- **Python 3.11+**, standard-library `sqlite3`, `csv`. `openpyxl` for the Excel export.
- **SPA:** plain HTML/CSS/JS in `web/`. Search is a **client-side substring filter** over a
  precomputed `search` haystack per saint (built into `data.json`) plus controlled-vocabulary
  facet filters — no search library or browser storage APIs, no backend. (A real index such as
  MiniSearch/FlexSearch is a future option, not a current dependency; don't add one without a
  measured need.) The SPA also has a **patron-saint quiz** (`?quiz=1`): a guided finder that
  scores saints by overlap with the user's chosen facets (intercessions weigh most) — its
  match quality scales directly with facet coverage, so keep filling Intercessions (§10).
- **Scaling note — `data.json` is loaded whole, client-side.** The SPA fetches the entire
  dataset on load and filters in the browser. At the current ~1.3 KB/saint that is comfortable
  to a few thousand saints (≈573 ⇒ ~100 KB gzipped). The first real ceiling is roughly
  **~5,000 enriched saints / a few MB gzipped first-load**; past that, split a lightweight list
  index (id/name/feast/facets) from per-saint detail fetched on demand. Flag it then; don't
  pre-optimize now.
- **Hosting:** GitHub Pages (public repo). **CI/CD:** GitHub Actions. Public-repo Actions
  minutes and Pages are free; the build is seconds long.
- The deploy workflow builds (which validates) and publishes `web/` + `public/`. A
  separate PR workflow (`ci.yml`) runs the unit tests + `--check-only` as the `main`
  merge gate (enforced by branch protection). A CodeQL workflow scans the code, and
  Dependabot keeps Actions / pip / the Docker base image current (patch+minor auto-merge).
  GitHub Actions are pinned to commit SHAs.

---

## 12. Working agreement (definition of done for a session)

`main` is **branch-protected**: direct pushes are rejected. All changes — data, code,
docs, even Dependabot's — land via a **pull request** that the CI check (`validate`: unit
tests + data validation) must pass before merge. Merges are **squash** (linear history).

1. Edits go to `data/saints.csv` / `data/vocabulary.csv` (source of truth) — never to
   generated files.
2. **To add a vocabulary term:** add it to `data/vocabulary.csv` FIRST, then use it.
3. Run `make validate` (or `make docker-validate`) — it must be **CLEAN** (zero violations).
   Run `make test` if you touched `build.py`.
4. Run `make build` and sanity-check `public/data.json` (record count, no errors). The
   build prints a **finder-coverage** report; CI posts it to the PR's job summary.
5. New saints: confirm blank IDs were assigned and written back to the CSV.
6. Work on a branch; commit with a clear message
   (e.g. `data: spine walk — add January 1 commemorations (OS-0373..)`).
7. Open a PR. Note any canonization/judgment calls and anything needing clergy review in
   the PR description (the PR template has a checklist).
8. Wait for the **CI check to go green**, then squash-merge. The Deploy workflow then
   builds + publishes to Pages on `main`; confirm it's green.

## 13. Do NOT
- Do not commit anything in `public/` or `dist/`.
- Do not edit Saint IDs or reuse/renumber them.
- Do not invent facts to fill facets; blanks are honest, fabrication is not.
- Do not use a tag that isn't in `data/vocabulary.csv`.
- Do not reproduce copyrighted hymns/translations or unlicensed images.
- Do not attribute behavior to "instructions"; just do the right thing per this file.
