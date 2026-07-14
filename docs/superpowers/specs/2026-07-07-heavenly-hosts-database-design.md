# Heavenly Hosts Database (`HH-####`) — Design Spec

**Date:** 2026-07-07
**Status:** Draft — schema for review (backend + research phase; frontend is a follow-up)

## Purpose

A **third** structured database, sibling to Saints (`OS-####`) and Feasts & Fasts
(`FF-####`), cataloguing the **heavenly hosts** — the angelic ranks, the named
archangels, and the individual angels of Scripture and Tradition — so the site can
carry the **theology, history, and iconography** of the bodiless powers alongside the
saints. Angels are deliberately *excluded* from `data/saints.csv` (CLAUDE.md §7) and
their feasts live in `data/feasts.csv`; this database is where the beings themselves
become first-class, browsable records.

- **The value is encyclopedic depth on a small, closed catalogue.** Unlike the saints
  (thousands of rows, breadth-first), the heavenly hosts are a *bounded* set — the nine
  Dionysian ranks, a handful of named angels, and the discrete scriptural
  appearances. Each entry can therefore be **deep**: overview, historical context,
  Orthodox/patristic interpretation, liturgical tradition, role in salvation history,
  iconography, and historical influence.
- **The non-negotiable methodological commitment is source-type fidelity.** Every claim
  is tagged by the register it comes from, and these registers are never blurred:
  Holy Scripture · Deuterocanonical Scripture · Holy Tradition · Liturgical Tradition ·
  Patristic Interpretation · Second Temple Literature · Early Christian Literature ·
  Later Tradition. This distinction is structural (a controlled `Primary Source` facet +
  separate scripture / deuterocanonical / extra-biblical reference columns), not merely
  prose.

### Scope

- **Angelic ranks (the nine orders):** Seraphim, Cherubim, Thrones, Dominions, Virtues,
  Powers, Principalities, Archangels, Angels — one row each.
- **Named angels:** Michael, Gabriel, Raphael, and the traditional seven archangels
  (Uriel, Selaphiel, Jegudiel, Barachiel; + Jerahmeel/Jehudiel variants where attested),
  each a row.
- **Scriptural / individual angels:** the discrete angelic appearances, named
  *descriptively by their act* (per the source prompt): "Seraph Who Purified Isaiah,"
  "Angel at the Empty Tomb," "Angel Who Strengthened Christ," "Destroying Angel of
  Egypt," "Angel Who Freed Peter," "Angel Who Struck Herod."
- **Angelic classes / functions:** Guardian Angel, the Angel of the Lord (as a
  distinct theophanic category), the Angel of a Nation/Church.
- **Collectives:** named synaxes or clusters (e.g. the Cherubim guarding Eden as a
  group) where the members are undifferentiated.

**Open scope decision — the fall.** Whether to include Satan/Lucifer and the fallen
angels as clearly-marked `Fallen` records (the fall is integral to the
salvation-history arc every entry references) or to keep this database strictly to the
*holy* hosts. Recommendation: **include a small, explicitly-marked fallen set** at low
priority, because "role in salvation history" (Creation → **Fall** → …) is incoherent
without it — but flagged for the owner's call.

- **Calendar convention:** feast dates as kept on the New (Revised Julian) calendar,
  matching the saints/feasts convention (e.g. Synaxis of the Archangels, Nov 8).

## Source of truth — `data/heavenly_hosts.csv` (19 columns)

One row per entity. Opaque, permanent `HH-####` IDs (4+ digits, zero-padded, never
reused/renumbered); blank IDs assigned sequentially by the build and written back — the
build is the sole numbering authority, exactly as for saints/feasts. Multi-value cells
use `"; "`. CRLF line endings like the other CSVs.

> **The CSV holds the structured spine + a Brief; all rich prose lives in the
> `hosts` content collection** (`src/content/hosts/HH-####.yaml`) — exactly the
> saints/feasts split (facets in CSV, `overview`/sections in YAML). The full mapping of
> the source dossier's 30 fields onto CSV-vs-YAML is in the table below; **nothing is
> dropped.**

