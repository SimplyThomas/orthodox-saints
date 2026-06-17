# Fold theme browsing into the Browse page's Refine rail

**Date:** 2026-06-16
**Status:** Approved (design)

## Problem

Theme browsing lives on its own pages (`/themes` listing + `/themes/[slug]` per
theme). We want a single browse surface: remove the standalone themes pages and
expose theme browsing as an option inside the **Refine** rail on `/search`, so a
reader filters by theme alongside the existing facets.

## Decisions (from brainstorming)

1. **Layout:** one grouped collapsible — a single "Browse by Theme" panel in the
   Refine rail containing the 8 theme families as sub-headers (preserves the
   family structure the old page had), not 8 separate facet groups and not a flat
   list.
2. **Saint-page theme chips:** re-point from `/themes/[slug]` to
   `/search?theme=<slug>` so clicking a chip opens the finder pre-filtered to that
   theme.
3. **"Looking for a theme?" search banner:** keep it, but re-point it to toggle
   the theme filter inline (it now lives on the same page) instead of navigating.

## Design

### 1. Make `themes` a real finder facet
- `src/lib/types.ts` — add `themes?: string[]` to `FinderSaint`.
- `src/lib/data.ts` — include `themes` in `toFinderSaint()` (records already carry
  `s.themes`, computed by `build.py` / `themes.py`).
- `src/lib/filter.ts` — append `{ key: "themes", label: "Themes", multi: true }`
  to `FACETS`. Matching, active-chip tracking, `activeCount`, and `clearAll` then
  work unchanged, because `valuesOf(saint, "themes")` returns the slug array and
  the selected set holds slugs. Do **not** add it to `OPEN_BY_DEFAULT`.

### 2. Custom-render the themes block in the rail
- `src/components/FacetSidebar.astro` — exclude `themes` from the generic
  auto-rendered facet groups, and render one dedicated
  `<details class="facet-group facet-themes" data-key="themes">` titled **"Browse
  by Theme"**. Inside, iterate `themesByGroup(1)` from `lib/themes.ts`: each family
  renders a sub-header, then a checkbox per theme with `value={slug}`, label text
  `theme.label`, and the `theme.count`. Only populated themes (`count >= 1`) show.

### 3. Finder island wiring (`src/islands/finder.client.ts`)
- `renderActiveChips` — when `facet.key === "themes"`, show
  `themeBySlug.get(v)?.label ?? v` as the chip label (removal still matches the
  checkbox by its slug `value`).
- `initFromURL` — read `?theme=<slug>`: add to `selected.themes`, check that
  checkbox, and open the "Browse by Theme" `<details>`.
- `syncURL` — persist/clear the `theme` param alongside `q` so a theme-filtered
  view is shareable.
- `renderThemeSuggest` — replace the `/themes/[slug]` anchor with an inline
  control that checks the matching theme box (dispatching the same `change` the
  facet handler listens for) rather than navigating off-page.

### 4. Re-point the saint detail page
- `src/components/SaintView.astro` — theme chip `href`:
  `withBase("themes/" + slug)` → `withBase("search?theme=" + slug)`. The
  `relatedByThemes` / `themeBySlug` imports stay.

### 5. Remove the pages + nav
- Delete `src/pages/themes.astro` and `src/pages/themes/[slug].astro` (the
  `@astrojs/sitemap` index drops them automatically).
- `src/components/SiteHeader.astro` — remove the `Themes` nav item and the
  `"themes"` member of the `active` union.
- `src/layouts/BaseLayout.astro` — remove the `"themes"` member of the `active`
  union.

### 6. Tests
- Rewrite `e2e/themes.spec.ts` for the new behavior: the "Browse by Theme" panel
  appears in the Refine rail with grouped themes + counts; checking a theme
  filters the results; `/search?theme=<slug>` deep-links (box checked, results
  filtered); saint-page chips link to `/search?theme=<slug>`; the theme-suggest
  banner toggles the filter inline.
- `e2e/saint-profile.spec.ts` (~line 119) — update the `/themes/bishops` href
  expectation to `/search?theme=bishops`.

## Out of scope / unchanged
- `src/lib/themes.ts` keeps exporting `themeBySlug`, `themesByGroup`,
  `relatedByThemes`, `THEME_CATALOG` (all still used).
- `themes.py`, `public/themes.json`, and the Python build pipeline — no changes.
- Theme taxonomy/derivation rules — unchanged.

## Verification
- `make validate` clean; `make web-lint` and `make web-test` green.
- Manual: `/search` shows the themes panel; selecting a theme filters; a saint
  chip and a `?theme=` link both land on a filtered finder; nav no longer shows
  "Themes"; visiting `/themes` 404s.
