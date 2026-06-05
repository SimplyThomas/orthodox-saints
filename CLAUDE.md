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
│   ├── vendors.csv            ← icon-vendor link templates (vendor,url_template; {q}=name)
│   └── name_variants.csv      ← given-name equivalence groups (group,names) for search
├── build.py                   ← the build tool (CSV → SQLite → validate → artifacts)
├── package.json               ← Astro frontend deps + scripts (Node 24+)
├── astro.config.mjs           ← Astro config (site, base:/orthodox-saints, outDir:_site)
├── src/                       ← THE FRONTEND (Astro static-site generator)
│   ├── pages/                 ← routes: index, saint/[id], quiz, america, 404 (file-based)
│   ├── layouts/BaseLayout.astro
│   ├── components/            ← .astro components (header/footer/hero/finder/detail/icons…)
│   ├── islands/               ← the ONLY hydrated JS (finder, quiz, detail-modal, cloud-band)
│   ├── lib/                   ← shared TS logic extracted from the old app.js (data/filter/quiz/…)
│   ├── styles/global.css      ← global styles (was web/styles.css)
│   └── assets/logo.png
├── e2e/                       ← Playwright smoke tests (base-path, modal, quiz, saint page)
├── static/                    ← Astro publicDir (kept off public/, which is Python-owned)
├── public/                    ← build.py OUTPUT, git-ignored (data.json — Astro imports it at build)
├── dist/                      ← build.py OUTPUT, git-ignored (Orthodox_Saints_Database.xlsx)
├── _site/                     ← Astro OUTPUT, git-ignored (the deployed static site)
└── .github/workflows/
    ├── ci.yml                 ← PR gate: python (tests+validate) AND frontend (lint+build+e2e)
    └── deploy.yml             ← on push to main: python build → astro build → deploy to Pages