| # | Column | Kind | Notes |
|---|--------|------|-------|
| 1 | Host ID | key | `HH-####` (HH = Heavenly Hosts); blank → build assigns |
| 2 | Name | free, required | e.g. `Seraphim`, `Michael the Archangel`, `Angel Who Freed Peter` |
| 3 | Also Known As | free, multi | alternate names, transliterations, alternate spellings (`Mikha'el`; `Sabaoth`) |
| 4 | Entity Type | controlled, single, required | `Angelic Rank` · `Named Angel` · `Scriptural Angel` · `Angelic Class` · `Collective` (· `Fallen` — pending scope) |
| 5 | Celestial Order | controlled, single, optional | which of the nine Dionysian ranks; blank if unknown/N-A. **`Triad` is derived from this, not authored.** |
| 6 | Canonical Status | controlled, single, required | attestation strength: `Scriptural` · `Deuterocanonical` · `Traditional` · `Apocryphal` · `Symbolic` |
| 7 | Primary Source | controlled, single, optional | the anchoring **source register** (the 8-term taxonomy) |
| 8 | Scripture References | free, multi | canonical refs, **preserved exactly** — `Isaiah 6:1–7; Revelation 4:8` |
| 9 | Deuterocanonical Sources | free, multi | `Tobit 12:15` |
| 10 | Extra-Biblical Sources | free, multi | `1 Enoch 20; Jubilees 2:2; Shepherd of Hermas` |
| 11 | Feast Day(s) | free, multi | `Nov 8`; parses like the saints' Feast Day(s) when present |
| 12 | Related Feasts | multi | `FF-####` ids; validated against `data/feasts.csv` |
| 13 | Related Saints | multi | `OS-####` ids; validated against `data/saints.csv` |
| 14 | Related Beings | multi | `HH-####` ids; validated; no self-reference |
| 15 | Brief | free, required | 1–3 sentences (the `Brief Life` analog; drives cards + search) |
| 16 | Tags | free, multi | browse facets + search keywords + subgroup labels (`Seven Archangels`, `Bodiless Powers`) |
| 17 | Icon | derived link | leave blank; build derives a Google-Images search URL (as saints/feasts) |
| 18 | Notes | free | anything that doesn't fit a field |
| 19 | Sources | free, multi, required | top-level citations (detailed primary/secondary lists live in the profile) |

### Dossier field → destination map (nothing is lost)

The source prompt's 30 flat fields split cleanly across the CSV spine, the derived JSON,
the `hosts` content collection (prose), and the image join:

| Dossier field | Destination |
|---|---|
| `hh_id` | CSV **Host ID** |
| `entity_name` | CSV **Name** |
| `alternate_names`, `alternate_spellings` | CSV **Also Known As** |
| `entity_type` | CSV **Entity Type** |
| `order` | CSV **Celestial Order** (drives sort) |
| `subgroup` | CSV **Tags** (+ derived **Triad** from Celestial Order) |
| `named` (Yes/No) | **derived** in JSON from Entity Type (`Named Angel` ⇒ true) |
| `profile_type` | **build-stamped** `profileType: "host"` |
| `slug` | **routing** — opaque `/host/HH-####` (see Open Decisions) |
| `canonical_status` | CSV **Canonical Status** |
| `primary_source` | CSV **Primary Source** |
| `scripture_references` | CSV **Scripture References** |
| `deuterocanonical_sources` | CSV **Deuterocanonical Sources** |
| `extra_biblical_sources` | CSV **Extra-Biblical Sources** |
| `overview` | YAML **overview** (required) |
| `historical_context` | YAML **historicalContext** |
| `orthodox_interpretation` | YAML **orthodoxInterpretation** |
| `liturgical_tradition` | YAML **liturgicalTradition** |
| `role_in_salvation_history` | YAML **salvationHistory** (sections: Creation/Fall/OT/Incarnation/Resurrection/Last Judgment) |
| `iconography` | YAML **iconography** |
| `historical_influence` | YAML **historicalInfluence** |
| `related_events` | YAML **related** (event figures) |
| `related_beings` | CSV **Related Beings** (ids) + YAML **related** (prose) |
| `related_pages` | YAML **related** (cross-links) |
| `primary_sources` | YAML **reading** ("Primary Sources") + CSV **Sources** |
| `secondary_sources` | YAML **reading** ("Further Reading") |
| `public_domain_images` | `data/host_images.csv` join (open/PD gate) |
| `feast_day` | CSV **Feast Day(s)** |
| `search_keywords`, `tags` | CSV **Tags** |
| `notes` | CSV **Notes** |
| `has_profile` | **derived** (does `hosts/HH-####.yaml` exist) |
| `image_available` | **derived** (a `host_images.csv` row exists) |

