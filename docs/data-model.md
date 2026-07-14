# Data model — human quick reference

This is the hand-editing reference for the CSVs in `data/`. It condenses the full
operating contract in [`CLAUDE.md`](../CLAUDE.md) §5–§7 for a human working without an
AI assistant. If the two ever disagree, CLAUDE.md wins — and please fix the drift here.

## Before you edit anything

- **`data/saints.csv` uses CRLF (Windows) line endings.** There is no `.gitattributes`
  enforcing this. Run `git config core.autocrlf false` once, and verify with
  `cat -A data/saints.csv | head -2` (lines must end in `^M$`). An editor that silently
  normalizes to LF produces a huge noisy diff or corrupts the file. The other `data/`
  CSVs are CRLF too.
- **Multi-value cells use `"; "`** (semicolon + space), never commas or pipes:
  `Sep 4; Dec 10`, `Hieromartyr; Hierarch`.
- **Leave IDs blank on new rows.** The build assigns the next `OS-####` / `FF-####` and
  writes it back into the CSV. Never hand-pick, reuse, or renumber an ID — they anchor
  permanent public URLs. Retired (merged-duplicate) IDs live in `data/retired_ids.csv`;
  the retirement process is CLAUDE.md §6.
- **Controlled-vocabulary terms must exist in `data/vocabulary.csv` first.** The build
  fails on unknown terms, and prints a "wrong column?" hint if the term is valid in a
  different column (the most common slip — e.g. *Parenting* is a Family / Life State
  term, not an Intercession).
- **Validate:** `make validate` (or `python build.py --check-only`) must report CLEAN.
  `python build.py --no-xlsx` assigns IDs and emits `public/data.json` on plain host
  Python. Use `make find NAME="…"` before adding a saint to catch variant-spelling
  duplicates.

## `data/saints.csv` — one row per saint, 26 columns

Kinds: **free** = free text · **controlled** = every term must be in
`data/vocabulary.csv` under that category · **multi** = `"; "`-separated ·
**derived** = leave blank, the build generates a search link (fill only to override).

| # | Column | Kind | Notes |
|---|--------|------|-------|
| 1 | Saint ID | key | `OS-####`. Blank on new rows; build assigns. |
| 2 | Name | free, **required** | Primary display name. |
| 3 | Also Known As | free, multi | Alternate names/transliterations — keep searchable names here. |
| 4 | Gender | controlled, **required** | |
| 5 | Rank / Type | controlled, multi, **required** | e.g. `Hieromartyr; Hierarch`. |
| 6 | Church Status | controlled, multi | Clergy office uses ` - `: `Clergy - Bishop`. |
| 7 | Family / Life State | controlled, multi | |
| 8 | Vocation | controlled, multi | |
| 9 | Life Experience | controlled, multi | **Sourced-only** — tag only what the recorded life supports; never clinical diagnoses. |
| 10 | Virtue | controlled, multi | |
| 11 | Commonly Asked Intercessions | controlled, multi | Drives the finder's affliction path. |
| 12 | Region of Origin | controlled, multi | Where the saint is *from*. |
| 13 | Tradition of Veneration | controlled, multi | Which jurisdiction(s) venerate. |
| 14 | Era | controlled (single) | Old-Testament figures: `Old Testament`, Century blank. |
| 15 | Century | controlled (single) | Only BC term is `1st BC`. |
| 16 | Feast Day(s) | free, multi | `Sep 4; Dec 10`. May be blank for a rare featless stub; must parse when present (fixed `Mon D` tokens and/or movable-feast wording). |
| 17 | Short Prayer (Intercession) | free, **required** | Compose the universal form `Holy [Title] [Name], pray to God for us.` — never paste a copyrighted prayer. |
| 18 | Hymn / Apolytikion | derived | |
| 19 | Icon | derived | A Google-Images *search* link — the displayed portrait comes from `saint_images.csv`. |
| 20 | Brief Life | free | 1–3 sentences, in our own words. |
| 21 | Notes | free | Cross-references live here (`Distinct from … (OS-0966).`). |
| 22 | Customs & Traditions | free | Church-blessed customs only. |
| 23 | Works by the Saint | free, multi | Plain titles, never URLs (rendered as search links). |
| 24 | Works About the Saint | free, multi | Same. |
| 25 | Video / Media | derived | |
| 26 | Sources | free, multi, **required** | Always cite where the entry came from. |

An optional extra `Themes` column (curated theme-slug overrides, slugs defined in
`themes.py`) is recognized by the build but not part of the standard 26.

**One row per saint.** Multiple feast days go in one cell. Split a bundled row only for
distinct, individually-venerated saints with their own facet profiles; keep collective
commemorations (a synaxis, "the 40 Virgin-Martyrs") as one row — full rules in
CLAUDE.md §7.

## `data/feasts.csv` — one row per feast/fast, `FF-####`, 19 columns

