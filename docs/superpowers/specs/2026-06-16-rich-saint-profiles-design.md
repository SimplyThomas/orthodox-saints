# Rich Saint Profiles — Design Spec (Feature A)

**Date:** 2026-06-16
**Status:** Proposed — awaiting user review
**Showcase target:** St. Basil the Great (`OS-0021`)
**Relationship to other work:** Feature A of two. Feature B (system-wide *Thematic
Browsing* — derived `themes` on every saint, `/themes` landing + per-theme listings,
badges on all saints, theme-based related saints, NL search aliases) is **out of scope
here** and gets its own spec. The two overlap only at the saint-page theme badges; this
spec keeps Basil's badges forward-compatible with Feature B (see §7).

---

## 1. Goal

Let a small number of high-traffic saints carry a **comprehensive, encyclopedic profile**
(expanded biography, timeline, family, contributions, legacy, works, further reading,
patronage, theme badges) **without** changing the data model for the other ~2,736 saints,
and **without** altering the established visual identity. Basil becomes the first such
profile.

Tone for all editorial prose: **factual, reverent, encyclopedic. No devotional language,
no prayers, no unverifiable claims, original wording (never copied from a source).**

## 2. Why a profile layer (not new CSV columns)

`data/saints.csv` is the finder/facet source of truth (26 columns, one row per saint) and
is deliberately terse — `Brief Life` is one to three sentences, `Notes` a single paragraph.
Multi-paragraph biographies, timelines, and legacy essays do not belong in CSV cells.

The repo **already solved this** for the Witnesses section: `src/lib/ephraim.ts` defines
rich types (`TimelineEntry`, `RelatedFigure`, `Work`, `BookAbout`, `Quote`), `witnesses.ts`
carries an optional `overview: string[]`, and `WitnessProfile.astro` renders a comprehensive
profile **only when the rich data is present**, falling back to a simple template otherwise.

Feature A mirrors that pattern for **canonical** saints. This honors "maintain the existing
layout and styling" (we reuse the same components, style tokens, and section idioms) and
keeps the change isolated (one new data module + one new component + a conditional in
`SaintView.astro`).

## 3. Architecture

```
data/saints.csv ──► build.py ──► public/data.json ──► SaintView.astro (unchanged for all
                                                       saints WITHOUT a profile)
src/lib/saint-profiles.ts (NEW) ── SAINT_PROFILES[id] ──► SaintProfile.astro (NEW)
                                                       └─► rendered by SaintView ONLY when
                                                           SAINT_PROFILES[saint.id] exists
```

- **`src/lib/saint-profiles.ts`** (new) — `export const SAINT_PROFILES: Record<string, SaintProfile>`,
  keyed by Saint ID. Imports and reuses `TimelineEntry`, `RelatedFigure`, `Work`, `BookAbout`
  from `./ephraim`. Defines one new small type, `ProfileSection` (see §4).
- **`src/components/SaintProfile.astro`** (new) — renders the profile-only sections, modeled
  on `WitnessProfile.astro` but using the **canonical** saint visual idiom (`SaintView`'s
  `.sv-section` / `.eyebrow` / `.tag` / `.rule`). Receives the `SaintProfile` record + the
  `Saint` (for the family/related href resolution helper).
- **`src/components/SaintView.astro`** (edit) — after the existing `brief` lead, look up
  `SAINT_PROFILES[saint.id]`; if present, render `<SaintProfile .../>`. The conditional
  mirrors the existing `m.quote && (...)` blocks. Saints without a profile are byte-for-byte
  unchanged.
- **`data/saints.csv` / `data/saint_quotes.csv`** — Basil's row enriched only within existing
  fields (§6); one PD quote added (§5).

No `build.py` schema change. No `data.json` shape change. No new vocabulary terms. The
profile layer is a build-time TS import, identical in spirit to `witnesses.ts`.

## 4. Data model