### Controlled vocabulary (new categories in `data/vocabulary.csv`)

- **Entity Type** (single): `Angelic Rank` · `Named Angel` · `Scriptural Angel` ·
  `Angelic Class` · `Collective` (· `Fallen`, pending scope decision).
- **Celestial Order** (single): `Seraphim` · `Cherubim` · `Thrones` · `Dominions` ·
  `Virtues` · `Powers` · `Principalities` · `Archangels` · `Angels`. **`Triad` is
  derived** (First = Seraphim/Cherubim/Thrones; Second = Dominions/Virtues/Powers;
  Third = Principalities/Archangels/Angels) — never authored, mirroring the feasts'
  derived `cycle`.
- **Canonical Status** (single): `Scriptural` (named/depicted in canonical Scripture) ·
  `Deuterocanonical` (e.g. Raphael in Tobit) · `Traditional` (Holy/Liturgical Tradition —
  e.g. the four archangels beyond the three named) · `Apocryphal` (only in
  non-canonical literature) · `Symbolic` (a rank/category, not an individual).
- **Host Source Type** (single — the `Primary Source` register): `Holy Scripture` ·
  `Deuterocanonical Scripture` · `Holy Tradition` · `Liturgical Tradition` ·
  `Patristic Interpretation` · `Second Temple Literature` · `Early Christian Literature` ·
  `Later Tradition`.

## Derived JSON (never authored)

`public/hosts.json` short stable keys (saints style): `id`, `name`, `aka`,
`entityType`, `order`, `triad` (derived), `canonicalStatus`, `primarySource`,
`scripture`, `deuterocanonical`, `extraBiblical`, `feasts`, `relatedFeasts`,
`relatedSaints`, `relatedBeings`, `brief`, `tags`, `icon`, `notes`, `sources`,
`named` (derived bool), `profileType` (`"host"`), `hasProfile`, `imageAvailable`.
Records sort by the celestial hierarchy (Seraphim → Angels), then named angels within
their order, then scriptural angels, then classes/collectives — a `_sort_key` mirroring
feasts' fixed-then-paschal ordering.

## Build integration — `hostlib.py`

A new module at the repo root, imported by `build.py` (the orchestrator; `hostlib` owns
load / assign-IDs / validate / emit — a faithful mirror of `feastlib.py`). Same
fail-loud contract: `make validate` covers hosts with **zero new commands**; a violation
exits non-zero and blocks CI/deploy.

Validation:
- exact header; unique IDs; `HH-\d{4,}` format; blank-ID assignment written back
- required fields: Name, Entity Type, Canonical Status, Brief, Sources
- controlled columns against the new vocabulary categories
- `Entity Type = Angelic Rank` ⇒ Celestial Order must equal the Name (a rank *is* its
  order); `Celestial Order` set ⇒ derives `Triad`
- Feast Day(s) parse via the saints' existing date parser when present
- cross-refs: Related Saints ids exist in `saints.csv`; Related Feasts ids exist in
  `feasts.csv`; Related Beings ids exist in `heavenly_hosts.csv` and are not
  self-references
- `src/content/hosts/*.yaml` filenames/ids cross-checked against `heavenly_hosts.csv`
  (the saints/feasts profile pattern)
- duplicate-name warnings
- **image join** `data/host_images.csv` reuses the saints' licensing gate verbatim
  (`PD`/`PD-art`/`PD-old`/`CC0`/`CC-BY*`/`CC-BY-SA*`; file must exist under `static/`) —
  angel icons are overwhelmingly public-domain, so this is the common case.