Feast ID · Name · Also Known As · Category · Dedication · Begins · Ends · Forefeast ·
Apodosis · Fasting Discipline · Fasting Notes · Brief · Customs & Traditions ·
Tradition of Observance · Related Saints · Related Feasts · Icon · Notes · Sources.

Controlled categories: `Feast Category`, `Dedication`, `Fasting Discipline` (all in
`data/vocabulary.csv`); Tradition of Observance reuses the Tradition of Veneration
terms (blank = pan-Orthodox). Related Saints must be real `OS-####` ids (check the
row's Name before citing!); Related Feasts must be real `FF-####` ids, no
self-reference.

**Date-token grammar** — each of Begins / Ends / Forefeast / Apodosis holds exactly ONE
token, in one of three forms:

| Form | Meaning | Example |
|------|---------|---------|
| `Mon D` | fixed date | `Dec 25` |
| `P+n` / `P-n` | Pascha-relative offset in days (range −78…+63) | Pentecost = `P+49` |
| `Dow before\|after Mon D` | nearest such weekday strictly within 7 days of the anchor | `Sun before Dec 25` |

A span sets Begins + Ends, and the two kinds may mix in one row (the Apostles' Fast:
`P+57` → `Jun 28`). The fixed/paschal/hybrid cycle is derived — never authored. Dates
follow the New (Revised Julian) calendar. A saint's own feast day belongs in
saints.csv, not here (scope rules: CLAUDE.md §5a).

## Join files (all keyed by `saint_id`)

| File | Columns | One row per… | Notes |
|------|---------|--------------|-------|
| `saint_images.csv` | `saint_id,image_path,license,credit,source` | saint (hero portrait) | `image_path` self-hosted under `static/icons/`; see licensing below. Generate the ~200 px thumb with `python scripts/make_icon_thumbs.py`. |
| `saint_quotes.csv` | `saint_id,quote,work,locus,translation,source_url` | saint (one quote max) | Quote verbatim from a **public-domain translation** (`ANF`/`NPNF`/`NPNF1`/`NPNF2`, `(PD)`, `PD-old`, `CC0`); anything modern/in-copyright fails the build. `source_url` required. |
| `saint_depictions.csv` | `saint_id,image_path,license,credit,source,kind,tag,title,era,by` | carousel card (many per saint) | Same licensing gate as images. `kind` ∈ `museum`/`iconographer`/`shop`; `title` required. |
| `groups.csv` | `slug,saint_id,name,type,description,feast,sort` | group | `slug` is permanent. `saint_id` is the group's own **build-assigned OS-#### (blank → assigned; §6 shared counter with saints)** — the group is a saint-profile served at `/saint/<saint_id>` with `profile_type:"group"`. `type` ∈ `synaxis`/`feast-companions`/`household`. |
| `saint_groups.csv` | `group_slug,saint_id,role,order` | membership | Dangling refs and duplicates fail the build. A member may be **name-only** (blank `saint_id` + a `role` name) when the individual has no row yet — rendered without a link. |
| `image_permissions.csv` | `vendor_slug,vendor_name,attribution,homepage,granted,status,terms` | vendor grant | Registry for `Permission:<slug>` licenses; grants recorded under `docs/permissions/`. |
| `vendors.csv` | `vendor,url_template` | icon vendor | Link templates only (`{q}` = name); no vendor imagery is reproduced. |
| `name_variants.csv` | `group,names` | name-equivalence group | Powers search ("Lucy" finds Lucia). |
| `retired_ids.csv` | `retired_id,retired_name,canonical_id,canonical_name,reason,date,pr` | retired duplicate | Never reuse a retired ID. Keep sorted by `retired_id`. |

## Image licensing (build-enforced)

Accepted open licenses: `PD` / `PD-art` / `PD-old` / `CC0` / `CC-BY*` / `CC-BY-SA*`.
Anything else fails the build; `CC-BY*` additionally requires a `credit`. The one
exception is a **vendor-permission** image: `license = Permission:<vendor_slug>`, file
under `static/icons/permission/<vendor_slug>/`, vendor registered in
`image_permissions.csv`, and a `source` (the specific vendor icon page) is required.
A source link is *not* a license — when in doubt, omit the image. Full guardrails
(copyright, canonization caution, clergy review): CLAUDE.md §9.

## Rich profiles (YAML, not CSV)

Per-saint prose lives in `src/content/profiles/OS-####.yaml`, per-feast prose in
`src/content/feasts/FF-####.yaml`. Both are Astro content collections validated by the
Zod schemas in `src/content.config.ts` (a bad profile fails `astro build`). Each file
carries `status: draft | reviewed | flagged` — **production ships only `reviewed`**;
drafts render in dev and on Cloudflare PR previews (`PUBLIC_SHOW_DRAFTS=true`) behind a
banner. See [`docs/maintenance.md`](maintenance.md) for the review/promotion workflow.
