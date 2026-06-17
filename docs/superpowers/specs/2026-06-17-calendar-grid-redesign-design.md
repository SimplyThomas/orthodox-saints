# Calendar page redesign — a real month-grid calendar

**Date:** 2026-06-17
**Status:** Approved (design), pending implementation plan
**Area:** Frontend only (`src/pages/calendar.astro`, `src/islands/calendar.client.ts`, `e2e/`)

## Problem

The `/calendar` page renders every month of the Church year as one long vertical
stack of day-lists. The only way to reach a date is to scroll the whole corpus
(~2,700 commemorations). It does not look or behave like a calendar.

## Goal

Make `/calendar` look and work like a real wall calendar: a weekday-aligned
month grid that opens on the **current month**, with prev/next month navigation,
a "Today" jump, and a day panel that shows the selected day's commemorations.
No more endless scroll. (Chosen direction "A" from brainstorming.)

## Constraints carried over from the current page

- **SEO + no-JS:** every saint link must remain in the server-rendered HTML.
  The calendar is a browse aid; per-saint pages already exist, but the day
  lists must stay crawlable and usable without JavaScript.
- **"Today" is client-side only.** A build-time `new Date()` freezes to the
  deploy day, so anything depending on the real clock — including weekday
  alignment of the grid — must run in the island.
- Build through `withBase()` for internal links; vanilla-TS island (no framework).
- Rank dot colors and the rank-weight day ordering are kept as-is.

## Design

### Layout (desktop)

```
[ The Calendar hero — unchanged, with a Today button ]

  October 2026                         [Today] [‹] [Month ▾] [›]
  ┌──────────────────────────────┐   ┌────────────────────────┐
  │ Su Mo Tu We Th Fr Sa         │   │ October 6              │
  │  ·  ·  ·  ·  1  2  3   …grid  │   │ Tuesday · 3 commem.    │
  │  4  5 [6] 7  8* 9 10          │   │ • Thomas the Apostle   │
  │ … weekday-aligned cells …    │   │ • Innocent of Alaska   │
  └──────────────────────────────┘   │ • Erotis the Martyr    │
  [ ✶ Movable commemorations → ]      └────────────────────────┘
  legend: ● apostles/hierarchs ● martyrs ● monastics
```

- `[6]` = selected day, `8*` = today (gold ring). On narrow screens the day
  panel drops **below** the grid.
- Each grid cell shows the **date number** and a small grey **count** of that
  day's commemorations in the corner. Empty days (no commemoration) render muted
  and non-interactive.

### Behavior

- **Default view:** current month/year. The current day is auto-selected and its
  list shown in the panel. If today's month has no commemoration on today's date
  (rare), select the first commemorated day of the month.
- **Navigation:** `‹` / `›` step months (wrapping across year boundaries);
  `Month ▾` opens a simple month picker (Jan–Dec); `Today` returns to the current
  month and re-selects today.
- **Day select:** clicking/Enter on a day cell renders that day's saint list into
  the panel (header = "Month D", "Weekday · N commemorations").
- **Movable cycle:** a pill under the grid loads the undated (Paschal-cycle)
  commemorations into the same panel, with an explanatory note.
- **Keyboard / a11y:** day cells are real `<button>`s with
  `aria-label="October 6, 3 commemorations"`; the panel is `aria-live="polite"`;
  month nav buttons are labeled.

### Data flow / architecture

`calendar.astro` (build time)
- Computes the same per-month/per-day `Entry[]` model and `movable[]` it does now.
- Renders the hero (with a `Today` button) and a **source/fallback** region:
  for each month, a container of that month's days, each day a `<ul>` of saint
  `<li><a>` links (the exact SEO content rendered today), plus a movable `<ul>`.
  This region is the no-JS fallback AND the data the island reads from.
- Renders an (initially empty) **grid mount** + **panel mount** for the island
  to populate.

`calendar.client.ts` (runtime)
- Reads `today` (year/month/day) from the real clock.
- `src/lib/calendar-grid.ts` (new, pure, no DOM): `monthMatrix(year, month)` →
  leading-blank count + day numbers, and `daysInMonth`/`firstWeekday` helpers.
  Pure so the date math is isolated and trivially correct.
