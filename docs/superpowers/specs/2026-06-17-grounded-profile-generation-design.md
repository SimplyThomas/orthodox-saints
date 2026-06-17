# Grounded Profile Generation at Scale — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design) — all §10 decisions settled; ready for implementation plan
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
- **No website/UX feature design.** The user's ChatGPT prompt ends with a "Website
  Improvement Suggestions" section (family trees, interactive maps, etc.); those are
  product ideas for a human, not profile data, and are out of scope here.

## 3. The grounded generation pipeline

A per-saint pipeline, batched and resumable, reusing the spine-walk / enrichment-sprint
subagent patterns. Four stages per saint:

1. **Gather** — build a *cited dossier*, each extracted fact tagged with its source. No
   prose written yet. The dossier is seeded, **in this order**:
   - **(a) the saint's own existing in-repo record first** — the `data/saints.csv` row
     (`Brief Life`, `Notes`, `Customs`, facets, `Feast Day(s)`, `Sources`) and any existing
     `SAINT_PROFILES` entry. This is the trusted baseline to expand from and the
     verification anchor (§3.3a). It is the in-repo replacement for the URL the manual
     ChatGPT prompt pastes — **no HTTP fetch of the live page is needed or wanted**, since
     the deployed page is merely a render of this same data and may lag the working tree.
   - **(b) external source text** per the tiered fetch list (§4), each fact tagged with its
     source URL.
