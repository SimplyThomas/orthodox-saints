# Feasts & Fasts Database (`FF-####`) — Design Spec

**Date:** 2026-07-05
**Status:** Approved (backend + research phase; frontend overlay is a follow-up)

## Purpose

A second structured database, sibling to the saints database, tracking every
liturgical **feast, fast, and observance** of the Eastern Orthodox year — so the
site's calendar can overlay them alongside saint commemorations, and each entry
can carry the **history and meaning** of the celebration.

- **Scope:** comprehensive (~120–150 entries): Pascha + the 12 Great Feasts,
  all fasting seasons and one-day fasts, fast-free weeks, the full
  Triodion/Pentecostarion movable cycle (named Sundays, Holy Week, Bright Week,
  Soul Saturdays, Mid-Pentecost), and major fixed feasts/observances (Protection,
  Circumcision, angelic synaxes — which CLAUDE.md §7 deliberately excludes from
  the saints table).
- **Out of scope as rows:** the weekly Wed/Fri fast (a rule, not an event);
  per-day fasting prescriptions (season-level summary only — pastorally
  sensitive; the frontend adds a "consult your priest" disclaimer); icon
  commemorations (deferrable later phase).
- **Calendar convention:** dates as kept on the New (Revised Julian) calendar,
  matching the OCA-spine convention of the saints data. An Old-Calendar +13-day
  shift is a possible frontend toggle later, not a data concern.

## Source of truth — `data/feasts.csv` (19 columns)

One row per entry. Opaque, permanent `FF-####` IDs (4+ digits, zero-padded,
never reused/renumbered); blank IDs are assigned sequentially by the build and
written back — the build is the sole numbering authority, exactly as for
saints. Multi-value cells use `"; "`. CRLF line endings like the other CSVs.

| # | Column | Kind | Notes |
|---|--------|------|-------|
| 1 | Feast ID | key | `FF-####` |
| 2 | Name | free, required | e.g. `Nativity of Christ`, `Great Lent` |
| 3 | Also Known As | free, multi | alternate names, transliterations |
| 4 | Category | controlled, single, required | see vocabulary below |
| 5 | Dedication | controlled, single, optional | who/what the feast is *of* |
| 6 | Begins | date token, required | grammar below |
| 7 | Ends | date token, optional | present ⇒ the entry is a span |
| 8 | Forefeast | date token, optional | start of forefeast period |
| 9 | Apodosis | date token, optional | leave-taking day |
| 10 | Fasting Discipline | controlled, single, optional | summary level only |
| 11 | Fasting Notes | free | nuance, e.g. fish on Annunciation |
| 12 | Brief | free, required | 1–3 sentences (the `Brief Life` analog) |
| 13 | Customs & Traditions | free | church-blessed customs only (§9) |
| 14 | Tradition of Observance | controlled, multi, optional | **reuses the existing `Tradition of Veneration` vocabulary**; blank = pan-Orthodox |
| 15 | Related Saints | multi | `OS-####` ids; validated against `data/saints.csv` |
| 16 | Related Feasts | multi | `FF-####` ids; validated; no self-reference |
| 17 | Icon | derived link | leave blank; build derives a Google-Images search URL |
| 18 | Notes | free | |
| 19 | Sources | free, multi, required | |

### Controlled vocabulary (new categories in `data/vocabulary.csv`)

- **Feast Category** (single): `Feast of Feasts` (Pascha alone) · `Great Feast`
  · `Feast` · `Fast Season` · `Fast Day` · `Fast-Free Week` · `Observance`
  (named Sundays, Soul Saturdays, Mid-Pentecost, Holy Week days, …)
- **Dedication** (single, optional): `Lord` · `Theotokos` · `Cross` ·
  `Forerunner` · `Apostles` · `Angels` · `Saints` · `Departed`
- **Fasting Discipline** (single, optional): `Strict Fast` · `Wine & Oil` ·
  `Fish Allowed` · `Dairy Allowed` · `Fast-Free` · `Varies`
- **Tradition of Observance** validates against the *existing*
  `Tradition of Veneration` term list (no new category).

## The date-token grammar

Every date cell (`Begins`, `Ends`, `Forefeast`, `Apodosis`) holds exactly one
token in one of three forms — this is complete for the Orthodox calendar:

1. **`Mon D`** — fixed date: `Dec 25` (same format the saints CSV uses).
2. **`P+n` / `P-n`** — Pascha-relative offset in days: Pentecost `P+49`,
   Palm Sunday `P-7`, Clean Monday `P-48`. Valid range **−78…+63**
   (Zacchaeus Sunday through the local All-Saints Sundays, the second
   Sunday after Pentecost).
3. **`Dow before Mon D` / `Dow after Mon D`** — weekday-anchored: Sunday of
   the Holy Fathers `Sun before Dec 25`, Demetrius Soul Saturday
   `Sat before Oct 26`. `Dow` ∈ `Mon Tue Wed Thu Fri Sat Sun`. The anchored
   day falls strictly within the 7 days before/after the anchor date.

