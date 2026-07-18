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
- **The core value is multi-path discovery** of saints, not one need-matching query.
  People come to: (1) **read and learn about** the saints; (2) **find a saint they share
  a name with**; (3) **find a patron whose story, life, vocation, or background they
  relate to**; and (4) **match a need/affliction** to an intercessor. The rich per-saint
  **profiles** drive (1) and (3); **Name / Also Known As / name-variants** drive (2); a
  *spread* of facets (Life Experience, Vocation, Region, Era, Virtue, Commonly Asked
  Intercessions) drives (3)–(4). No single facet is "the" axis; depth across profiles and
  facets beats raw saint count — and **Intercessions is the narrowest path, so don't
  over-index on it** (see §10).

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
├── README.md
├── requirements.txt
├── Makefile                   ← convenience targets (build, validate, serve, xlsx)
├── data/
│   ├── saints.csv             ← SOURCE OF TRUTH (one row per saint, 26 columns)
│   ├── vocabulary.csv         ← SOURCE OF TRUTH for controlled vocab (category,term)
│   ├── vendors.csv            ← icon-vendor link templates (vendor,url_template; {q}=name)
│   ├── name_variants.csv      ← given-name equivalence groups (group,names) for search
│   ├── saint_images.csv       ← self-hosted hero-portrait join (saint_id,image_path,license,credit,source)
│   ├── image_permissions.csv  ← vendor-permission registry (vendor_slug,vendor_name,attribution,homepage,granted,status,terms)
│   ├── saint_depictions.csv   ← icon-carousel join, MANY per saint (saint_id,image_path,license,credit,source,kind,tag,title,era,by)
│   ├── saint_quotes.csv       ← verified PD-quote join (saint_id,quote,work,locus,translation,source_url)
│   ├── groups.csv             ← group taxonomy: definitions (slug,name,type,description,feast,sort)
│   ├── saint_groups.csv       ← group membership join (group_slug,saint_id,role,order)
│   └── feasts.csv             ← SOURCE OF TRUTH for the Feasts & Fasts DB (one row per feast/fast, FF-####, 19 columns — §5a)
├── build.py                   ← the build tool (CSV → SQLite → validate → artifacts)
├── feastlib.py                ← the Feasts & Fasts pipeline (load/assign FF ids/validate/emit), orchestrated by build.py
├── pascha.py                  ← Orthodox Pascha computus (Meeus Julian algorithm, 1900–2099)
├── package.json               ← Astro frontend deps + scripts (Node 24+)
├── astro.config.mjs           ← Astro config (site: orthodoxsaintfinder.com, outDir:_site)
├── src/                       ← THE FRONTEND (Astro static-site generator)
│   ├── pages/                 ← routes: index, search, saint/[id], feast/[id], quiz, america,
│   │                            calendar, feasts, calendar/[style].ics (iCal feeds),
│   │                            news (placeholder, unlinked from nav — #348),
│   │                            witness/[slug], about, contribute, corrections, 404 (file-based)
│   ├── layouts/BaseLayout.astro
│   ├── components/            ← .astro components (header/footer/hero/finder/detail/icons…)
│   ├── islands/               ← the ONLY hydrated JS (finder, quiz, detail-modal, cloud-band)
│   ├── lib/                   ← shared TS logic extracted from the old app.js (data/filter/quiz/…)
│   ├── content/profiles/      ← per-saint YAML rich profiles (OS-####.yaml) — a data Content Collection
│   ├── content/feasts/        ← per-feast YAML rich profiles (FF-####.yaml) — the `feasts` collection (§5a)
│   ├── content.config.ts      ← the `profiles` + `feasts` collections + their Zod schemas (validated at build)
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
├── workers/report/            ← Cloudflare Worker backend for the /corrections form:
│                                Turnstile-verified → files a `data-quality` GitHub issue via a
│                                GitHub App. Own toolchain + README; NOT part of the Astro build.
└── .github/workflows/
    ├── ci.yml                 ← PR gate: python (tests+validate), frontend (lint+build+e2e),
    │                            AND worker (workers/report smoke tests)
    └── deploy.yml             ← on push to main: python build → astro build → deploy to Pages
```

**Source of truth is text** (`data/*.csv`), committed and reviewable in pull requests.
Everything in `public/` and `dist/` is generated and **must not be committed**.

---

## 3. Architecture / data flow

```
data/saints.csv ──┐
data/feasts.csv ──┼─► build.py (+feastlib) ─► (in-memory SQLite) ─► validate ─► EMIT:
data/vocabulary.csv┘                                       ├─ public/data.json   (Astro build input)
                                                           ├─ public/feasts.json (feasts + Pascha table 2020–2040)
                                                           ├─ public/saints.sqlite (optional artifact)
                                                           └─ dist/Orthodox_Saints_Database.xlsx (+ Feasts & Fasts sheet)
src/ (Astro SSG)   ── imports public/data.json at BUILD TIME ──► _site/ (static HTML per page + per saint)
GitHub Actions     ── python build.py → astro build → deploy _site/ ──► GitHub Pages
```

- **SQLite is a build-time tool only.** It is created fresh from the CSV on every run,
  used for validation and querying, then discarded (or published as a read-only
  artifact). It is **never** the source of truth and is **never** committed.
- **Astro consumes `public/data.json` at build time** (read from disk in `src/lib/data.ts`,
  not fetched at runtime) and pre-renders one HTML page per route **and one per saint**
  (`/saint/OS-####`). The search/quiz islands fetch a content-hashed static
  `/finder-data/<hash>.json` on demand and the home island a lighter `/card-data/<hash>.json`
  (both emitted at build from the same data); per-saint pages ship only their own record.
  `python build.py` MUST run before `astro build`.
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
- `make feast-batch N=10` / `make feast-run` / `make feast-status` / `make feast-stop`
  → the feastgen pipeline (§5a): rank profile-less feasts / run the resumable bulk
  generator / inspect / stop. Same auth + limit handling as profilegen.

**Frontend (Astro; needs Node 24+).** Run `make web-install` (`npm ci`) once, then:
- `make serve` / `make web-dev` → `python build.py --no-xlsx && npm run dev` : the live Astro dev server.
- `make web-build` → `python build.py --no-xlsx && npm run build` : the static site into `_site/`.
- `make web-lint` → `npm run lint` : ESLint + Prettier `--check` over `src/` + `e2e/`. (CI gate.)
- `make web-unit` → `npm run test:unit` : Vitest unit tests over `src/lib` pure logic. (CI gate.)
- `make web-test` → `npm test` : Playwright smoke tests against the built site. (CI gate.)
  These call `npm` directly so they also work on Windows/PowerShell without `make`.

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

Icon-download scripts load these via `python-dotenv` (`pip install python-dotenv`; authoring-only dep, not in `requirements.txt`). Authenticated bots get higher API rate limits; the two-step MediaWiki login flow is implemented in `scripts/`.

---

## 5. Data model — the 26 columns

> A condensed human-facing version of §5–§7 lives in `docs/data-model.md` (and the
> no-AI maintenance runbook in `docs/maintenance.md`). **When you change this section
> or §5a, update docs/data-model.md in the same PR.**

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
| 16 | Feast Day(s) | free, multi | e.g. `Sep 4; Dec 10`. Drives calendar + dedup. Not build-required (rare featless stubs allowed, §10); must parse when present. |
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
  Alternatively, for an image used under a vendor's written permission, use a
  `Permission:<vendor_slug>` token instead of an open license (see §9 "Vendor-permission
  images").
- The `image` then surfaces in cards, the finder, the quiz, and the saint detail page;
  no other field changes. Source images need clergy/licence review before launch (§9).
- **After downloading any new icon(s), resize at JPEG quality 80** — scale width to ≤ 800 px, then top-crop height to ≤ 800 px (preserves the face). The `make download-icons` pipeline does this automatically; for manually-sourced files use `save_resized()` in `scripts/download_saint_icons.py`. (`.gif` files must be converted to `.jpg` manually before resizing.)
- **Every portrait also gets a ~200 px avatar thumb** at `static/icons/thumbs/<same rel path>.jpg` — the finder/quiz/card avatars load it (~10 KB) instead of the ~100 KB original; the detail-page hero keeps the original. The download pipeline emits thumbs on ingest; after adding icons manually run `python scripts/make_icon_thumbs.py` (needs Pillow). `build.py` emits `imageThumb` only when the thumb file exists and `make validate` warns on portraits missing one, so a forgotten thumb degrades gracefully, never 404s.

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

**Saint depictions (the "Depictions & Icons" carousel).** The saint page's redesign
carries a horizontal carousel of *additional* icons (the single hero portrait still comes
from `data/saint_images.csv`). Add **one row per card** to `data/saint_depictions.csv`
(`saint_id,image_path,license,credit,source,kind,tag,title,era,by`) — **many rows per saint**,
rendered in file order:
- `image_path`, `license`, `credit`, `source` follow the **same licensing gate as
  saint_images** (§9): an open license (`PD`/`PD-art`/`PD-old`/`CC0`/`CC-BY*`/`CC-BY-SA*`,
  `CC-BY*` needing a `credit`) **or** a `Permission:<vendor_slug>` token resolved against
  `data/image_permissions.csv`. A permission card **requires** a `source` (the grant condition:
  each card links to its specific vendor icon page); a revoked vendor's cards are dropped + warn.
- `kind` ∈ `museum` | `iconographer` | `shop` drives the card tone; `title` (required) is the
  card heading; `tag`, `era`, `by` are the optional badge / dateline / attribution line.
- The build joins the cards into the record as `depictions[]` (permission cards gain
  `permission`/`vendor`/`attribution`; open-license cards keep `license`/`credit`). Each card
  links to its `source` (a permission card's specific vendor icon page). Self-host + resize
  images exactly as for portraits (§5 portraits bullet); permission files live under
  `static/icons/permission/<vendor_slug>/`.

**Group taxonomy (collective commemorations).** Two join files (same pattern as the image/
quote joins) re-link the members of a collective commemoration and make group membership a
**first-class, filterable dimension** of the finder:
- `data/groups.csv` (`slug,saint_id,name,type,description,feast,sort,rule`) — one row per group.
  `slug` is a permanent kebab-case join key. **`saint_id` is the group's own OS-#### — a group
  IS a saint-profile** (`profile_type:"group"`), served at `/saint/<saint_id>` with the
  dedicated **`GroupSaintProfile`** layout. Leave it blank on a new row; the build assigns the
  next id from the **same OS-#### counter as saints** (§6 — never colliding, never reused), and
  writes it back (groups.csv is CRLF, like the other data CSVs). `type` is an enumerated set — **`synaxis`** (a
  collective assembly: the Twelve, the Seventy, a Synaxis of New Martyrs), **`feast-companions`**
  (distinct individually-venerated saints sharing a principal feast: Peter & Paul, the Three
  Hierarchs — the §7 split boundary), or **`household`** (a family / kinship unit). `feast`
  (optional) is a shared feast day; `sort` orders groups. **`rule`** (optional) makes an
  **open/dynamic** group (e.g. the New Martyrs of Russia, All Saints of a region): the build
  computes its membership by matching saints instead of using explicit `saint_groups.csv`
  rows, so a newly-glorified saint joins automatically. Grammar: ` && `-joined `field:v1|v2`
  conditions (AND across, OR within, case-insensitive substring; fields: rank, era, century,
  region, tradition, vocation, life, notes, name) — e.g.
  `rank:New Martyr|Confessor|Passion-bearer && era:Modern && tradition:Russian`.
- `data/saint_groups.csv` (`group_slug,saint_id,role,order`) — the membership join. `saint_id`
  may reference an **individual OR a still-collective** row, so the taxonomy ships independently
  of the split backlog; it may also be **blank for a name-only member** (put the name in `role`)
  — that member is listed without a link. `role`/`order` are optional.
- The build **fails loud** on a bad `type`, a dangling `group_slug`/`saint_id`, a duplicate slug,
  a duplicate membership, or a group `saint_id` that collides with a saint/retired id. Each saint
  gains `groups` (+ `groupNames` for the facet) in the record and a small **"Member of"** section
  linking to each group's `/saint/<id>` profile; the group's own record carries
  `profile_type:"group"` + its `members[]` and renders the **"Members of this Group"** list.
  Group records flow into `public/data.json`, so they appear in the finder, calendar, search, and
  sitemap — **but are excluded from the patron quiz** (not intercessors). `public/groups.json`
  drives the redirect of the retired **`/group/<slug>` URLs → `/saint/<saint_id>`** (astro.config).
  The finder gains a **Group** facet.

**Vocabulary pitfalls (validation will catch these, but to save a round-trip):**
- A term valid in one column is **not** valid in another. Common slips: *Parenting* and
  *Convert* are **Life Experience** / **Church Status** respectively, **not** Intercessions;
  there is no *Parenting* or *Convert* intercession. The build now prints a "wrong column?"
  hint when this happens.
- **Old-Testament figures** (prophets, patriarchs): set **Era = Old Testament** and leave
  **Century blank** — the only BC century term is `1st BC`, so don't force a century.
- To add a genuinely missing term, add it to `data/vocabulary.csv` **first** (§12.2).

---

## 5a. The Feasts & Fasts database (`data/feasts.csv`, `FF-####`)

A second structured database, sibling to the saints table, covering the liturgical
**feasts, fasts, and observances** of the year — so the calendar can overlay them and
each entry can carry the **history and meaning** of the celebration. Design spec:
`docs/superpowers/specs/2026-07-05-feasts-fasts-database-design.md`. Owned by
**`feastlib.py`** (loaded/validated/emitted through `build.py`; `make validate`
covers it). Emits `public/feasts.json` (records + a resolved Pascha table
2020–2040 from `pascha.py`) and a "Feasts & Fasts" xlsx sheet.

**Frontend (shipped):** the `/feasts` + `/fasts` index (#278) and per-feast
**`/feast/[id]` detail pages** (`src/pages/feast/[id].astro`, PR #352) — themed
like the saint/host pages (rich prose from the `feasts` collection), linked from
the index, calendar, moveable-calendar, and the "Coming up next" island. All 83
feast profiles are `reviewed`/public. **Festal imagery is not wired yet** (#350):
the page reads optional `image`/`depictions` on the `Feast` type and shows an
"Icon forthcoming" placeholder until a `data/feast_images.csv`/`feast_depictions.csv`
+ feastlib join is built. Two subscribable **iCal feeds** — `/calendar/new.ics` and
`/calendar/old.ics` (New/Old calendar) — carry the feasts + fasts plus one aggregated
"commemorations of the day" event, reckoned +13 for the Old calendar (movable feasts
stay shared); built at deploy time by `src/lib/ical.ts` (RFC 5545 serializer) +
`src/lib/calendar-feed.ts` (feed builder, reusing `resolveToken`/`oldCalendarDay`). The
**`/calendar` page** hosts a **Subscribe** control (in `calendar.astro` + the island) that
swaps its add-to-calendar links to the feed matching the active New/Old toggle — there is
no standalone subscribe page.

**19 columns:** Feast ID · Name · Also Known As · Category · Dedication · Begins ·
Ends · Forefeast · Apodosis · Fasting Discipline · Fasting Notes · Brief ·
Customs & Traditions · Tradition of Observance · Related Saints · Related Feasts ·
Icon · Notes · Sources. Multi-value cells use `"; "`; the file is CRLF like the
other CSVs.

- **`FF-####` ids follow the exact OS-#### rules (§6):** opaque, permanent, never
  reused/renumbered; add rows with a **blank** id and the build assigns + writes back.
- **The date-token grammar** — every date cell (`Begins`/`Ends`/`Forefeast`/`Apodosis`)
  holds exactly ONE token in one of three forms, complete for the Orthodox calendar:
  - **`Mon D`** — fixed date: `Dec 25`
  - **`P+n` / `P-n`** — Pascha-relative offset in days (Pascha = `P+0`, Palm Sunday
    `P-7`, Clean Monday `P-48`, Pentecost `P+49`); valid range **−78…+63**
  - **`Dow before|after Mon D`** — weekday-anchored: `Sun before Dec 25` (the nearest
    such weekday strictly within the 7 days before/after the anchor)
  A span sets Begins + Ends; the two token kinds may mix in one row (the Apostles'
  Fast begins `P+57` and ends `Jun 28`). The **cycle (fixed/paschal/hybrid) is
  derived, never authored.** `feasts.json` emits tokens structurally
  (`{type:"paschal",offset:49}`; `dow` uses the JS getDay convention, 0=Sun) — the
  frontend never re-parses strings. Dates follow the **New (Revised Julian) calendar**
  convention, like the saints data.
- **Controlled vocab** (in `data/vocabulary.csv`): `Feast Category` (Feast of Feasts ·
  Great Feast · Feast · Fast Season · Fast Day · Fast-Free Week · Observance),
  `Dedication` (Lord · Theotokos · Cross · Forerunner · Apostles · Angels · Saints ·
  Departed), `Fasting Discipline` (Strict Fast · Wine & Oil · Fish Allowed · Dairy
  Allowed · Fast-Free · Varies). **Tradition of Observance reuses the Tradition of
  Veneration terms** (blank = pan-Orthodox).
- **Cross-refs are validated:** Related Saints ids must exist in `data/saints.csv`
  (verify the row's Name before citing an id!); Related Feasts ids must exist in
  feasts.csv and not self-reference.
- **Scope rules:** a saint's own feast day belongs in the saints table, NOT here —
  this table carries event-feasts of the Lord/Theotokos/Cross, **angelic feasts**
  (which §7 excludes from saints.csv), fasts, fast-free weeks, and calendar
  observances (named Sundays/Saturdays, synaxes tied to Great Feasts). The weekly
  Wed/Fri fast is a rule, not an event — no row. **Fasting stays season-summary,
  descriptive not prescriptive** (the frontend adds a "consult your priest"
  disclaimer); forefeast/afterfeast periods are columns on the feast's row, not rows.
- **Rich prose** lives in `src/content/feasts/FF-####.yaml` (the `feasts` collection
  in `content.config.ts`): `overview` + first-class **`history`** and **`meaning`**
  paragraph arrays, plus optional timeline/scripture/iconography/hymnography/
  fastingPractice/customs/sections/related. Same `status: draft|reviewed|flagged`
  production gate as saint profiles; §9 guardrails carry over (hymnography is
  DESCRIBED, never quoted from copyrighted translations).
- **feastgen (`tools/feastgen/`)** mirrors profilegen: gather → write → verify →
  emit, anchored on the feast's CSV row; phantom flags demoted, not dropped; drafts
  never auto-publish. `make feast-run` is the resumable bulk runner (state under
  `dist/feastgen/`), `make feast-batch` previews the next batch. Like profilegen,
  the runner defaults to the per-stage Workflow (`scripts/feastgen.workflow.js`:
  Gather=Sonnet, Write=Opus, Verify=Sonnet, Emit=Haiku — ~2.3× cheaper on the
  weekly limit); `FEASTGEN_USE_WORKFLOW=0` falls back to the all-Opus single-agent
  path.

## 5b. The Heavenly Hosts database (`data/heavenly_hosts.csv`, `HH-####`)

A **third** structured database, sibling to Saints (`OS-####`) and Feasts & Fasts
(`FF-####`), cataloguing the **bodiless powers** — the nine angelic ranks, the
named archangels, and (later) the individual angels of Scripture/Tradition and a
marked set of the fallen. Angels are deliberately excluded from `data/saints.csv`
(§7); this is where the beings themselves are first-class records. Owned by
**`hostlib.py`** (loaded/validated/emitted through `build.py`; `make validate`
covers it), which mirrors `feastlib.py`. Design spec:
`docs/superpowers/specs/2026-07-07-heavenly-hosts-database-design.md`.

- **`data/heavenly_hosts.csv` (19 cols):** Host ID · Name · Also Known As ·
  Entity Type · Celestial Order · Canonical Status · Primary Source · Scripture
  References · Deuterocanonical Sources · Extra-Biblical Sources · Feast Day(s) ·
  Related Feasts · Related Saints · Related Beings · Brief · Tags · Icon · Notes ·
  Sources. `HH-####` ids follow the **exact `OS-####` rules** (§6: opaque,
  permanent, never reused; add a **blank** id and the build assigns + writes back).
  CRLF, `"; "` multi-sep.
- **Controlled vocab** (in `data/vocabulary.csv`): **Entity Type** (`Angelic Rank`
  · `Named Angel` · `Scriptural Angel` · `Angelic Class` · `Collective` · `Fallen`),
  **Celestial Order** (the nine ranks; **Triad is derived, never authored**),
  **Canonical Status** (`Scriptural` · `Deuterocanonical` · `Traditional` ·
  `Apocryphal` · `Symbolic`), **Host Source Type** (the 8-register source
  taxonomy — the source-fidelity commitment: Holy Scripture / Deuterocanonical /
  Holy Tradition / Liturgical Tradition / Patristic / Second Temple / Early
  Christian / Later Tradition, never blurred).
- **Cross-refs validated:** Related Saints → `saints.csv`, Related Feasts →
  `feasts.csv`, Related Beings → `heavenly_hosts.csv` (no self-ref). Feast Day(s)
  parse as fixed `Mon D` tokens.
- **Rich prose** lives in `src/content/hosts/HH-####.yaml` (the `hosts` collection
  in `content.config.ts`): `overview` + `historicalContext` /
  `orthodoxInterpretation` / `liturgicalTradition` / `iconography` /
  `historicalInfluence` / `salvationHistory` (sections) / `scripture` / `sections`
  / `related` / `reading`. Same `status: draft|reviewed|flagged` production gate as
  saint/feast profiles; §9 guardrails carry over (source registers preserved, no
  fabrication, hymnography described not reproduced).
- **Images:** `data/host_images.csv` (one hero portrait per host) and
  `data/host_depictions.csv` (MANY carousel cards per host) reuse the **saints'
  licensing gate verbatim** (§9): an open license (`PD`/`CC0`/`CC-BY*`/`CC-BY-SA*`,
  CC-BY* needs a credit) **or** a `Permission:<vendor>` token against
  `data/image_permissions.csv`. Files self-hosted under `static/icons/hosts/` (open)
  or `static/icons/permission/<vendor>/` (permission). No pip/Pillow in some
  environments — resize with **node + sharp**.
- Emits `public/hosts.json`, a "Heavenly Hosts" xlsx sheet, and frontend routes
  **`/nine-orders`** (the Nine Orders overview: ranks by triad, with per-triad
  epithets) and **`/host/HH-####`** (per-being pages: blue hero + face-cropped
  portrait, "Depictions & Icons" carousel, collapsible sections, left rail). A
  rank page auto-lists its **Named Angel** members as cards (the eight archangels
  on the Archangels page). Excluded from the patron quiz (angels are venerated,
  not intercessor-saints).

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
- **Retired IDs** are tracked in `data/retired_ids.csv` (columns: `retired_id, retired_name,
  canonical_id, canonical_name, reason, date, pr`). **Never reuse or renumber a retired ID.**
  Before assuming a gap ID is available, check this file.

### Retirement process (no tooling required)

1. **Confirm the duplicate.** Use `make find NAME="…"` to compare candidates; verify same
   saint by cross-checking name / Also Known As, feast day, century, and region.
2. **Choose the canonical (keeper) row.** Prefer the lower-numbered (earlier-entered) ID,
   especially if it has richer facets or a profile file.
3. **Enrich the canonical row.** Copy any unique feast dates, Traditions, Intercessions,
   Vocation, Life Experience, Sources, and Notes from the retiring row; merge, don't overwrite.
4. **Add a Notes cross-reference** to the canonical row: e.g. `Merged with retired
   duplicate OS-XXXX.`
5. **Delete the retiring row** from `data/saints.csv`. Open the file in a text editor that
   preserves CRLF, delete the line, save. (See CRLF gotcha in §7.)
6. **Delete any profile** `src/content/profiles/OS-XXXX.yaml` for the retiring ID.
7. **Add a row to `data/retired_ids.csv`** with all seven columns filled; keep rows sorted
   by `retired_id`.
8. **Run `make validate`** — must exit clean (zero violations).
9. **Commit and PR** with a message like:
   `data: retire OS-XXXX (duplicate of OS-YYYY — <brief reason>)`

---

## 7. Authoring conventions

These conventions apply to all data authoring and Phase-2 enrichment work.

> **Gotcha — `data/saints.csv` uses CRLF line endings (Windows-style).** There is no
> `.gitattributes` enforcing this. Run `git config core.autocrlf false` before editing,
> and verify with `cat -A data/saints.csv | head -2` (lines should end in `^M$`). An
> editor that normalizes to LF silently produces a large noisy diff or corrupts the file.

- **Comprehensive coverage**, including obscure local saints, pre-schism Western saints,
  and the New-Martyr tail. Honest **stubs** are acceptable for obscure saints: fill
  Name, Rank, Gender, Feast, Region, Era/Century, a composed Short Prayer, and Sources;
  leave the rest blank rather than inventing. (Feast may be left blank for the rare saint
  with no fixed/documented feast — see §10.)
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

### The spine
**OCA daily Synaxarion (oca.org)** — used for Phase 1 (now complete). Used **only as a reference for facts**; write our own brief lives and short prayers, never reproduce its wording (§9). No single synaxarion covers the full pan-Orthodox calendar; Phase 2 adds breadth from other recensions.

### Two-phase plan
- **Phase 1 — Walk the spine (Jan 1 → Dec 31).** COMPLETE.
- **Phase 2 — Merge other jurisdictions by identity.** For each saint:
  - **If already present** (Name / Also Known As + century + region match): **enrich the existing row** — add jurisdiction to *Tradition of Veneration*, add *Feast Day(s)*, fill missing facets. **Never create a second row.**
  - **If absent:** add a new row (blank ID → build assigns).

### Current status & next action
- Data: **2,790 saints**; IDs run to **OS-2805**. **PHASE 1 (the spine walk) IS COMPLETE** —
  the whole fixed calendar Jan 1 → Dec 31. **PHASE 2 (merge by identity) is well underway:**
  modern Greek/Athonite glorifications (#136), Romanian (#138), Serbian (#140), Georgian
  (#143), Bulgarian (#145), Antiochian (#146), Western pre-schism (#147), and
  Alexandria/African (#148–149) have all landed, each in its own PR. **The main outstanding
  merge is the full Greek (GOARCH) calendar.**
- **Retired IDs** (removed duplicates; never reused): tracked in `data/retired_ids.csv`. See §6 for the retirement process.
- **Status: LAUNCHED for the parish 2026-07-18 (PR #352).** Every `draft` profile was
  promoted `→ reviewed`, so nearly all saints **and all 83 feasts are now public**; the 141
  `flagged` profiles stay hidden (resolve via #349). **Visibility is no longer the lever —
  the dove is.** Two independent axes now: `status` controls visibility (almost everything is
  `reviewed`), and the separate `humanReviewed: true` flag earns the **dove seal** (a person
  vetted the entry against sources, §9). The ongoing human lever is setting `humanReviewed`
  while walking the daily synaxarion — that grows trust in what is already public. Then enrich
  relatability/background facets (**Vocation**, Life Experience) — *not* Intercessions-first
  (§10). Phase 2 (GOARCH merge) is still the main breadth gap.
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

**Profile generation pipeline (`tools/profilegen/`).** Gather (Sonnet) → Write (Opus) → Verify (Sonnet) → Emit (Haiku). Gather seeds from the saint's CSV row (trusted anchor), then fetches external sources; Verify checks each claim adversarially against the anchor, quoting the profile verbatim; Emit produces `src/content/profiles/OS-####.yaml` at `status: draft` (or `flagged` when an unsupported claim survives) plus propose-only PD quote/image rows under `dist/`. Phantom flags (verifier paraphrased rather than quoted actual profile text) are demoted, not silently dropped. Drafts never auto-publish — humans promote to `reviewed` (the production gate, §11). Run `make profile-batch N=15` for the next high-value batch; `make profile-coverage` for regional gaps.

**Run modes.**
- *Calibration:* `make profile-batch N=15` → run Workflow (`scripts/profilegen.workflow.js`, requires explicit opt-in).
- *Bulk (unattended):* `make profile-run` (resumable; re-run to continue). Auth: `unset ANTHROPIC_API_KEY && claude setup-token && export CLAUDE_CODE_OAUTH_TOKEN=…`. Rate-limit behaviour, exit codes, and `NOTIFY_CMD` hook documented in `tools/profilegen/run.py`.
- Wikimedia (`en.wikipedia.org`, `commons.wikimedia.org`, `upload.wikimedia.org`) is reachable for sourcing; verify before a long run.

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
  **Vendor-permission images** are a separate, tracked exception to the otherwise-open
  licensing: a revocable, per-vendor grant (not redistributable). Such a portrait uses
  `license = Permission:<vendor_slug>` in `data/saint_images.csv`, its file lives under
  `static/icons/permission/<vendor_slug>/`, and the vendor is recorded in
  `data/image_permissions.csv`
  (`vendor_slug,vendor_name,attribution,homepage,granted,status,terms`). The build
  validates the slug against that registry and **requires a `source`** (the specific
  vendor icon page, which the saint page links — often a condition of the grant). To
  revoke a vendor: set its `status=revoked` (the build then excludes every image from that
  vendor and warns), then `rm -rf static/icons/permission/<vendor_slug>/` and drop the
  matching `saint_images.csv` rows. Each grant is recorded under `docs/permissions/`.
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

- **No single facet is "the engine" — discovery is multi-path (§1).** The finder/quiz read the **CSV controlled-vocab facets, not profile prose**, so generating profiles does NOT raise facet coverage — enrichment is a *separate* lever. Coverage now: Intercessions ~18.6%, Vocation ~21.7%, Life Experience ~56%, Region ~97%, Brief Life ~99.9%. Since the 2026-07-18 launch (PR #352) drafts DO ship — profiles are public and the **`humanReviewed` dove** (§5, §11) is the trust lever, not the visibility gate. Prioritize marking `humanReviewed` on vetted entries and the relatability/background facets (**Vocation**, Life Experience) ahead of Intercessions, which serves only the affliction path. Fill wherever sources support it; don't fabricate.
- Minimum for any row: Name, Rank, Gender, Short Prayer, Sources (the build-enforced
  `REQUIRED` set). A Feast Day and Era/Century are **strongly expected** and present on
  nearly every saint — but a handful of genuinely-commemorated saints have no fixed (or only
  a movable/undocumented) feast, so the build allows a **blank Feast** for those stubs. When
  a feast *is* present it must still parse. A featless saint is fully searchable but does not
  appear on the calendar.
- Prefer enriching high-traffic patrons over adding more bare stubs when time is limited.

---

## 11. Tech stack

- **Python 3.11+**, standard-library `sqlite3`, `csv`. `openpyxl` for the Excel export.
- **Frontend: Astro (static-site generator), Node 24+, in `src/`.** File-based routing; `.astro` components render at build time; shared logic in `src/lib/` (TS); client JS is **only** the vanilla TS islands in `src/islands/` (**no React/Vue**). Adding a page = add a file under `src/pages/`. **Witnesses of Our Time** (`/witness/[slug]`, surfaced on `/america`) is a **non-canonical memorial section** for not-yet-glorified figures — kept strictly out of the finder/quiz per §9; memorial pages use no liturgical address.
- **New styles are component-scoped.** Styles specific to one component go in that
  component's `<style>` block (Astro scopes them automatically); `src/styles/global.css`
  is reserved for design tokens (`:root` variables), resets, and genuinely shared
  primitives (buttons, chips, cards). Do not grow the global sheet with per-component
  rules — it is already the least navigable file in the repo.
- **Rich saint profiles** are one YAML file per saint in `src/content/profiles/OS-####.yaml`,
  an Astro **data Content Collection** defined in `src/content.config.ts`; the **Zod schema
  validates every profile at build time** (a bad/incomplete profile fails the build). Each
  profile carries `status: draft|reviewed|flagged`; production ships only `reviewed` (drafts
  render in dev / `PUBLIC_SHOW_DRAFTS=true`, behind a banner). `SaintView.astro` reads them
  via `loadProfileMap()` (which wraps `getCollection("profiles")`, applying the review gate).
  `build.py` cross-checks every profile filename/id against the saints. **Two independent
  axes (since the 2026-07-18 launch, §8):** `status` controls *visibility* — nearly all
  profiles are now `reviewed`/public — while a separate `humanReviewed: true` flag controls
  the **dove seal** shown in the finder/quiz (a person personally vetted the entry, §9). The
  seal is computed by `humanReviewedIds()` in `src/lib/saint-profiles.ts` (filters
  `humanReviewed === true`), NOT by `status`. Feast (`feasts`) and host (`hosts`) profiles
  share the same `status` gate.
- **Search is client-side and stays that way** — no browser storage, no backend. **One engine
  ranks every search box** (`src/lib/search.ts`, MiniSearch — the one search library): token-AND
  with prefix + typo tolerance, ranked by field boosts (name > Also Known As > name variants >
  haystack) plus a **prominence tiebreak** (`src/lib/prominence.ts`, a `boostDocument`), and
  **unioned with the legacy substring filter** as a recall floor so no query matches less than it
  used to. The finder (`buildSearchIndex`, /search + /quiz) indexes the full record incl. the
  deep `search` haystack; the header + hero quick-search typeahead (`buildNameSearch`) indexes
  only name/aka/variants (a jump-to box) — so shared saints rank the same order in every box,
  and a bare first-name query surfaces the marquee patron first (e.g. "nicholas" → St Nicholas
  the Wonderworker). **Prominence** is data-derived (feast count, tradition breadth + Pan-Orthodox,
  portrait, curated-intercession count), computed once and shipped on both `/search-index.json`
  and the finder payload as `prom`, so both derive the identical number. Facet filters remain
  hand-rolled set intersection (`src/lib/filter.ts`). The build still expands each haystack with
  **name variants** from `data/name_variants.csv` (so "Lucy" finds Lucia, "Ivan" finds John; a
  result names the matched variant). The **patron-saint quiz** is its own route (`/quiz`); it
  scores saints by facet overlap (intercessions weigh most) — match quality scales with facet
  coverage (§10).
- **Per-saint pages + the data ceiling.** Astro pre-renders `/saint/OS-####` per saint (real,
  indexable, shareable; each ships only its own record). The /search and /quiz islands **fetch**
  the trimmed finder dataset from a content-hashed static `/finder-data/<hash>.json`
  (`src/lib/finder-payload.ts` + `src/pages/finder-data/[hash].json.ts`; one browser-cached
  download shared by both pages), with the first page of results SSR'd for instant paint /
  SEO / no-JS. The ceiling is now the fetch's gzip weight (~540 KB at 2.8k saints, linear) —
  comfortable well past 10k saints; re-measure there before restructuring. The home island
  fetches the lighter card index (no `search` haystack) the same way from
  `/card-data/<hash>.json` (`src/lib/card-payload.ts`); shard it per-month if the deferred
  fetch grows heavy. The calendar pre-renders the whole corpus on one page: see the
  `TODO(scale)` in `src/pages/calendar.astro` (split per-month around ~4k saints).
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
  one-line edit. **CI/CD:** GitHub Actions (free). **Cloudflare fronts production as an
  edge cache** (the apex is proxied): cache rules are managed as code in
  [`infra/cloudflare/`](infra/cloudflare/) (`apply.sh` + `cache-rules.json`), and the deploy
  workflow purges the edge after publishing. Setup runbook + rationale:
  `infra/cloudflare/README.md`; failure map in `docs/infrastructure.md` §1a.
- The deploy workflow runs `python build.py` → `astro build` → publishes `_site/`. The PR
  workflow (`ci.yml`) has three gates: **`validate`** (python unit tests + `--check-only`),
  **`frontend`** (`npm run lint` + `astro build` + Playwright e2e in `e2e/`), and **`worker`**
  (`workers/report` `node --check` + offline smoke tests — runs only when that folder changes).
  A CodeQL workflow scans the code; Dependabot keeps Actions / pip / Docker / **npm** current
  (patch+minor auto-merge). GitHub Actions are pinned to commit SHAs.
- **PR preview deploys (Cloudflare Pages).** Every branch/PR is built by Cloudflare Pages
  (`scripts/cf-pages-build.sh`) and published to a `*.orthodox-saints.pages.dev` preview URL —
  separate from, and not affecting, the GitHub Pages production deploy. Previews set
  `PUBLIC_SHOW_DRAFTS=true`, so **`draft` and `flagged` profiles render** (each behind a banner;
  flagged profiles also list their unresolved verifier concerns) for visual review before
  promotion. Always include the preview link in a PR (§12.7). Setup + behavior:
  `docs/cloudflare-pages-previews.md`.
- **Corrections backend (`workers/report/`).** The `/corrections` form has no visitor GitHub
  account requirement: it POSTs to a Cloudflare Worker at `orthodoxsaintfinder.com/api/report`
  (same-origin route) that verifies a **Turnstile** token, sanitizes input, and files a
  **`data-quality`** GitHub issue via a **GitHub App** (short-lived installation tokens signed
  from an App private key — no PAT, nothing to rotate). It's a separate deploy from the site
  (`npx wrangler deploy` from that folder), with its own package/lint/test toolchain (excluded
  from the Astro eslint/prettier scope) and its own CI gate. Full setup, secrets, and
  troubleshooting: `workers/report/README.md`.

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
   Pages preview link** under the template's `## Preview` heading — once the Cloudflare Pages
   check is green, click "Visit deployment" to get the exact URL. Previews show `draft`/
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
