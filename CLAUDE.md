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
│   ├── name_variants.csv      ← given-name equivalence groups (group,names) for search
│   ├── saint_images.csv       ← self-hosted portrait join (saint_id,image_path,license,credit,source)
│   ├── saint_quotes.csv       ← verified PD-quote join (saint_id,quote,work,locus,translation,source_url)
│   ├── groups.csv             ← group taxonomy: definitions (slug,name,type,description,feast,sort)
│   └── saint_groups.csv       ← group membership join (group_slug,saint_id,role,order)
├── build.py                   ← the build tool (CSV → SQLite → validate → artifacts)
├── package.json               ← Astro frontend deps + scripts (Node 24+)
├── astro.config.mjs           ← Astro config (site: orthodoxsaintfinder.com, outDir:_site)
├── src/                       ← THE FRONTEND (Astro static-site generator)
│   ├── pages/                 ← routes: index, search, saint/[id], quiz, america, calendar,
│   │                            news (placeholder), witness/[slug], about,
│   │                            contribute, corrections, 404 (file-based)
│   ├── layouts/BaseLayout.astro
│   ├── components/            ← .astro components (header/footer/hero/finder/detail/icons…)
│   ├── islands/               ← the ONLY hydrated JS (finder, quiz, detail-modal, cloud-band)
│   ├── lib/                   ← shared TS logic extracted from the old app.js (data/filter/quiz/…)
│   ├── content/profiles/      ← per-saint YAML rich profiles (OS-####.yaml) — a data Content Collection
│   ├── content.config.ts      ← the `profiles` collection + its Zod schema (validated at build)
│   ├── styles/global.css      ← global styles (was web/styles.css)
│   └── assets/logo.svg, logo-ivory.svg  ← wordmark (dark) + ivory recolor (masthead)
├── e2e/                       ← Playwright smoke tests (base-path, modal, quiz, saint page)
├── scripts/                   ← authoring aids: Wikimedia icon downloader + contact sheet
│                                (see scripts/ICON_DOWNLOAD_README.md), OG-card generator
├── tools/find_saint.py        ← the `make find` search-before-add helper
├── static/                    ← Astro publicDir (kept off public/, which is Python-owned)
│   ├── icons/                 ← self-hosted saint portraits (referenced by data/saint_images.csv)
│   ├── og-default.png         ← default OpenGraph share card (regen: scripts/make_og_image.mjs)
│   └── robots.txt             ← points crawlers at /sitemap-index.xml
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
- `make report` (`make report TOP=100`) → `python build.py --report` : ranks saints that
  **lack a real icon** by a data-derived priority score, so each icon batch (§5 "Saint
  portraits") is self-directing — run it and paste the top N into the batch prompt instead
  of hand-picking. Local authoring aid only; writes no files and is not a CI gate.

**Frontend (Astro; needs Node 24+).** Run `make web-install` (`npm ci`) once, then:
- `make serve` / `make web-dev` → `python build.py --no-xlsx && npm run dev` : the live Astro dev server.
- `make web-build` → `python build.py --no-xlsx && npm run build` : the static site into `_site/`.
- `make web-lint` → `npm run lint` : ESLint + Prettier `--check` over `src/` + `e2e/`. (CI gate.)
- `make web-unit` → `npm run test:unit` : Vitest unit tests over `src/lib` pure logic. (CI gate.)
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

**Environment variables / `.env`.** Optional developer secrets are stored in a `.env` file
at the repo root (git-ignored — see `.env.example` for the template). Currently only the
Wikimedia bot credentials live there:

| Variable | Purpose |
|---|---|
| `WIKIMEDIA_BOT_USER` | MediaWiki bot username: `WikimediaAccount@BotName` (e.g. `SimplyThomas@Cloud_of_Witnesses`) |
| `WIKIMEDIA_BOT_PASSWORD` | Bot password generated at `Special:BotPasswords` on the relevant wiki |

Icon-download scripts load these with:
```python
from dotenv import load_dotenv; load_dotenv()
import os
bot_user = os.getenv("WIKIMEDIA_BOT_USER")
bot_pass = os.getenv("WIKIMEDIA_BOT_PASSWORD")
```
(`pip install python-dotenv` if not present — authoring-only dep, not in `requirements.txt`.)
Authenticated bots receive higher API rate limits. The two-step MediaWiki login flow:
```python
import requests
S = requests.Session()
# Step 1 — get login token
R = S.get("https://commons.wikimedia.org/w/api.php",
          params={"action":"query","meta":"tokens","type":"login","format":"json"})
token = R.json()["query"]["tokens"]["logintoken"]
# Step 2 — log in (sets session cookies for all subsequent S.get/S.post calls)
S.post("https://commons.wikimedia.org/w/api.php", data={
    "action": "login", "lgname": bot_user, "lgpassword": bot_pass,
    "lgtoken": token, "format": "json"})
```

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
| 19 | Icon | derived link | A Google-Images *search* link. NOT the displayed portrait — that is the self-hosted `image` from `data/saint_images.csv` (see below). |
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

**Saint portraits (the tiered `SaintAvatar`).** Every saint renders an auto **monogram**
(given-name initial, colour-coded by rank) — zero per-saint work. To show a **real icon**
instead, add one row to `data/saint_images.csv`
(`saint_id,image_path,license,credit,source`):
- `image_path` is **self-hosted** under `static/icons/` (e.g. `icons/nicholas.jpg`); the
  file must exist (the build checks) and deploys with the site. (An absolute `https://` URL
  also works but self-hosting is preferred — no broken hotlinks.)
- `license` MUST be an accepted **open** license — `PD` / `PD-art` / `PD-old` / `CC0` /
  `CC-BY*` / `CC-BY-SA*`. Anything else **fails the build** (§9). `CC-BY*` additionally
  **requires** a `credit`; the detail page shows an attribution caption linking `source`.
- The `image` then surfaces in cards, the finder, the quiz, and the saint detail page;
  no other field changes. Source images need clergy/licence review before launch (§9).
- **After downloading any new icon(s), resize at JPEG quality 80** to keep file sizes
  web-friendly. The canonical approach: **scale width to ≤ 800 px, then top-crop height to
  ≤ 800 px** — this preserves the face/head region rather than cropping symmetrically.
  Python (Pillow ≥ 12):
  ```python
  from PIL import Image
  from pathlib import Path
  MAX = 800
  for p in sorted(Path("static/icons").glob("*.jpg")):
      with Image.open(p) as img:
          if img.mode in ('RGBA','P','LA'): img = img.convert('RGB')
          w, h = img.size
          if w > MAX:                        # scale width down to MAX (never upscale)
              img = img.resize((MAX, round(h * MAX / w)), Image.LANCZOS)
          if img.height > MAX:               # top-crop: keep face, drop bottom
              img = img.crop((0, 0, img.width, MAX))
          img.save(p, 'JPEG', quality=80, optimize=True)
      print(f"{p.name}: {w}x{h} -> {Image.open(p).size}")
  ```
  (`.gif` files: glob `*.jpg` skips them. Convert to `.jpg` manually and update
  `saint_images.csv` if you need a gif resized.)

**Saint quotes (the detail-page quote block).** To show a saint's own words on their
detail page, add one row to `data/saint_quotes.csv`
(`saint_id,quote,work,locus,translation,source_url`):
- **One quote per saint.** The `quote` is transcribed **verbatim** from a translation; the
  saint's own words are public-domain, but a *modern translation* usually is **not** (§9).
- `translation` MUST name an accepted **public-domain** source — the Ante-/Nicene-and-Post-
  Nicene-Fathers series (`ANF` / `NPNF` / `NPNF1` / `NPNF2`), an explicit `(PD)` / `PD-old`,
  or `CC0`. A modern in-copyright edition (Philokalia, SVS Press, …) has no such marker and
  **fails the build** — link out instead, never reproduce it.
- `source_url` (required) must let a reviewer verify the wording against its PD source;
  `work` and `locus` (e.g. `§54.3`) are the citation shown on the page. Saints without a
  row simply render no quote block. The build joins the quote into the record as `quote`
  (+ `quoteWork`/`quoteLocus`/`quoteTranslation`/`quoteSource`).

**Group taxonomy (collective commemorations).** Two join files (same pattern as the image/
quote joins) re-link the members of a collective commemoration and make group membership a
**first-class, filterable dimension** of the finder:
- `data/groups.csv` (`slug,name,type,description,feast,sort`) — one row per group. `slug` is a
  permanent kebab-case key (the `/group/<slug>` URL + join key). `type` is an enumerated set —
  **`synaxis`** (a collective assembly: the Twelve, the Seventy, a Synaxis of New Martyrs),
  **`feast-companions`** (distinct individually-venerated saints sharing a principal feast:
  Peter & Paul, the Three Hierarchs — the §7 split boundary), or **`household`** (a family /
  kinship unit). `feast` (optional) is a shared feast day; `sort` orders groups.
- `data/saint_groups.csv` (`group_slug,saint_id,role,order`) — the membership join. `saint_id`
  may reference an **individual OR a still-collective** row, so the taxonomy ships independently
  of the split backlog. `role`/`order` are optional.
- The build **fails loud** on a bad `type`, a dangling `group_slug`/`saint_id`, a duplicate slug,
  or a duplicate membership. Each saint gains `groups` (+ `groupNames` for the facet) in the
  record; the whole catalog is emitted to `public/groups.json` for the pre-rendered
  `/group/<slug>` pages. Saint pages show a "Commemorated With" link per group; the finder gains
  a **Group** facet.

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
- **Documented-distinct convention:** when two same-name rows are *verified* to be different
  people, record it in each row's Notes with a cross-reference to the other ID (e.g.
  `Distinct from … (OS-0966).`). The build suppresses the duplicate-name warning for pairs
  documented this way, so the warning list stays a true to-investigate queue.

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
- **SPLIT vs GROUP (the finder decides, not the liturgical pairing).** **SPLIT** an entry
  into one row per saint when it bundles **distinct, individually-venerated saints that each
  carry their own facet profile** (Vocation / Commonly Asked Intercessions / Life Experience)
  and would be searched by name — two major saints who merely share a feast (e.g. **Apostles
  Peter & Paul**, Jun 29: Peter the fisherman who denied and repented vs. Paul the convert and
  apostle to the nations) belong in separate rows, because a combined row muddies the
  controlled-vocab facets that power the finder (§1) and violates one-row-per-saint (§6).
  **GROUP** (keep one row) only for **collective or undifferentiated commemorations** —
  numbered cohorts, "the 40 Virgin-Martyrs," a mother and her sons, a Synaxis — where the
  members share an undifferentiated profile. **When you split, put the shared feast on every
  split row and preserve the "commemorated together" linkage**: a Notes cross-reference to the
  other ID(s), plus a `related` entry in each saint's profile (SaintView renders curated
  `related` as cross-links). Do **not** sever the relationship to gain clean facets.
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
- Data: **2,737 saints**; IDs run to **OS-2747**. **PHASE 1 (the spine walk) IS COMPLETE** —
  the whole fixed calendar Jan 1 → Dec 31. **PHASE 2 (merge by identity) is well underway:**
  modern Greek/Athonite glorifications (#136), Romanian (#138), Serbian (#140), Georgian
  (#143), Bulgarian (#145), Antiochian (#146), Western pre-schism (#147), and
  Alexandria/African (#148–149) have all landed, each in its own PR. **The main outstanding
  merge is the full Greek (GOARCH) calendar.**
- **Retired IDs** (removed duplicates; never reused): OS-1926; OS-2291 (→ OS-0052 Porphyrios);
  OS-1815 (→ OS-0172 Joannicius II); OS-1712 (→ OS-0386 Eustathius); OS-1440 (→ OS-0816
  Kirion II); and from the identity-cleanup PR: OS-0189 (→ OS-0057 Prophet Moses); OS-0120
  (→ OS-0065 Mamas); OS-1703 (→ OS-0490 Macarius the Roman); OS-1399 (→ OS-0498
  Inna/Pinna/Rimma); OS-2369 (→ OS-1641 Eleutherius the Cubicularius).
- **The identity-cleanup PR landed — all previously-flagged conflations are resolved:**
  Anthony & Theodosius of the Kyiv Caves split (OS-0136 Anthony + OS-2745 Theodosius);
  Ioane & Giorgi-Ioane of Betania split (OS-0317 + OS-2746 — the OCA spine lists them
  separately); Thais split (OS-1142 May 10 Blessed Taisia + OS-2747 Oct 8 the Penitent);
  Melitine of Marcianopolis (OS-1850) now holds Sep 16 + Oct 29 (Greek usage) while OS-1596
  remains a Jul 28-only OCA stub. Verified correct/distinct, no change needed: Dositheus of
  Tbilisi (OS-0540), Joseph of Dionysiou (OS-0674), the two Eupsychii (OS-0966 / OS-1817),
  the two Euthymii (OS-2021 Thessalonica / OS-1165 Iveron).
- **Next action: continue Phase 2 (the Greek/GOARCH merge) and/or prioritize finder-facet
  enrichment** (Intercessions ~17.5%, Vocation ~21.6%) — enrichment is the most important
  quality axis (§1, §10) and has drifted *down* in percentage as Phase-2 breadth landed.
- **Phase-2 gaps:** Joseph Samakos the Sanctified (Jan 22) is still missing. (Arsenius of
  Paros has landed.)
- **Icon pipeline status:** the Wikimedia Commons downloader (`scripts/`, PR #142) fetched
  **~656 candidate portraits** into `static/icons/` (untracked), with the review queue in
  `dist/image_review.csv` + `dist/icon_contact_sheet.html` — all `needs_review`; nothing
  ships until a human verifies each (right saint, right license) and promotes it into
  `data/saint_images.csv` (§5, §9). **The queue metadata lives in git-ignored `dist/` —
  do not clean it away.** Separately, the user is awaiting permission from icon vendors;
  vendor imagery stays links-only until granted.
- Authoring aids: `make find` (search-before-add); `python build.py --no-xlsx` (assign IDs +
  emit `data.json` on host Python, no Docker); a "wrong column?" hint on misplaced vocab
  terms; feast day-of-month range validation; duplicate-name warnings with the
  documented-distinct suppression (§6). Quiz match quality scales with **Commonly Asked
  Intercessions** coverage — keep filling that facet.

**Profile generation pipeline (`tools/profilegen/`).** A grounded, batched pipeline turns profile-less saints into reviewed-ready draft profiles: **Gather** a cited dossier (seeded from the saint's own CSV row — the trusted anchor — then external sources per the tiered fetch list), **Write** original encyclopedic prose in house voice, **Verify** it adversarially against the anchor row (the row wins on conflict; each verifier claim must `quote` the profile verbatim), and **Emit** a `src/content/profiles/OS-####.yaml` file with `status: draft` (or `flagged` when a real unsupported claim survives) plus additive controlled-vocab facet enrichment and propose-only PD quote/image rows under `dist/`. `emit_one` recomputes the final draft/flagged status deterministically and **demotes phantom flags** — an "unsupported" claim whose `quote` is not actually present in the profile (the verifier paraphrased or invented the flagged text); demoted flags are logged as `demoted_flags` in the verdict JSON, never silently dropped. Per-stage models (Gather=Haiku, Write=Opus, Verify=Sonnet, Emit=Haiku) concentrate capability where fabrication risk is highest. Run `make profile-batch N=15` to print the highest-finder-value uncovered saints, then run the Workflow (`scripts/profilegen.workflow.js`, **requires explicit Workflow opt-in**). Drafts never auto-publish — they land `status: draft` and a human promotes them to `reviewed` (the reviewed-only production gate, §11). Coverage gaps are logged (`make profile-coverage LOG=dist/profilegen_<date>.csv`) so a cluster of `thin`/`none` saints in a region directs the next source to add.

**Run modes.** *Calibration* runs live via the Workflow (`scripts/profilegen.workflow.js`) for the first ~15 saints, watching quality closely. *Bulk* runs unattended via `make profile-run` (or `nohup python -m tools.profilegen.run > dist/profilegen/nohup.out 2>&1 & disown`), which walks the whole prioritized backlog one headless `claude -p` batch at a time and is **resumable** (re-run to continue — prioritization excludes already-profiled saints). Auth setup before an unattended run: `unset ANTHROPIC_API_KEY` (else it bills metered API rates instead of your Max subscription), then `claude setup-token` → `export CLAUDE_CODE_OAUTH_TOKEN=…`. Limit behaviour is honest about what `claude -p` exposes: it has **no reset timestamp** and **cannot tell a 5-hour limit from a weekly cap**, and there is **no usage API for a Max subscription** — so on a `rate_limit_error` the runner **waits a full window** (`RESUME_AFTER`≈5h) and retries, and only **infers the weekly cap** (stops, exit 2) after `WEEKLY_AFTER_WAITS` fruitless waits; **billing/auth errors stop immediately** (exit 3). Feedback surfaces: a `NOTIFY_CMD` hook (e.g. `export NOTIFY_CMD='ntfy publish my-topic'` or `'notify-send'`), `dist/profilegen/state.json` (cat anytime), and exit codes (0 done / 2 likely-weekly / 3 terminal). Billing caveat: headless currently draws the normal Max subscription limits; confirm in Console / `claude /status`.

When fetching: `en.wikipedia.org`, `commons.wikimedia.org` (incl. its API at
`/w/api.php`), and the image CDN `upload.wikimedia.org` are all reachable
(verified 2026-06-05) — so saint-portrait icons can be sourced and downloaded
directly from Wikimedia Commons (see §5 "Saint portraits" and §9). Reachability
can still change between environments; confirm a URL pattern is fetchable before
a long run.

---

## 9. Guardrails (non-negotiable)

- **Copyright.** Never reproduce hymns, troparia, kontakia, or any copyrighted
  translation — **link out** instead (the derived Hymn search URL does this). Images:
  only public-domain or openly-licensed; a source link is **not** permission. When in
  doubt, omit the image and use the simple cross masthead. Saint portraits added via
  `data/saint_images.csv` are enforced at build time — only `PD`/`PD-art`/`PD-old`/`CC0`/
  `CC-BY*`/`CC-BY-SA*` licenses pass, `CC-BY*` must carry a `credit`, and the file must
  exist under `static/`; anything else **fails the build**. The licence gate is necessary
  but not sufficient — each portrait still needs provenance/clergy review before launch.
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
  Adding a page = add a file under `src/pages/`. Browse lives at `/search` (faceted finder);
  About/Contribute/Corrections and the **Calendar** (`/calendar` — every saint pre-rendered
  on each fixed feast date, grouped by month, with a client-side today highlight and a
  movable-cycle section) are live; News remains a "coming soon" placeholder awaiting
  build-out. **Witnesses of Our Time** (`src/lib/witnesses.ts`,
  `/witness/[slug]`, surfaced on `/america`) is a separate **non-canonical memorial section**
  for not-yet-glorified figures — kept strictly out of the saints finder/quiz per §9
  canonization caution; memorial pages use no liturgical address.
- **Rich saint profiles** are one YAML file per saint in `src/content/profiles/OS-####.yaml`,
  an Astro **data Content Collection** defined in `src/content.config.ts`; the **Zod schema
  validates every profile at build time** (a bad/incomplete profile fails the build). Each
  profile carries `status: draft|reviewed|flagged`; production ships only `reviewed` (drafts
  render in dev / `PUBLIC_SHOW_DRAFTS=true`, behind a banner). `SaintView.astro` reads them
  via `loadProfileMap()` (which wraps `getCollection("profiles")`, applying the review gate).
  `build.py` cross-checks every profile filename/id against the saints.
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
  already lean — half the work is done). See the `TODO(scale)` in `src/pages/search.astro`.
- **SEO:** `@astrojs/sitemap` emits `sitemap-index.xml` over every route (incl. all saint
  pages); `static/robots.txt` points crawlers at it. `BaseLayout` emits OpenGraph/Twitter
  meta on every page (default share card `static/og-default.png`; saint pages with a
  self-hosted portrait share the portrait). Saint pages also emit Schema.org `Person`
  JSON-LD. New pages get all of this from `BaseLayout` for free — pass `ogImage`/`ogType`
  only to override.
- **Hosting:** GitHub Pages on the custom domain **`orthodoxsaintfinder.com`** (root base path
  `/`; `orthodoxsaintregistry.com` and `patronsaintfinder.com` 301-redirect to it via Namecheap,
  and the old `simplythomas.github.io/orthodox-saints/` URLs redirect via Pages). **Still build
  every internal URL via `withBase()` in `src/lib/format.ts`** — Astro does NOT auto-prefix
  hand-written `href`/`src`, and routing through `withBase()` keeps any future base change a
  one-line edit. **CI/CD:** GitHub Actions (free).
- The deploy workflow runs `python build.py` → `astro build` → publishes `_site/`. The PR
  workflow (`ci.yml`) has two required gates: **`validate`** (python unit tests + `--check-only`)
  and **`frontend`** (`npm run lint` + `astro build` + Playwright e2e in `e2e/`). A CodeQL
  workflow scans the code; Dependabot keeps Actions / pip / Docker / **npm** current
  (patch+minor auto-merge). GitHub Actions are pinned to commit SHAs.
- **PR preview deploys (Cloudflare Pages).** Every branch/PR is built by Cloudflare Pages
  (`scripts/cf-pages-build.sh`) and published to a `*.orthodox-saints.pages.dev` preview URL —
  separate from, and not affecting, the GitHub Pages production deploy. Previews set
  `PUBLIC_SHOW_DRAFTS=true`, so **`draft` and `flagged` profiles render** (each behind a banner;
  flagged profiles also list their unresolved verifier concerns) for visual review before
  promotion. Always include the preview link in a PR (§12.7). Setup + behavior:
  `docs/cloudflare-pages-previews.md`.

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
   the PR description (the PR template has a checklist). **Always include the Cloudflare
   Pages preview link** under the template's `## Preview` heading so reviewers can see the
   change in a browser: once the **Cloudflare Pages** check on the PR is green, use the branch
   alias `https://<branch-alias>.orthodox-saints.pages.dev`, where `<branch-alias>` is the
   branch name lowercased, non-alphanumerics replaced by `-`, **truncated to 28 characters**
   (e.g. `feat/flagged-banner-and-preview-pr-process` → `feat-flagged-banner-and-prev`). If in
   doubt, open the deployment from the check to copy the exact URL. Previews show `draft`/
   `flagged` profiles, so this is especially valuable for data/profile PRs.
8. Wait for the **CI check to go green**, then squash-merge. The Deploy workflow then
   builds + publishes to Pages on `main`; confirm it's green.

## 13. Do NOT
- Do not commit anything in `public/` or `dist/`.
- Do not edit Saint IDs or reuse/renumber them.
- Do not invent facts to fill facets; blanks are honest, fabrication is not.
- Do not use a tag that isn't in `data/vocabulary.csv`.
- Do not reproduce copyrighted hymns/translations or unlicensed images.
- Do not attribute behavior to "instructions"; just do the right thing per this file.