The **cycle is derived, not authored**: all-fixed tokens ⇒ `fixed`; all-paschal
⇒ `paschal`; a mix (the Apostles' Fast: `Begins=P+57, Ends=Jun 28`) ⇒ `hybrid`.
Weekday-anchored tokens count as fixed-cycle (they resolve from the fixed
calendar). Fixed spans may wrap the civil year (the Nativity fast-free period
Dec 25 → Jan 4), so end-after-begin is not enforced for fixed spans.

`public/feasts.json` emits tokens as structured objects, e.g.
`{"type":"fixed","month":12,"day":25}`, `{"type":"paschal","offset":49}`,
`{"type":"anchored","dow":0,"rel":"before","month":12,"day":25}` (`dow` uses
the JS `getDay()` convention, 0 = Sunday … 6 = Saturday) — the frontend never
re-parses strings.

## Pascha computus — `pascha.py`

Meeus' Julian algorithm mapped to the Gregorian civil calendar (+13 days),
valid 1900–2099, unit-tested against known Orthodox Pascha dates (e.g.
2024-05-05, 2025-04-20, 2026-04-12). Used at build time for validation and to
emit a resolved **Pascha table for 2020–2040** inside `feasts.json`, so the
frontend overlay computes any year's movable dates with trivial arithmetic.
(A TS mirror of the computus is follow-up frontend work.)

## Build integration — `feastlib.py`

A new module at the repo root, imported by `build.py` (which stays the
orchestrator; feastlib owns load / assign-IDs / validate / emit — keeps
build.py from growing past ~1,900 lines). Same fail-loud contract:
`make validate` covers feasts with zero new commands; a violation exits
non-zero and blocks CI/deploy.

Validation:
- exact header; unique IDs; `FF-\d{4,}` format; blank-ID assignment written
  back to the CSV (build is sole numbering authority)
- required fields: Name, Category, Begins, Brief, Sources
- controlled columns against vocabulary (incl. Tradition of Observance →
  Tradition of Veneration terms)
- date-token grammar on all four date columns; day-of-month ranges; paschal
  offset range; field-combination sanity
- cross-refs: Related Saints ids exist in `data/saints.csv`; Related Feasts
  ids exist in `data/feasts.csv` and are not self-references
- `src/content/feasts/*.yaml` filenames/ids cross-checked against feasts.csv
  (the saints-profile pattern)
- duplicate-name warnings

Emission:
- `public/feasts.json` — `{ "feasts": [...], "pascha": {"2020": "2020-04-19", …} }`,
  short stable JSON keys in the saints style (`id`, `name`, `aka`, `category`,
  `dedication`, `begins`, `ends`, `forefeast`, `apodosis`, `fasting`,
  `fastingNotes`, `brief`, `customs`, `observance`, `relatedSaints`,
  `relatedFeasts`, `icon`, `notes`, `sources`)
- a **Feasts & Fasts worksheet** added to `dist/Orthodox_Saints_Database.xlsx`
- unit tests in `tests/` (grammar, computus, ID assignment, each validator),
  running under the existing `make test` CI gate

## Rich prose — the `feasts` content collection

`src/content/feasts/FF-####.yaml`, a second data collection in
`src/content.config.ts`, Zod-validated at build, same
`status: draft|reviewed|flagged` production gate as saint profiles (drafts
render only in dev/previews behind a banner; generated profiles must cite
sources). Feast-shaped schema:

- `id` (`FF-\d{4,}`), `status`, `flagReasons`, `sources`, `generated`,
  `humanReviewed` — identical mechanics to saint profiles
- `overview` (paragraph array, required)
- **`history`** and **`meaning`** — first-class paragraph arrays (the stated
  purpose of the database)
- optional: `timeline` (historical development; same shape as saint profiles),
  `scripture` (`{ref, note?}` readings), `iconography` (paragraphs),
  `fastingPractice` (paragraphs; frontend adds the pastoral disclaimer),
  `customs` (string array), `sections` (generic `{heading, body[]}`),
  `related` (reuses the saints `relatedFigure` shape), `hymnography`
  (paragraphs *describing* the hymns)

**§9 guardrails carry over unchanged:** hymnography is described, never
reproduced from copyrighted translations; customs are church-blessed only;
no fabrication — blanks are honest.

## Research pipeline — `tools/feastgen/`

A profilegen sibling: **gather → write → verify → emit**.

- **Anchor:** the FF CSV row (dates, category, related saints) is the trusted
  seed; external sources (OCA, GOARCH, Wikipedia) add history/meaning.
- **Verify** is adversarial and quotes the draft verbatim against the anchor +
  sources; unsupported claims flag the profile (`status: flagged` with
  `flagReasons`), phantom flags are demoted not dropped.
- **Emit** writes `src/content/feasts/FF-####.yaml` at `status: draft`.
  Drafts never auto-publish; humans promote to `reviewed`.
- Resumable bulk runner + calibration mode, state under `dist/feastgen/`;
  Makefile targets `feast-run`, `feast-batch`, `feast-status`, `feast-stop`.
- This phase: build the pipeline and calibrate on ~5 feasts; the bulk run over
  the catalog is kicked off like the saints one.

## Research & authoring plan (this phase)

The structured CSV (~120–150 rows) is authored now: research agents fan out by
calendar section — (1) Great Feasts + Pascha, (2) fasting seasons + fast days +
fast-free weeks, (3) Triodion cycle, (4) Holy Week + Bright Week,
(5) Pentecostarion cycle, (6) other fixed feasts & observances (Protection,
Circumcision, angelic synaxes, Soul Saturdays, temple feasts of note) — then a
single merge agent authors the CSV with blank IDs; the build assigns IDs;
`make validate` must exit clean.

## Deliverable

One PR on branch `feasts-fasts-db`: data + vocabulary + feastlib + tests +
content-collection schema + feastgen pipeline + CLAUDE.md documentation, with
the Cloudflare Pages preview link. Frontend (calendar overlay, `/feast/FF-####`
pages, TS computus) is the follow-up phase.