```

**Source of truth is text** (`data/*.csv`), committed and reviewable in pull requests.
Everything in `public/` and `dist/` is generated and **must not be committed**.

---

## 3. Architecture / data flow

```
data/saints.csv ──┐
                  ├─► build.py ──► (in-memory SQLite) ──► validate ──► EMIT:
data/vocabulary.csv┘                                       ├─ public/data.json   (Astro build input)
                                                           ├─ public/saints.sqlite (optional artifact)
                                                           └─ dist/Orthodox_Saints_Database.xlsx
src/ (Astro SSG)   ── imports public/data.json at BUILD TIME ──► _site/ (static HTML per page + per saint)
GitHub Actions     ── python build.py → astro build → deploy _site/ ──► GitHub Pages
```

- **SQLite is a build-time tool only.** It is created fresh from the CSV on every run,
  used for validation and querying, then discarded (or published as a read-only
  artifact). It is **never** the source of truth and is **never** committed.
- **Astro consumes `public/data.json` at build time** (a static `import`, not a runtime
  fetch) and pre-renders one HTML page per route **and one per saint** (`/saint/OS-####`).
  The home/quiz pages inline a trimmed finder index for their client islands; per-saint
  pages ship only their own record. `python build.py` MUST run before `astro build`.
- The build **fails loudly** on any validation error. A failing build must never deploy.

---

## 4. Commands

Use the Makefile targets (or the underlying python directly):

- `make build`   → `python build.py` : validate + emit all data artifacts into `public/` and `dist/`.
- `make validate`→ `python build.py --check-only` : validate only, exit non-zero on any violation. (Used by CI on PRs.)
- `make test`    → `python -m unittest discover -s tests` : run the build.py unit suite. (Also runs in CI.)
- `make xlsx`    → emit only the Excel export.
- `make find NAME="…"` → search-before-add helper (§6): lists existing saints that may be
  the same person under a variant spelling, so you reconcile instead of duplicating.

**Frontend (Astro; needs Node 24+).** Run `make web-install` (`npm ci`) once, then:
- `make serve` / `make web-dev` → `python build.py --no-xlsx && npm run dev` : the live Astro dev server.
- `make web-build` → `python build.py --no-xlsx && npm run build` : the static site into `_site/`.
- `make web-lint` → `npm run lint` : ESLint + Prettier `--check` over `src/` + `e2e/`. (CI gate.)
- `make web-test` → `npm test` : Playwright smoke tests against the built site. (CI gate.)
  These call `npm` directly so they also work on Windows/PowerShell without `make`.

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

### How the existing seed fits (the original 372)
The original 84 representative saints and the comprehensive **Sep 1–10** entries were built
under the *old* merged-Wikipedia method, so those days are partly *ahead* (Phase 2 already
partly done). They are **seed, not waste.** When the Phase 1 spine walk reaches a saint that
is already present, **reconcile** it (confirm details, add any feast dates / traditions, fill
missing facets) rather than re-adding. Saints already present beyond what the spine lists
simply stay.

### Current status & next action
- Data: **2441 saints**. **PHASE 1 (the spine walk) IS COMPLETE — the whole fixed calendar
  Jan 1 → Dec 31, all twelve months, is covered.** Seed (original 84 + the comprehensive
  **Sep 1–10**) plus the full single-recension OCA walk, each week landed in its own PR.
  IDs run to OS-2480 (with OS-1926 retired as a removed duplicate), interleaved throughout with
  feast-date reconciliations to existing rows.
- **Next action: Phase 2 — merge other jurisdictions by identity** (§8): work the Greek,
  Romanian, Serbian, Georgian, Antiochian, Bulgarian, and Western pre-schism calendars, enriching
  existing rows (add the jurisdiction to *Tradition of Veneration*, add feast dates, fill missing
  facets) and adding only saints proper to a jurisdiction and not yet present. **Alternatively,
  prioritize enrichment** of the finder facets on existing rows (Intercessions ~18%, Vocation
  ~22%) over breadth — that is the most important quality axis (§1, §10).
- **All relic-translation deferrals landed at their principal feasts** during the walk (Job of
  Pochaev & Demetrius of Rostov Oct 28; Herman of Kazan Nov 6; Maximus of Moscow Nov 11;
  Alexander Nevsky & Metrophanes of Voronezh Nov 23; Gurias of Kazan Dec 5; Simeon of Verkhoturye
  & Peter, Metropolitan of Moscow Dec 18 / Dec 21).
- **Phase-2 gaps** (likely missing from the Slavic recension; add when merging the Greek
  calendar): Arsenius of Paros (Jan 31), Joseph Samakos the Sanctified (Jan 22).
- **Conflations flagged for a future cleanup PR** (identity edits kept out of data PRs):
  OS-0136 Anthony & Theodosius of the Kiev Caves (joint row → split); OS-0057/OS-0189 duplicate
  Prophet Moses (Sep 4); OS-0065/OS-0120 duplicate Mamas (Sep 2); OS-0317 joint John & George
  of Georgia (Maisuradze/Mkheidze). Possible-same reconciliations to confirm: OS-0540 Dositheus
  of Tbilisi (Jan 25 ↔ Sep 12), OS-0674 Joseph of Dionysiou (Feb 17 ↔ Sep 14), OS-1142 Thais
  of Egypt (May 10 ↔ Oct 8), OS-1596 Melitina (Jul 28 ↔ Oct 29). Likely duplicate to merge:
  OS-0490 / OS-1703 (both "Macarius/Makarios the Roman of Novgorod"). New row OS-2107 (Euthymius
  the New of Thessalonica) may overlap OS-1165.
- **Sourcing for May onward:** the user gathers per-day facts via a ChatGPT prompt (a
  spreadsheet with plain-language columns) and uploads them; Claude cross-checks each batch
  against the OCA synaxarion, dedups/reconciles, maps to controlled vocab, assigns IDs, and
  PRs. (Apr 1–21 were done by Claude's own OCA research fan-out; Apr 22+ via the uploaded sheets.)
- Authoring aids added since the seed: `make find` (search-before-add); `python build.py
  --no-xlsx` (assign IDs + emit `data.json` on host Python, no Docker); a "wrong column?"
  hint on misplaced vocab terms. The SPA now has a patron-saint quiz (`?quiz=1`) whose match
  quality scales with **Commonly Asked Intercessions** coverage — keep filling that facet.

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
- **Frontend: Astro (static-site generator), Node 24+, in `src/`.** File-based routing in
  `src/pages/`; `.astro` components render at build time; shared logic lives in `src/lib/`
  (TS, extracted from the old `web/app.js`); the only client JS is the **islands** in
  `src/islands/` (vanilla TS — **no React/Vue**). Global styles are `src/styles/global.css`.
  Adding a page = add a file under `src/pages/` (this is how Calendar/Browse/About will land).
- **Search is unchanged in spirit:** a **client-side substring filter** over the precomputed
  `search` haystack per saint, plus controlled-vocab facet filters — no search library, no
  browser storage, no backend. (MiniSearch/FlexSearch remain a future option; don't add one
  without a measured need.) The build still expands each haystack with **name variants** from
  `data/name_variants.csv` (so "Lucy" finds Lucia, "Ivan" finds John; a result names the
  matched variant). The **patron-saint quiz** is now its own route (`/quiz`); it scores saints
  by facet overlap (intercessions weigh most) — match quality scales with facet coverage (§10).
- **Per-saint pages + the data ceiling.** Astro pre-renders `/saint/OS-####` per saint (real,
  indexable, shareable; each ships only its own record). The finder home/quiz pages still inline
  the (trimmed) dataset for client filtering — comfortable to **~5,000 enriched saints** per the
  old estimate. Past that, split the inlined home index to on-demand fetch (per-saint pages are
  already lean — half the work is done). See the `TODO(scale)` in `src/pages/index.astro`.
- **Hosting:** GitHub Pages project site at `/orthodox-saints/` (base path). Astro `base` makes
  links/assets base-correct; **always build internal URLs via `withBase()` in `src/lib/format.ts`**
  — Astro does NOT auto-prefix hand-written `href`/`src`. **CI/CD:** GitHub Actions (free).
- The deploy workflow runs `python build.py` → `astro build` → publishes `_site/`. The PR
  workflow (`ci.yml`) has two required gates: **`validate`** (python unit tests + `--check-only`)
  and **`frontend`** (`npm run lint` + `astro build` + Playwright e2e in `e2e/`). A CodeQL
  workflow scans the code; Dependabot keeps Actions / pip / Docker / **npm** current
  (patch+minor auto-merge). GitHub Actions are pinned to commit SHAs.

---

## 12. Working agreement (definition of done for a session)

`main` is **branch-protected**: direct pushes are rejected. All changes — data, code,
docs, even Dependabot's — land via a **pull request** that the CI checks must pass before
merge: **`validate`** (python unit tests + data validation) and, when you touch the
frontend, **`frontend`** (lint + `astro build` + Playwright e2e). Merges are **squash**
(linear history).

1. Edits go to `data/saints.csv` / `data/vocabulary.csv` (source of truth) — never to
   generated files.
2. **To add a vocabulary term:** add it to `data/vocabulary.csv` FIRST, then use it.
3. Run `make validate` (or `make docker-validate`) — it must be **CLEAN** (zero violations).
   Run `make test` if you touched `build.py`.
4. Run `make build` and sanity-check `public/data.json` (record count, no errors). The
   build prints a **finder-coverage** report; CI posts it to the PR's job summary.
5. New saints: confirm blank IDs were assigned and written back to the CSV.
   **If you touched the frontend (`src/`):** run `make web-lint` and `make web-test` — both
   must be green (they are required CI gates).
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