```ts
// src/lib/saint-profiles.ts
import type { TimelineEntry, RelatedFigure, Work, BookAbout } from "./ephraim";

/** A headed block of prose — for Major Contributions, Legacy, "Why the Great". */
export interface ProfileSection {
  heading: string;
  body: string[];          // one entry per paragraph
}

export interface SaintProfile {
  id: string;              // Saint ID, must match a row in saints.csv
  /** Expanded biography — one entry per paragraph. Presence is what triggers the rich render. */
  overview: string[];
  /** Optional rail/header epithet context, e.g. "c. 329 – 379 · Archbishop of Caesarea". */
  lifespan?: string;
  /** Curated relation set — "Holy Family of Cappadocia" etc. RelatedFigure.note = relation. */
  family?: { heading: string; figures: RelatedFigure[] };
  /** Major Contributions, Legacy, "Why He Is Called 'the Great'" — rendered in order. */
  sections?: ProfileSection[];
  timeline?: TimelineEntry[];
  works?: Work[];          // Notable Works (title + desc) — supersedes the plain CSV list
  reading?: { heading: string; items: BookAbout[] }[];  // Further Reading, grouped
  patronage?: string[];    // display chips (editorial, NOT controlled vocab)
  themes?: string[];       // theme badges (editorial labels; see §7 for linking)
  /** Curated "Related Saints" links (distinct from family); resolved to /saint/OS-####. */
  related?: RelatedFigure[];
}

export const SAINT_PROFILES: Record<string, SaintProfile> = {
  "OS-0021": { /* Basil — see Appendix A */ },
};
```

**Content-to-type mapping (the requested Basil sections):**

| Requested section | Field |
|---|---|
| Expanded Biography | `overview` |
| Holy Family of Cappadocia | `family` (`RelatedFigure[]`, note = grandmother/sister/brother) |
| Major Contributions (4 sub-blocks) | `sections` |
| Liturgical Legacy (the Divine Liturgy dates) | a `ProfileSection` within `sections` |
| Timeline | `timeline` |
| Patronage | `patronage` |
| Notable Works by Saint Basil (title + description) | `works` (`Work.desc`) |
| Further Reading (Ancient Sources / Modern Studies) | `reading` (two groups) |
| Famous Quotations | **one** PD quote via `saint_quotes.csv` (§5) — *not* the profile |
| Related Saints | `related` |
| Legacy (Theology/Monasticism/Liturgical/Charity/Education) | `sections` |
| Why He Is Called "The Great" | a `ProfileSection` |
| Thematic Browsing tags | `themes` (§7) |

## 5. The quote (guardrail-compliant)

The build allows **one** quote per saint, transcribed verbatim from a **public-domain**
translation (§9/§5 of CLAUDE.md). Of Basil's three requested quotations, the two
"belongs to the hungry / belongs to the one who needs it" lines circulate chiefly in
**modern, in-copyright** translations (Schroeder/SVS) — excluded. The creation/admiration
line is from the **Hexaemeron (Homily V)**, which exists in a **public-domain** English
translation in **NPNF series 2, vol. 8** (CCEL).