- Builds the grid for the active month from `monthMatrix` + per-day counts taken
  from the source region; wires day clicks; renders the panel by cloning the
  matching source `<ul>` (links already correct — no re-derivation).
- On enhancement, adds `is-enhanced` to the page root: CSS hides the fallback
  source region and reveals the grid/panel. With JS off, the fallback day-lists
  remain visible and usable.

### Markup contract (stable hooks for tests)

- `.cal-title` (kept), `.cal-app` (enhanced container), `.cal-grid`,
  `.cal-cell` (button; `.is-today`, `.is-selected`, `.is-empty`), `.cal-panel`,
  `.cal-month-label`, controls `#cal-prev` / `#cal-next` / `#cal-today-btn`
  / `#cal-month-picker`, and `#cal-movable-btn`.
- Source/fallback: `.cal-source` with `data-month`, `.cal-src-day` with
  `data-day`, and `.cal-src-movable`. Each holds the same `<ul class="cal-list">`
  markup used today.

## What is removed

- The sticky month rail (`.cal-nav`) and the IntersectionObserver active-month
  logic — month navigation now lives in the control bar.
- The all-months-visible scroll layout (kept only as the hidden no-JS fallback).

## Testing

### Add a JS unit-test runner (Vitest)

The repo has no JS unit runner today; the date-grid logic is the first piece
that genuinely warrants one, and it won't be the last (`src/lib/` holds pure
filter/quiz/name logic that is currently only exercised through Playwright,
which is slow and brittle for pure functions). Add **Vitest** — it is the
Vite-native runner and Astro is Vite-based, so it integrates with almost no
config and supports TS out of the box.

- **Dependency:** `vitest` as a devDependency.
- **Config:** `vitest.config.ts` built from `getViteConfig` (from `astro/config`)
  so tests share the project's resolution; `environment: 'node'`,
  `include: ['src/**/*.test.ts']`.
- **Convention:** colocate unit tests as `src/**/<name>.test.ts`; use explicit
  imports (`import { describe, it, expect } from 'vitest'`) so no global types
  or ESLint env changes are needed. Existing lint/format already covers `src/`,
  so test files are linted and formatted like everything else.
- **Scripts:** `"test:unit": "vitest run"` (and `"test:unit:watch": "vitest"`).
  Leave `"test": "playwright test"` unchanged so existing e2e wiring/semantics
  hold.
- **Makefile:** add `web-unit: ; npm run test:unit`.
- **CI:** add a `- run: npm run test:unit` step to the **frontend** job in
  `ci.yml` (before the Playwright steps — it's fast and fail-fast). It runs
  inside the already-required `frontend` gate, so no new required check to
  configure.
- **First tests — `src/lib/calendar-grid.test.ts`:** cover `monthMatrix`,
  `firstWeekday`, `daysInMonth` against known dates (e.g. Oct 2026 starts
  Thursday → 4 leading blanks, 31 days; Feb 2024 leap → 29; Feb 2025 → 28;
  a Sunday-start month → 0 blanks). Pure functions, no DOM.

### e2e

- **e2e (`e2e/smoke.spec.ts`, update the two calendar tests):**
  - Page loads; `.cal-title` reads "The Calendar"; the grid renders with a
    `.cal-cell.is-today` (count 1) and a `.cal-cell.is-selected`.
  - Clicking a different day updates `.cal-panel` (header + list).
  - `‹`/`›` change `.cal-month-label`.
  - The movable pill loads commemorations into the panel.
  - A saint link in the panel/fallback matches `/saint/OS-\d{4,}` and opens the
    saint page.
- **Gates:** `make web-lint` and `make web-test` (Playwright) must pass; both are
  required CI checks.

## Out of scope

- No Julian/Gregorian or old/new-calendar toggle (dates are used as stored).
- No per-month code-splitting of the data (the `TODO(scale)` note stays).
- No search/filter inside the calendar.
