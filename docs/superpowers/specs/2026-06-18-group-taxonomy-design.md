# Group Taxonomy — Design Spec

**Date:** 2026-06-18
**Status:** Approved design (pending spec review → implementation plan)
**Related:** CLAUDE.md §1 (the finder is the core value), §5/§6 (data model & identity),
§7 (grouping convention); the grouped-saint split policy and the Peter & Paul split.

## 1. Purpose & context

Many Orthodox commemorations are collective — the Seventy Apostles, the Synaxis of the New
Martyrs of Russia, the Three Hierarchs, the Chief Apostles Peter & Paul. Today these are
represented inconsistently: some as a single "collective" row, some only as free text
("of the Seventy" in *Also Known As*; "Among the Synaxis of New Martyrs and Confessors of
Russia" in *Notes*). As we split combined entries into one row per saint (grouped-saint split
policy), we must not lose the relationship.

This spec defines a **group taxonomy**: a structured, first-class way to (1) re-link members
of a commemoration and (2) make group membership a **filterable dimension of the finder**.

## 2. Goals

- A group is a **first-class entity** with its own stable slug, a landing page, and a finder
  facet — closer in weight to a Region or Vocation facet than to a free-text note.
- **Membership references any saint row — individual OR still-collective** — so the taxonomy
  ships independently of the (large) splitting backlog and improves incrementally.
- Groups carry **light metadata** (type, one-line description, optional shared feast); pages
  **auto-generate** from members. No per-group narrative authoring.
- The build **validates referential integrity and fails loud** on dangling references.

## 3. Non-goals (v1, YAGNI)

- A browse-all-groups index page.
- Curated per-group prose / narratives.
- Rich `role`/`order` rendering (fields exist; minimal use).
- Mass-splitting collective rows (independent, incremental work — not a prerequisite).
- Groups in the `.xlsx` export.

## 4. Data model — two new source-of-truth join files

Follows the established join-file pattern (`data/saint_images.csv`, `data/saint_quotes.csv`).

### 4.1 `data/groups.csv` — group definitions (one row per group)

| Column | Notes |
|---|---|
| `slug` | Stable kebab-case key; the URL (`/group/<slug>`) and join key. Permanent, never reused. |
| `name` | Display name, e.g. "The Seventy Apostles". |
| `type` | Controlled: `synaxis` \| `feast-companions` \| `household`. |
| `description` | One-line summary (page blurb + meta description). |
| `feast` | Optional shared feast day(s), free text like *Feast Day(s)* (e.g. `Jan 4`). |
| `sort` | Optional integer for ordering; default alphabetical by `name`. |

### 4.2 `data/saint_groups.csv` — membership join (one row per member)

| Column | Notes |
|---|---|
| `group_slug` | FK → `groups.csv` `slug`. |
| `saint_id` | FK → `saints.csv` `Saint ID` — **individual or collective row**. |
| `role` | Optional free-text note about the member's place in the group. |
| `order` | Optional integer for member ordering on the group page. |

### 4.3 Type vocabulary

- **`synaxis`** — a collective commemoration / liturgical assembly: the Twelve, the Seventy
  (both are liturgically *synaxes* — Jun 30, Jan 4), the New Martyrs of Russia, Athonite
  saints, council fathers.
- **`feast-companions`** — a small set of *individually-venerated* saints sharing a principal
  feast: Peter & Paul, the Three Hierarchs, Cosmas & Damian, the Unmercenaries. (Marks the
  split-policy boundary: distinct majors, each with their own page.)
- **`household`** — a family / kinship unit: Joachim, Anna & the Theotokos; a mother and her
  sons.

Validated at build against this enumerated set; adding a type is a deliberate code change.

## 5. Build integration (`build.py`)

Load `groups.csv` and `saint_groups.csv` after saints. Validate (fail loud, exit non-zero —
consistent with all build validation; gates CI via `--check-only`):

- every `groups.type` ∈ {`synaxis`, `feast-companions`, `household`}
- every `group_slug` in the join exists in `groups.csv`
- every `saint_id` in the join exists in `saints.csv`
- `slug` values unique; `(group_slug, saint_id)` pairs unique

Emit into `public/data.json`:

- each saint gains `groups: [{slug, name, type}]` (its memberships)
- a top-level `groups: [{slug, name, type, description, feast, sort, members: [saint_id…]}]`

`.xlsx` export unaffected (non-goal).

## 6. Frontend (Astro)

### 6.1 Group landing page — `src/pages/group/[slug].astro`
`getStaticPaths` from `data.json` `groups` (one pre-rendered page per group). Renders: `name`
(h1), `type` badge, `description`, shared `feast` if set, and a **member grid reusing the
existing saint card / `SaintAvatar`** components; members link to their saint pages.
Collective-row members render with their existing display name. `BaseLayout` supplies
OG/Twitter meta (`description`) and automatic sitemap inclusion; all internal URLs via
`withBase()`.

### 6.2 Saint page — `src/components/SaintView.astro`
Add a small **"Member of: *[group]*"** surface — one link per group to `/group/<slug>` — in
the existing related-figures area. Unobtrusive.

### 6.3 Finder facet — `/search`
Add **`group`** as a controlled-vocab-style filter facet, sourced from each saint's `groups`
in the inlined finder index, filtered exactly like Region/Vocation. Facet options are group
names. **Scale:** saints carry 0–2 groups → negligible index growth; the `TODO(scale)` in
`search.astro` stays addressed.

## 7. Migration / v1 seed set

Author `groups.csv` + `saint_groups.csv` for an exemplar set, deriving membership from existing
data. Existing free-text references stay (harmless); the join becomes the structured truth.

| slug | type | members (derivation) |
|---|---|---|
| `seventy-apostles` | synaxis | rows tagged "of the Seventy" (AKA/Notes), incl. current collective rows (OS-0263, OS-0344, …) |
| `new-martyrs-russia` | synaxis | rows whose Notes contain "Among the Synaxis of New Martyrs and Confessors of Russia" |
| `chief-apostles` | feast-companions | Peter (OS-0004) + Paul (new id from the split) |
| `three-hierarchs` | feast-companions | Basil the Great, Gregory the Theologian, John Chrysostom (OS-0023) |

`chief-apostles` depends on the Peter & Paul split landing first; the others are independent.
More groups added incrementally.

## 8. Testing

- **`build.py` unit tests** (`tests/`): dangling `group_slug` → fail; dangling `saint_id` →
  fail; bad `type` → fail; duplicate `slug` → fail; duplicate membership → fail; valid join →
  saint gains `groups` and a `groups` list is emitted.
- **Playwright e2e** (`e2e/`): `/group/seventy-apostles` renders its member grid; the `/search`
  group filter narrows results to a group's members.
- `make validate` stays clean; existing CI gates unchanged.

## 9. Open questions / risks

- **Facet length:** with many groups the `/search` group filter could grow a long option list;
  v1 renders like other facets — revisit (type-grouped, or search-within-facet) only if it gets
  unwieldy.
- **Collective-row members** display under their collective name on a group page (acceptable;
  improves as splits happen).
- **Slug stability:** slugs are permanent like Saint IDs — choose carefully at authoring time.

## 10. Rollout (stage-able; recommend in order)

1. Data files + `build.py` integration + validation + unit tests (no UI) — `data.json` carries
   groups.
2. Group landing pages + saint-page "Member of" link.
3. Finder group facet.
4. Seed exemplar groups (`chief-apostles` after the split).

Can be one PR or staged PRs; build+data first keeps each step independently shippable.