Action: add one row to `data/saint_quotes.csv` for `OS-0021`, transcribing the exact NPNF2-08
Hexaemeron wording (fetch from CCEL; do **not** paraphrase the user's loose rendering):
`saint_id=OS-0021`, `work=Hexaemeron`, `locus=Homily V`, `translation=NPNF2`,
`source_url=https://www.ccel.org/ccel/schaff/npnf208 ...` (exact page). The build's PD gate
(`NPNF2`) passes.

## 6. Basil CSV enrichment (within existing fields only)

Edit row `OS-0021` in `data/saints.csv` (preserve CRLF line endings, per repo convention):

- **Works by the Saint** — expand to: `On the Holy Spirit; Against Eunomius; Hexaemeron;
  the Longer Rules; the Shorter Rules; Address to Young Men on the Right Use of Greek
  Literature; Homilies on the Psalms; Letters` (rendered as title→search links; the rich
  `Work` table with descriptions comes from the profile and supersedes this on Basil's page).
- **Works About the Saint** — currently empty; the rich Further Reading comes from the
  profile, so this CSV field may stay empty or hold a couple of plain titles for non-profile
  fallback. (Editorial choice; default: leave the rich list to the profile.)
- **Sources** — expand `Synaxarion` to include OCA, GOARCH, New Advent, CCEL/NPNF, Rousseau,
  Hildebrand (the exact URLs the user supplied).
- **Facets** — leave controlled-vocab facets essentially as-is; only adjust if a value is
  clearly supported and within `vocabulary.csv`. Patronage labels (Theologians, Educators,
  Hospital workers, …) live in the profile `patronage`, **not** the CSV (they are not all
  controlled-vocab terms, and the profile layer carries no vocab constraint).

`make validate` must stay clean; `make build` regenerates `public/data.json`.

## 7. Theme badges — forward-compatible with Feature B

`profile.themes` is a list of **editorial labels** (e.g. "Church Fathers", "Three Holy
Hierarchs", "Defenders of Orthodoxy", "Monasticism", "Patristics"). In Feature A:

- Render each as a `.tag`-style badge in a "Themes" block.
- A badge whose label maps to a real, useful query links to `withBase("search") + "?q=" +
  encodeURIComponent(label)` (the finder island already accepts a `?q=` seed). Labels with
  no meaningful match render as **plain (non-link) badges** rather than producing empty
  search results.
- When **Feature B** lands, the badge hrefs are repointed to `/themes/<slug>` in one place
  (`SaintProfile.astro`), and the editorial labels are reconciled against the theme taxonomy.
  No data rework on the profile.

This satisfies "badges should be clickable" today without shipping dead `/themes/...` 404s.

## 8. Rendering order in `SaintProfile.astro`

Within `SaintView`'s main column, after the `brief` lead and before the existing
intercessions block (or after it — implementer's call to keep visual rhythm), render:

1. **Life** — `overview` paragraphs.
2. **Timeline** — `timeline` (reuse the Ephraim timeline visual idiom).
3. **Major Contributions** — `sections` flagged as contributions.
4. **Holy Family of Cappadocia** — `family` (linked `RelatedFigure`s).
5. **Legacy** + **Why He Is Called "the Great"** — remaining `sections`.
6. **Patronage** — `patronage` chips.
7. **Themes** — `themes` badges (§7).
8. **Notable Works** — `works` table (title + description).
9. **Further Reading** — `reading` groups (Ancient / Modern).
10. **Related Saints** — `related` links.

The existing CSV-driven blocks (intercessions, life experience, quote, customs, sources,
hymn/icon/video links) continue to render from `SaintView` as today. Profile `works`/
`reading` supersede the plain CSV Works/About rendering **for profiled saints only**.

## 9. RelatedFigure / family href resolution

`RelatedFigure.href` should point to `/saint/OS-####` (via `withBase`) when that family member
exists as a canonical row, else use `external` or omit. **Verify each ID against the row's
Name before hardcoding** (grep-derived IDs are often off by one or two — repo convention).
Candidates to resolve: Gregory the Theologian, Gregory of Nyssa, Macrina the Younger,
Peter of Sebaste, John Chrysostom, Macrina the Elder, Naucratius. Members absent from the DB
(likely Naucratius, possibly Macrina the Elder) render as plain names or `external` refs.

## 10. Testing & verification

- `make validate` clean; `make build` succeeds; `public/data.json` record count unchanged.
- `make web-lint` and `make web-build` green.
- **New Playwright e2e** (`e2e/`) loading `/saint/OS-0021` asserting the rich sections render:
  the "Life" biography, the timeline, "Holy Family of Cappadocia" with at least one internal
  saint link, "Further Reading", and the quote block. A spot check that a **non-profiled**
  saint page (e.g. any other ID) is unchanged / renders no profile sections.
- Manual: visually confirm the profile matches the existing style (palette, type, rules).

## 11. Guardrails (restated, binding)

- Original encyclopedic prose; **no copying** from OCA/GOARCH/New Advent/etc. — adapt facts
  into our own wording.
- No devotional language or prayers in profile prose; the liturgical Short Prayer stays in its
  existing CSV field / address slot as for any canonical saint.
- One PD-translated quote only (§5); no in-copyright translations.
- Every factual claim sourced; Basil's content is historically standard and verifiable.
- Clergy/source review still applies before launch (standing caveat).

## 12. Out of scope (→ Feature B, separate spec)

System-wide derived `themes`; `/themes` landing + `/themes/[slug]` listings; the "Browse by
Theme" nav item; theme badges on **all** saints; theme-based "related saints" across the
whole DB; NL search aliases. Feature A ships only the per-saint rich profile layer + Basil.

---

## Appendix A — Basil profile content (author-ready)

The implementer enters the following as `SAINT_PROFILES["OS-0021"]`, rewritten in original
encyclopedic wording (the user's draft is the factual basis, not text to copy verbatim).

- **lifespan:** `c. 329 – 379 · Archbishop of Caesarea in Cappadocia`
- **overview:** the expanded biography, ~5 paragraphs (education in Caesarea/Constantinople/
  Athens with Gregory the Theologian; ascetic travels through Egypt/Palestine/Syria/
  Mesopotamia and his monastic principles; consecration in 370 and defense of Nicene faith
  against Arianism; the Basiliad charitable complex; prolific writer/preacher and the Liturgy
  bearing his name; repose 1 Jan 379; one of the Three Holy Hierarchs).
- **family** (`Holy Family of Cappadocia`): Macrina the Elder (grandmother), Macrina the
  Younger (sister), Gregory of Nyssa (brother), Peter of Sebaste (brother), Naucratius
  (brother) — with a note that Basil belonged to one of the most remarkable saintly families
  in Christian history. Resolve internal hrefs per §9.
- **sections** (Major Contributions): Defender of Nicene Orthodoxy; Theology of the Holy
  Spirit; Founder of Organized Christian Charity; Father of Eastern Monasticism; Liturgical
  Legacy (with the Divine Liturgy of St Basil dates: Sundays of Great Lent; Eve of Nativity
  when appointed; Eve of Theophany when appointed; Holy Thursday; Holy Saturday; Jan 1).
- **timeline:** 329 born; 356 ascetic life; 364 ordained presbyter; 370 consecrated
  archbishop; 375 completed *On the Holy Spirit*; 379 reposed.
- **patronage:** Monastics; Theologians; Educators; Hospital workers; Charitable ministries;
  Social service organizations.
- **works** (`Work[]`, title + desc): On the Holy Spirit; Against Eunomius; Hexaemeron;
  Longer Rules; Shorter Rules; Address to Young Men on the Right Use of Greek Literature;
  Homilies on the Psalms; Letters — descriptions per the user's table.
- **reading** (two groups): *Ancient Sources* — Gregory the Theologian, *Funeral Oration on
  Basil*; Gregory of Nyssa, *Life of Macrina*; Socrates Scholasticus / Sozomen / Theodoret,
  *Ecclesiastical History*. *Modern Studies* — Rousseau; Hildebrand; Schroeder (ed.), *On
  Social Justice*; *On the Human Condition* (Popular Patristics); *The Ascetical Works of
  Saint Basil*.
- **sections** (Legacy): Theology; Monasticism; Liturgical Life; Christian Charity; Education;
  and "Why He Is Called 'the Great'" — adapted from the user's draft into original prose.
- **themes:** Theology; Church Fathers; Three Holy Hierarchs; Cappadocian Fathers;
  Monasticism; Christian Charity; Bishops; Defenders of Orthodoxy; Patristics; Education
  (plus the secondary/finder labels as space allows). Linking per §7.
- **related:** Gregory the Theologian; Gregory of Nyssa; Macrina the Younger; Peter of
  Sebaste; John Chrysostom — internal `/saint/OS-####` links per §9.

Quote (separate, `saint_quotes.csv`): the Hexaemeron Homily V "admiration of creation"
passage, exact NPNF2-08 wording (§5).
