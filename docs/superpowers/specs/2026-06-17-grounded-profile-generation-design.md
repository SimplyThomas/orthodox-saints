# Grounded Profile Generation at Scale — Design Spec

**Date:** 2026-06-17
**Status:** Proposed — awaiting user review
**Area:** Authoring pipeline + data storage (`src/lib/saint-profiles.ts` / profile
storage), `build.py` validation, an authoring workflow. No change to the profile
*rendering* path.
**Builds on:** [Rich Saint Profiles (Feature A)](2026-06-16-rich-saint-profiles-design.md)
— that spec defined the `SaintProfile` schema, `SaintProfile.astro` rendering, and the
encyclopedic-prose guardrails. This spec reuses all of it unchanged and adds **how
profiles get authored at scale** plus **where they live when there are thousands of them**.

---

## 1. Problem

Feature A gave canonical saints a rich, encyclopedic profile layer (`SAINT_PROFILES` in
`src/lib/saint-profiles.ts`), but authoring is manual: the user feeds ChatGPT write-ups
(5–15 at a time), which are rewritten into house voice, mapped to the `SaintProfile`
interface, and cross-checked against the trusted CSV row. At **23 profiles out of 2,738
saints (~0.8%)**, this will not reach the corpus. The goal is full narrative coverage —
the relatable human detail ("buried apart, miraculously reunited"), not a sterile fact
line — and that is bottlenecked on a manual, off-repo generation step.

Two things the 23-profile manual approach never had to solve, and which this spec
addresses:

1. **Generation at scale** — replace the manual ChatGPT step with an **in-repo grounded
   pipeline** that fetches real sources, writes original profiles in the existing shape,
   and **formalizes the fabrication control** the user currently does by hand.
2. **Storage at scale** — `saint-profiles.ts` is one 2,926-line module at 23 profiles;
   thousands of profiles cannot live in a single TS file.

## 2. Non-goals

- **No change to the `SaintProfile` schema or rendering** (Feature A owns those). New
  fields are limited to authoring/provenance metadata (§6).
- **No relicensing.** CC0 is preserved — all prose is original expression of
  uncopyrightable facts. This was the resolution of the OrthodoxWiki/GFDL question that
  prompted this work.
- **No copying** of source wording, ever (CLAUDE.md §9). Sources are fact references.
- Not a fully autonomous "generate all 2,700 and merge" run. Output lands in
  **PR-sized, human-reviewed batches**, like the existing enrichment sprints.

## 3. The grounded generation pipeline

A per-saint pipeline, batched and resumable, reusing the spine-walk / enrichment-sprint
subagent patterns. Four stages per saint:

1. **Gather** — fetch real source text per the tiered fetch list (§4) into a *cited
   dossier*: each extracted fact tagged with its source URL. No prose written yet.
2. **Write** — an agent produces a `SaintProfile` object (`overview`, `timeline`,
   `sections`, `family`, `related`, `patronage`, `works`, `reading`) in the established
   **factual/encyclopedic house voice** (Feature A §1). Hard rules:
   - Every concrete claim must trace to the dossier.
   - **Thin dossier → write less, never embellish.** A short overview is acceptable; an
     invented miracle is not.
   - Relatable human detail is allowed and encouraged **only where a source carries it**,
     and **hedged as tradition** ("by tradition…", "the synaxarion relates…") where the
     source itself hedges.