Emission:
- `public/hosts.json` — `{ "hosts": [...] }`
- a **Heavenly Hosts worksheet** added to `dist/Orthodox_Saints_Database.xlsx`
- unit tests in `tests/` (ID assignment, each validator, triad derivation, rank/order
  consistency), running under the existing `make test` CI gate

## Rich prose — the `hosts` content collection

`src/content/hosts/HH-####.yaml`, a third data collection in `src/content.config.ts`,
Zod-validated at build, same `status: draft|reviewed|flagged` production gate as saint
profiles (drafts render only in dev/previews behind a banner; generated profiles must
cite sources). Host-shaped schema:

- `id` (`HH-\d{4,}`), `status`, `flagReasons`, `sources`, `generated`, `humanReviewed`
  — identical mechanics to saint/feast profiles
- `overview` (paragraph array, required)
- **`historicalContext`**, **`orthodoxInterpretation`**, **`liturgicalTradition`**,
  **`iconography`**, **`historicalInfluence`** — first-class paragraph arrays (the
  dossier's Main Content axes)
- **`salvationHistory`** — `{heading, body[]}` sections (Creation / Fall / Old Testament /
  Incarnation / Resurrection / Last Judgment); reuses the generic sections shape
- `scripture` (`{ref, note?}[]`) — reuses the feasts' scripture shape, tagged by register
- `related` (reuses the saints `relatedFigure` shape) — related events / beings / pages
- `reading` (`{heading, items[]}`) — Primary Sources / Further Reading
- `sections` (generic `{heading, body[]}`) — anything else

**§9 guardrails carry over unchanged:** hymnography/troparia are *described*, never
reproduced from copyrighted translations; images public-domain/openly-licensed only; the
source-register distinctions above are preserved, not blurred; **no fabrication** —
blanks are honest, and speculative material from Second Temple / apocryphal literature is
always tagged as such, never presented as the Church's teaching.

## Frontend (follow-up phase)

- `/host/HH-####` per-entity pages (parallel to `/saint/OS-####`), a browse index
  (by rank / triad), and a calendar overlay for the angelic synaxes.
- Heavenly Hosts records flow into `public/hosts.json` and a browse/search surface, but
  are **excluded from the patron-saint quiz** (angels are venerated but the quiz scores
  intercessor-saints) — the same carve-out groups get.
- `withBase()` for every internal URL, `BaseLayout` SEO/OG for free.

## Open decisions (need the owner's call before implementation)

1. **Fallen angels in scope?** Include a small, clearly-marked `Fallen` set (recommended
   — the salvation-history arc needs the Fall) or exclude entirely for v1.
2. **Canonical Status vocab** — confirm the 5 terms
   (`Scriptural`/`Deuterocanonical`/`Traditional`/`Apocryphal`/`Symbolic`).
3. **Routing/slug** — opaque `/host/HH-####` (recommended, matches §6's permanent-ID
   philosophy and the `/saint//feast` pattern) vs. human-readable slugs like the retired
   `/group/<slug>` scheme.
4. **Column/route noun** — `Host ID` + `/host/…`, or prefer `/angel/…`? (Not every entity
   is an "angel" — the ranks and collectives aren't — so `host` is the more accurate
   umbrella.)
5. **Discovery surface** — a dedicated Heavenly Hosts browse section (recommended) vs.
   folding angels into the existing saint finder. Either way: excluded from the quiz.

## Deliverable (on approval)

One PR on a dedicated branch `heavenly-hosts-db` off `main` (kept entirely separate from
the in-progress relationship-network work): `data/heavenly_hosts.csv` + vocabulary +
`hostlib.py` + build.py wiring + tests + the `hosts` content-collection schema +
`data/host_images.csv` join + CLAUDE.md documentation (a new §5b), with the Cloudflare
Pages preview link. A `hostgen` research pipeline (a profilegen/feastgen sibling) and the
frontend pages are follow-up phases; the initial catalogue is small enough (~30–40 rows)
to author by hand-mapping the dossiers.
```