2. **Write** — an agent produces a `SaintProfile` object (`overview`, `timeline`,
   `sections`, `family`, `related`, `patronage`, `works`, `reading`) in the established
   **factual/encyclopedic house voice** (Feature A §1). Hard rules:
   - Every concrete claim must trace to the dossier.
   - **Thin dossier → write less, never embellish.** A short overview is acceptable; an
     invented miracle is not.
   - Relatable human detail is allowed and encouraged **only where a source carries it**,
     and **hedged as tradition** ("by tradition…", "the synaxarion relates…") where the
     source itself hedges.
   - **Separate documented history from later tradition** (the user's prompt §13): miracle
     and tradition material is written in two named buckets — *Historically Documented* vs
     *Traditional Accounts* — and never presents later tradition as established fact. This
     is the rendering form of the hedging rule above.
3. **Verify (adversarial, formalized)** — a separate agent checks each claim against:
   - **(a) the trusted CSV row** — the OCA-spine `Brief Life`/`Notes` is the anchor;
     **the row wins on conflict** (this is the rule the user discovered by hand — see the
     PR #165 Zosimus & Athanasius fabrication catch), and
   - **(b) the dossier** — anything unsupported is flagged.
   It also flags the **tell-tale hedging that signals fabrication** ("most likely 8th or
   9th century," "sources do not clearly identify"). **Crucial distinction:** legitimate,
   source-grounded uncertainty *is required* (the user's prompt rule "indicate uncertainty")
   and must NOT be flagged — e.g. when a source itself says the dates are disputed. What the
   verifier flags is hedging that has **no grounding in the dossier** — uncertainty invented
   to smuggle in an unsupported narrative. The test is traceability: "the synaxarion gives
   two dates" (grounded → keep) vs. "the date is most likely 8th century" with nothing in
   the dossier saying so (ungrounded → flag). Output: `pass` or `flagged` + the offending
   claims.
4. **Emit** — write the profile entry with provenance metadata (§6) and **additive
   controlled-vocab facet enrichment** of the CSV row (only terms that exist in
   `data/vocabulary.csv`; never force a term). `flagged` profiles are written with
   `status: flagged` and surfaced for human fixing — never auto-promoted. The Emit stage
   also **proposes, never commits, two gated artifacts** for human review (parallel to the
   facet enrichment):
   - a **PD quote** row for `saint_quotes.csv` *only* if a verbatim quote can be sourced
     from the PD quote tier (CCEL/NPNF/ANF or Wikisource/KJV) — never from internet quote
     collections (the user's prompt rule, and the build's PD gate enforces it anyway);
   - a **PD image** row for `saint_images.csv` *only* if a Wikimedia Commons / PD file with
     a **direct file link and an accepted open license** is found — feeding the existing
     icon review queue (CLAUDE.md §5). Category-page-only or unlicensed hits are dropped.

   Both are **proposals to verify, not trusted output** — image filenames and quote
   attributions are exactly where the model fabricates, so the human + the build's PD gates
   are the backstop.

This is the deep-research adversarial-verify pattern applied per saint; the verifier's
job is to *refute*, defaulting to "flag" when uncertain.

**Per-stage model tiering (cost/capability).** The stages have very different demands, so
model is a **per-stage config**, not one model end-to-end:

| Stage | Model (DECIDED) | Rationale |
|---|---|---|
| Gather | **Haiku** | mechanical fetch/extract/tag; cheap, high-volume |
| Write | **Opus** | the capability-sensitive step — house voice, weaving sources, hedging tradition; highest fabrication risk → highest capability |
| Verify | **Sonnet** | the adversarial safety gate — reasoning-capable, independent of Write, cheaper than Opus |
| Emit | **Haiku** / plain code | structured, deterministic — write the file, assemble facet/quote/image proposals |

Model is overridable per batch. Capability concentrates in **Write (Opus)** where
fabrication risk is highest; **Verify (Sonnet)** independently checks it; **Gather/Emit
(Haiku)** are throughput work. The design fails *safe* regardless: (a) the adversarial verifier + human-review gate means bad
output is `flagged`, not published, and (b) the hard guardrails — the PD license gate on
quotes/images, controlled-vocab facet validation, and the OCA-row-wins anchor — are **code,
not model judgment**, so they hold no matter which model ran a stage.

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
4. **Relics & Shrines (prompt §12, §12 mapping):** carry as a conventional `sections`
   entry titled "Relics & Shrines" (recommended — no schema change) vs. add a typed
   `relics?` field to `SaintProfile`.
5. **Minor schema refinements (§12 mapping):** add optional `date` to `ProfileWork`
   (Title·Date·Description) and optional `type` to reading items (Title·Author·Type) to
   match the prompt's tables (recommended, additive/optional) vs. fold date/type into the
   existing `desc` text.
6. **Rendered PR preview (§13):** **DECIDED — review sheet only** (zero infra, shows
   verifier flags a live page can't). Cloudflare/Netlify deploy previews are deferred as a
   possible additive future change; GitHub Pages has no native per-PR URL, and the
   gh-pages-subfolder approach breaks the root-base-path/custom-domain setup.

**All decisions accepted as recommended:** per-saint files + generated barrel; ship
`reviewed` only; finder-value batching; relics as a `sections` block; add optional
`date`/`type`; review sheet only.

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

## 12. Coverage mapping — the ChatGPT enrichment prompt → this spec

The user's existing single-saint ChatGPT prompt (factual/encyclopedic, original wording,
distinguish fact from tradition, cite sources, indicate uncertainty, prefer Orthodox then
academic, include PD images) is the **basis for the Write-stage agent prompt** (§3.2). Its
18 output sections map onto the `SaintProfile` schema and this spec as follows; nothing in
the prompt is silently dropped.

| Prompt section | Lands in | Status |
|---|---|---|
| 1 Expanded Biography | `overview` | ✅ |
| 2 Historical Context | `sections` | ✅ |
| 3 Major Contributions | `sections` | ✅ |
| 4 Legacy (+ "why the Great") | `sections` | ✅ |
| 5 Timeline | `timeline` | ✅ |
| 6 Family & Related Saints | `family` + `related` (RelatedFigure.note) | ✅ |
| 7 Works by the Saint | `works` (`title`+`desc`) | ⚠️ add optional `date` (§10.5) |
| 8 Further Reading (works about) | `reading` (Ancient/Modern/Academic groups) | ⚠️ add optional `type` (§10.5) |
| 9 Quotations | `saint_quotes.csv`, PD-gated, propose-only (§3.4) | ✅ |
| 10 Patronage | `patronage` | ✅ |
| 11 Feast Days & Commemorations | CSV `Feast Day(s)` (additive enrichment) | ✅ |
| 12 Relics & Major Shrines | `sections` "Relics & Shrines" *or* new field | ⚠️ decision (§10.4) |
| 13 Miracles & Traditions | `sections`, two-bucket Documented/Traditional (§3.2) | ✅ |
| 14 Public-Domain Images | `saint_images.csv`, propose-only, PD-gated (§3.4) | ✅ |
| 15 Sources | `sources[]` + tiered fetch (§4) | ✅ |
| 16 Thematic Categories & Connections | additive CSV facets (§3.4) + Feature B themes | ✅ |
| 17 Discovery Links ("you may also like") | `related` (with one-line `note`) | ✅ |
| 18 Website Improvement Suggestions | — | ➖ out of scope (§2) |

**Prompt rules → spec controls.** "Original wording / don't copy," "encyclopedic tone, no
devotion," "cite all sources," "prefer Orthodox then academic" → §11 guardrails + §4 tiers.
"Distinguish fact from tradition" → §3.2 two-bucket rule. "Indicate uncertainty" → §3.3
crucial distinction (grounded uncertainty kept, ungrounded hedging flagged). "Verify quote
attributions / no quote-collection sites" and "direct PD image file links only" → §3.4
propose-only + the build's PD gates.

**One difference worth stating:** the manual prompt trusts ChatGPT to *find* its own
quotes and images; this pipeline treats those as **proposals that must pass the PD gate and
human review** (§3.4), because attribution/filename fabrication is the highest-risk output.

## 13. Review tooling — reducing review friction

Reviewing a batch of generated profiles as raw `.ts`/`.json` is high-friction, and a
*rendered site page* is the wrong primary tool: the live saint page deliberately hides the
verifier flags, coverage verdict, and per-claim provenance — exactly what a reviewer needs.
So the pipeline emits a purpose-built **batch review sheet**, mirroring the existing
`dist/icon_contact_sheet.html` icon-review idiom, in two forms:

1. **Markdown summary → the PR's Actions job summary** (clickable inline in the Checks tab,
   no download — the same channel that already carries the finder-coverage report). Per
   profile: `name` + `id`, **coverage verdict** (`full`/`thin`/`none`), **verifier flags**
   (the offending claims, if any), the **overview prose**, and **sources per claim**.
2. **`dist/profile_review_<batch>.html`** — a self-contained artifact with richer
   formatting (flagged claims highlighted, sources linked), for local viewing.

This puts prose, the verifier's reasoning, and provenance in one reviewer-facing view with
**no new infrastructure**.

**Optional visual fidelity (decision §10.6):** for true rendered pages, the clean option is
**Cloudflare Pages / Netlify deploy previews** (per-PR subdomain at root, base path `/`
intact, auto-commented link) — a second host alongside GitHub Pages production. GitHub
Pages itself has **no native per-PR URL**, and the `gh-pages`-subfolder action breaks the
root-base-path + custom-domain assumptions, so it is not recommended here. Note that any
preview build must run in **draft-visible mode** (§6) so the generated `draft` profiles
actually render.