3. **Verify (adversarial, formalized)** — a separate agent checks each claim against:
   - **(a) the trusted CSV row** — the OCA-spine `Brief Life`/`Notes` is the anchor;
     **the row wins on conflict** (this is the rule the user discovered by hand — see the
     PR #165 Zosimus & Athanasius fabrication catch), and
   - **(b) the dossier** — anything unsupported is flagged.
   It also flags the **tell-tale hedging that signals fabrication** ("most likely 8th or
   9th century," "sources do not clearly identify"). Output: `pass` or `flagged` + the
   offending claims.
4. **Emit** — write the profile entry with provenance metadata (§6) and **additive
   controlled-vocab facet enrichment** of the CSV row (only terms that exist in
   `data/vocabulary.csv`; never force a term). `flagged` profiles are written with
   `status: flagged` and surfaced for human fixing — never auto-promoted.

This is the deep-research adversarial-verify pattern applied per saint; the verifier's
job is to *refute*, defaulting to "flag" when uncertain.

## 4. Tiered fetch list

Sources are ordered by role. The pipeline fetches the anchor first, then enrichment, then
tradition-specific sources as the saint's facets indicate (region / era / tradition of
veneration). **Everything here is used as a *fact reference* only** — copyright is
irrelevant to fact extraction; PD sources additionally double as quote-eligible.

### Tier 0 — Anchor (trusted, conflict-wins)
- **OCA Synaxarion / Lives of the Saints** (oca.org) — already ~84% of rows; the spine.
  The CSV row derived from it is the verification anchor (§3.3a).

### Tier 1 — Narrative enrichment (the relatable detail)
- **Prologue of Ohrid** (St Nikolai Velimirović) — concise, vivid, story-driven,
  pan-Orthodox; the single best source for relatable detail. (English translations likely
  in-copyright → fact reference only, **not** verbatim quotes.)
- **Mystagogy / John Sanidopoulos** (johnsanidopoulos.com, mystagogyresourcecenter.com)
  — already a frequent cross-check source.
- **OrthoChristian / Pravoslavie.ru** (English) — strong on the **Russian New-Martyr tail
  and modern elders**, where the OCA anchor is thin.
- **OrthodoxWiki** (orthodoxwiki.org) and **Wikipedia** (en.wikipedia.org) — broad
  cross-check; note both blend history with pious legend (treat as enrichment, not anchor).

### Tier 2 — Tradition-specific (selected by the saint's region/tradition)
- **GOARCH calendar** (goarch.org) and **Saint.gr / Μέγας Συναξαριστής** (Greek-language;
  flag translation in provenance) — Greek saints / the outstanding GOARCH merge.
- **Romanian cluster** — Basilica.ro, Doxologia.ro, Synaxar of the Romanian Saints
  (sfintiromani.ro), Orthodox Times.
- **Butler's Lives of the Saints** (older **PD** editions) — narrative for **pre-schism
  Western** saints (the Roman Martyrology / "Latin Saints of Orthodox Rome" cluster);
  PD, so also quote-eligible.
- **Official glorification / canonization acts** (Ecumenical Patriarchate, Romanian,
  Serbian, Georgian, Bulgarian, Antiochian, Alexandrian) — for modern saints' facts and
  canonization status (relevant to the §9 canonization-caution guardrail).

### Tier 3 — Verification / scholarly (cross-check only)
- **New Advent Catholic Encyclopedia** (PD) — ancient/Western saints.
- Ancient church historians where relevant (Eusebius, Socrates Scholasticus, Sozomen,
  Theodoret) and academic monographs — chiefly for the highest-traffic Fathers, as in the
  existing Basil profile.

### PD quote tier (unchanged, gated)
Quotes remain governed by `saint_quotes.csv` and its PD gate: **KJV / Wikisource** for
scriptural figures, **NPNF / ANF via CCEL** for the Fathers. The generation pipeline does
**not** write quotes; it may *propose* a PD-sourced quote row for human review.

### Do NOT fetch
- **Great Synaxaristes** (Holy Apostles Convent) — richest narrative lives, but **not
  freely online**; remains a *human* enrichment reference, not a pipeline fetch.
- **Acta Sanctorum / Bollandist** — too heavy/Latin for automated use.
- **Any Oriental Orthodox (non-Chalcedonian) source** — Coptic, Armenian Apostolic,
  Syriac Orthodox, Ethiopian, etc. **Out of scope** per CLAUDE.md §1. The pipeline must
  not pull biographical facts from these even when they cover a same-named figure.

## 5. The source-logging rule (data-driven expansion)

The fetch list is **principled-now, reactive-after**. Rather than wiring up every
tradition's source speculatively, the pipeline **logs coverage** so gaps direct the next
expansion — the same self-directing logic as `make report` for icons:

- For every saint, the Gather stage records, to a run log (git-ignored, under `dist/`):
  `saint_id`, `name`, region/tradition facets, **which tier(s) returned usable text**, the
  **dossier size**, and a **coverage verdict**: `full` (enough for a real profile),
  `thin` (degraded to a short grounded overview), or `none` (no fetchable source → no
  profile written; CSV `Brief Life` continues to show).
- The run prints a **thin/none summary** grouped by region/tradition. A cluster of `thin`
  Georgian or Serbian saints is the explicit signal to add that tradition's source to
  Tier 2 next — **never** silently leave them faked or silently dropped.
- **No silent caps:** any prioritization, batch limit, or skipped saint is logged. A saint
  with `none` coverage is reported, not hidden.

This makes the source list grow from evidence, and guarantees that a thin evidence base
produces a short honest profile (or none), never a fabricated one.

## 6. Provenance & review metadata (the only schema addition)

Machine-generated profiles need a clearer review signal than hand-curated batches did. Add
authoring metadata to the profile record (rendering ignores it; it gates promotion):

```ts
// added to SaintProfile (Feature A schema otherwise unchanged)
status?: "draft" | "reviewed" | "flagged"; // default "draft" for generated profiles
sources?: string[];      // provenance URLs the dossier drew on (per §4)
generated?: string;      // ISO date stamp (passed in; not Date.now())
```

- **`status`** — generated profiles land as `draft`; `flagged` marks a verifier-caught
  problem for human fixing; a human promotes to `reviewed`. Hand-authored Feature-A
  profiles (e.g. Basil) are `reviewed`.
- **Production gate (§9 — not authoritative until clergy-reviewed):** the production build
  renders **only `reviewed`** profiles by default; `draft`/`flagged` render in
  `make serve`/dev behind a small "Draft — pending review" disclaimer so the review
  workflow works, but do not reach the public site. A single build flag flips this if the
  user later decides drafts may ship with a disclaimer. **(Open decision — see §10.)**

## 7. Storage at scale

`saint-profiles.ts` as one module does not scale to thousands of profiles. **Recommended:
split to per-saint files with a generated index.**

```
data/profiles/OS-0021.ts      (or .json)   — one SaintProfile per file
data/profiles/OS-0192.ts
...
src/lib/saint-profiles.ts                  — GENERATED barrel: imports/aggregates all
                                             per-saint files into SAINT_PROFILES
```

- **Per-saint files** keep diffs reviewable (clergy can read/edit one saint's profile as a
  normal file), keep PRs small, and avoid a 100k-line monolith.
- **The barrel is generated**, not hand-edited, so adding a profile = adding one file.
- Rendering is unchanged: `SaintView.astro` still imports `SAINT_PROFILES` and looks up by
  ID. The 23 existing profiles migrate into per-saint files as part of this work.
- Alternatives considered: (a) keep one module — rejected (monolith); (b) move profiles to
  a build-time JSON data join consumed like `public/data.json` — viable and possibly better
  for very large N, but loses TS typing at author time and is a bigger departure from
  Feature A. **(Open decision — see §10.)**

## 8. Authoring workflow

Mirrors the enrichment-sprint / spine-walk conventions (persist intermediate results to
file; validated CRLF-preserving CSV merges; branch each batch from fresh `origin/main`):

1. **Prioritize** — rank uncovered saints by finder value (intercession/facet richness,
   traffic) — reuse the `make report` ranking idea. Generate highest-value first.
2. **Run the pipeline** on a PR-sized batch (e.g. 15–40 saints). Each saint: Gather →
   Write → Verify → Emit per-saint profile file (`status: draft`/`flagged`) + additive
   CSV facet enrichment.
3. **Human review** — read the batch (especially `flagged`), fix or reject, verify
   contested facts against a web source and fix **both** the profile and the CSV row when
   they disagree (per the existing cross-check convention). Promote good ones to
   `reviewed`.
4. **Validate & verify** — `make validate` clean; `make build`; `npm run lint`;
   `npm run build`; `npm test` (e2e). Preserve CRLF in `saints.csv`.
5. **PR** — note canonization/judgment calls and anything needing clergy review (§9).
   Merge is user-only (production deploy).

## 9. Validation & build integration

- `build.py` gains a `validate_saint_profiles()` pass (mirroring `validate_saint_images` /
  `validate_saint_quotes`): every profile's `id` matches a real saint row; `status` in the
  enum; `sources` non-empty for generated profiles; per-saint file name ↔ `id` agreement;
  the generated barrel is in sync with the files (CI catches a stale barrel). Fails the
  build loudly on violation.
- The production profile set is filtered to `status: reviewed` (§6) at build time.
- e2e: extend the Feature-A profile test to assert a `draft` profile is **absent** from a
  production build and present in dev.

## 10. Open decisions (for user review)

1. **Profile storage (§7):** per-saint TS files + generated barrel (recommended) vs. a
   build-time JSON data join vs. keep the single module (not recommended).
2. **Draft visibility (§6):** production ships **only `reviewed`** (recommended, safest
   under §9) vs. ship `draft` with a visible disclaimer so content appears immediately.
3. **First batch prioritization (§8.1):** finder value (recommended) vs. current
   `Brief Life`-stub gaps vs. strict calendar order.

## 11. Guardrails (restated, binding)

- **CC0 preserved**; original encyclopedic prose only; **no source wording copied** (§9).
- **OCA-spine CSV row is the verification anchor; the row wins on conflict** (§3.3a).
- **Thin evidence → short honest profile or none; never fabrication.** Coverage logged
  (§5); no silent drops or caps.
- Relatable detail allowed **only where sourced**, hedged as tradition where the source is.
- No devotional language or prayers in profiles (Feature A §1).
- One PD-translated quote only, via the gated `saint_quotes.csv` (the pipeline may propose,
  not write).
- **No Oriental Orthodox sources** (§4 "Do NOT fetch"; CLAUDE.md §1 scope).
- Canonization caution for recently-reposed / locally-venerated figures (§9); flag, don't
  assert. Clergy/source review remains required before `reviewed`.
