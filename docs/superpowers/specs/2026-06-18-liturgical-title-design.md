# Full Liturgical Title — prominent profile field

**Date:** 2026-06-18
**Status:** approved (brainstorming → implementation)
**Branch:** `feat/liturgical-title`

## Problem

Reviewing the Theotokos page (OS-0001) surfaced that the app never clearly
identifies a saint's **full formal liturgical title** — the formal style by which
the saint is named at commemoration. For the Theotokos that is *"Our All-holy,
immaculate, most blessed and glorified Lady, the Theotokos and Ever-Virgin Mary."*
This is distinct from the three name-like things the app already has:

- the display **Name** ("Most Holy Theotokos (Virgin Mary)"),
- the breadcrumb **honorific** ("St …"), and
- the composed **Short Prayer** ("Most Holy Theotokos, save us.").

Today the full title exists only buried inside a profile prose section. The
majority of saints have such a title, and it deserves a prominent, first-class
slot on the saint page.

## Decisions (from brainstorming)

1. **Data home — profile YAML, auto-generated.** The title lives only in
   `src/content/profiles/OS-####.yaml`, not in `data/saints.csv`. Rationale: it
   is a sourced free-text field; the profilegen pipeline can generate it *safely*
   (grounded + adversarially verified + draft→reviewed gate) with no per-row hand
   authoring. Trade-off accepted: it covers only profiled saints (124 today,
   growing) and renders on the detail page only — exactly where the gap was
   noticed. No CSV / `build.py` / xlsx / search-index changes.
2. **Placement — a "Commemorated as" labeled band** directly under the `<h1>`
   name (between the name/epithet and the lifespan), in the main reading column.
   An eyebrow-style label plus the title in formal serif.
3. **Safety — reuse the existing pipeline guarantees.** The Write stage composes
   the title; the existing adversarial Verify stage checks it like any other
   claim; an unsupported office/place/epithet flags the profile out of
   production. Worst case is "held for review," never "ships fabricated."
4. **Backfill — a one-off targeted pass** over the 124 existing profiles that
   adds *only* the `liturgicalTitle` field, never altering other content or
   demoting a `reviewed` profile.

## Out of scope (YAGNI)

No CSV column; no search indexing; no display on cards / finder / quiz; no
structured title components. A single optional string, profile-sourced, detail
page only.

## Design

### Data model

Add an optional field to the profile schema in **two** mirrored places (they must
stay in sync — `build.py` parses YAML by regex, Astro/Zod validates it):

- `src/content.config.ts` — `liturgicalTitle: z.string().optional()` on
  `profileSchema`.
- `tools/profilegen/schemas.py` — `"liturgicalTitle": {"type": "string"}` in
  `PROFILE_SCHEMA.properties` (not required).

No `emit.py` change: `write_profile` spreads `{**profile}`, so the field rides
through automatically and YAML field order follows its position in the profile
dict (Write places it after `lifespan`).

Example:

```yaml
id: OS-0001
lifespan: c. 18 BC – after c. 33 AD
liturgicalTitle: Our All-holy, immaculate, most blessed and glorified Lady, the Theotokos and Ever-Virgin Mary
overview:
  - …
```

### Rendering — `src/components/SaintView.astro`

Insert between the `<h1 class="sv-name">` block and the `{profile?.lifespan …}`
line (around line 239). The field is read from the already-loaded `profile`:

```astro
{
  profile?.liturgicalTitle && (
    <div class="sv-littitle">
      <div class="eyebrow sv-littitle-label">Commemorated as</div>
      <p class="sv-littitle-text">{profile.liturgicalTitle}</p>
    </div>
  )
}
```

Styling (scoped `<style>` in the same file): a formal serif line, a thin gold
left rule echoing the existing eyebrow treatment, modest top/bottom margin so it
reads as a distinct band without competing with the `<h1>`. Renders nothing when
absent — unprofiled and title-less saints are visually unchanged.

### Forward generation

- **`tools/profilegen/prompts/write.md`** — add a HARD RULE: compose
  `liturgicalTitle`, the saint's full formal liturgical style, from the dossier.
  Use the conventional honorific register appropriate to **rank** (e.g.
  "The Holy, Glorious …" for a martyr; "Our Father among the Saints …" for a
  hierarch; "The Holy, Glorious and All-Praised …" for an apostle) wrapped around
  the saint's **grounded** specifics — office, see/place, epithet — taken from
  the dossier. Do **not** invent an office, place, or epithet. **Omit the field**
  entirely if those specifics are not in the dossier (it is optional; a bare stub
  has no title). Original wording; no devotional/prayer text beyond the
  conventional liturgical style itself.
- **`tools/profilegen/prompts/verify.md`** — add a line noting that
  `liturgicalTitle` is claim-bearing text: its office/see/epithet must be
  supported by the anchor record exactly like body claims. No code change to
  Verify/`emit_one` — an unsupported title flows through the existing
  flag/phantom machinery (the verifier quotes the title; `emit_one` honors or
  demotes the flag as for any claim).

### Backfill — `tools/profilegen/backfill_titles.py` (new, one-off)

A standalone authoring tool (same register as the rest of `tools/profilegen/`;
authoring-only deps). For each existing `src/content/profiles/OS-####.yaml`:

1. Skip if it already has `liturgicalTitle`.
2. Load the profile and the saint's **anchor row** from `data/saints.csv`
   (Name, Also Known As, Rank/Type, Church Status, Region, Era/Century — the same
   trusted anchor the pipeline uses).
3. One grounded LLM call composes **only** the title, strictly from the anchor row
   plus the profile's own already-reviewed prose (low fabrication risk — several
   profiles already state the title verbatim, e.g. OS-0001).
4. Verify the title's factual components against the anchor. If unsupported,
   **drop** it (write nothing) and log to `dist/profilegen/title_backfill_<date>.csv`.
5. On success, write **only** the `liturgicalTitle` field into the YAML,
   preserving every other field and `status` exactly (a `reviewed` profile stays
   `reviewed`, unaltered apart from the one added line).
6. Emit the `dist/` review sheet listing every proposed/dropped title.

The batch lands as a PR the user reviews before merge (§12) — the human
confirmation gate for backfilled titles on already-`reviewed` profiles.

Auth/run mirrors the bulk pipeline (`unset ANTHROPIC_API_KEY`; OAuth token), but
this is a one-off, not part of `run.py`.

## Verification

- `make web-lint` + `make web-build` green (schema + render compile; existing
  profiles still validate — the field is optional).
- `make validate` green (no `build.py`/CSV impact; sanity only).
- A profile carrying `liturgicalTitle` renders the "Commemorated as" band on its
  `/saint/OS-####` page; a profile without it renders no band.
- Backfill: OS-0001 gains the Theotokos title; spot-check the `dist/` review sheet;
  no `reviewed` profile's `status` or other fields change in the diff.

## Files touched

- `src/content.config.ts` — schema field
- `tools/profilegen/schemas.py` — schema field
- `src/components/SaintView.astro` — band + styles
- `tools/profilegen/prompts/write.md` — generation rule
- `tools/profilegen/prompts/verify.md` — verify note
- `tools/profilegen/backfill_titles.py` — new one-off backfill tool
- `src/content/profiles/OS-####.yaml` — titles added by the backfill run (separate commit/PR section)
