# Calendar Grid Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the endlessly-scrolling `/calendar` page with a real, navigable month-grid calendar (current month by default, prev/next + Today, a day panel), and add a Vitest unit runner to the repo.

**Architecture:** `calendar.astro` server-renders every day's saint list once into a hidden `.cal-source` region (the SEO + no-JS fallback and the single source of links). The `calendar.client.ts` island reads the visitor's real clock, builds a weekday-aligned month grid from pure helpers in `src/lib/calendar-grid.ts`, and fills a day panel by cloning the matching source list. Weekday alignment and "today" must run client-side (a build-time clock freezes to the deploy day).

**Tech Stack:** Astro (SSG), vanilla-TS islands (DOM built via `createElement`/`textContent` — never `innerHTML`), Vitest (new), Playwright (e2e), CSS in the `.astro` `<style>` block.

---

## File Structure

- `vitest.config.ts` (create) — Vitest config (node env, `src/**/*.test.ts`).
- `package.json` (modify) — add `vitest` devDep + `test:unit` scripts.
- `Makefile` (modify) — add `web-unit` target.
- `.github/workflows/ci.yml` (modify) — add `npm run test:unit` to the `frontend` job.
- `CLAUDE.md` (modify) — note the new `make web-unit` command.
- `src/lib/calendar-grid.ts` (create) — pure date helpers.
- `src/lib/calendar-grid.test.ts` (create) — unit tests.
- `src/pages/calendar.astro` (rewrite) — new markup + styles; keep the server data model and the `.cd.t-*` rank colors.
- `src/islands/calendar.client.ts` (rewrite) — grid + navigation + panel + today + movable.
- `e2e/smoke.spec.ts` (modify) — replace the two calendar tests with four.

---

## Task 1: Add the Vitest unit runner

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + devDependencies), `Makefile`, `.github/workflows/ci.yml`, `CLAUDE.md`

- [ ] **Step 1: Install Vitest as a dev dependency**

Run:
```bash
npm install -D vitest
```
Expected: `package.json` gains `vitest` under `devDependencies` and `package-lock.json` updates.

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`. (We use `vitest/config`'s `defineConfig` rather than Astro's `getViteConfig`: the lib code under test is pure TS with relative imports — no `astro:*` modules or path aliases — so this is fully typed and avoids a triple-slash-reference lint warning.)

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Add npm scripts**

In `package.json`, add to `"scripts"` (leave `"test": "playwright test"` unchanged):

```json
    "test:unit": "vitest run",
    "test:unit:watch": "vitest"
```

- [ ] **Step 4: Add a Makefile target**

In `Makefile`, add to the `.PHONY` list (line ~2) the token `web-unit`, and add this target near the other `web-*` targets (after `web-test`):

```make
web-unit:    ; npm run test:unit                              # Vitest unit tests (src/lib)
```

- [ ] **Step 5: Wire it into CI**

In `.github/workflows/ci.yml`, in the `frontend` job, add a step immediately after the `npm run lint` step:

```yaml
      - run: npm run test:unit                   # vitest unit tests (pure lib logic)
```

- [ ] **Step 6: Note the command in CLAUDE.md**

In `CLAUDE.md` §4, in the frontend bullet list, add after the `make web-lint` line:

```markdown
- `make web-unit` → `npm run test:unit` : Vitest unit tests over `src/lib` pure logic. (CI gate.)
```

- [ ] **Step 7: Verify the runner is installed**

Run:
```bash
npx vitest --version
```
Expected: prints a version number, exit 0.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts package.json package-lock.json Makefile .github/workflows/ci.yml CLAUDE.md
git commit -m "build(web): add Vitest unit-test runner and wire it into CI"
```

---

## Task 2: Pure date helpers (`calendar-grid.ts`) — TDD

**Files:**
- Create: `src/lib/calendar-grid.ts`
- Test: `src/lib/calendar-grid.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/calendar-grid.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { daysInMonth, firstWeekday, monthMatrix } from "./calendar-grid";

describe("daysInMonth", () => {
  it("handles 31-, 30-, and 28-day months", () => {
    expect(daysInMonth(2026, 10)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2025, 2)).toBe(28);
  });
  it("handles leap February", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });
});

describe("firstWeekday", () => {
  it("returns 0=Sunday .. 6=Saturday for the 1st of the month", () => {
    expect(firstWeekday(2026, 10)).toBe(4); // Oct 1 2026 is Thursday
    expect(firstWeekday(2026, 2)).toBe(0); // Feb 1 2026 is Sunday
    expect(firstWeekday(2025, 2)).toBe(6); // Feb 1 2025 is Saturday
  });
});

describe("monthMatrix", () => {
  it("describes October 2026: 4 leading blanks, 31 days", () => {
    const mm = monthMatrix(2026, 10);
    expect(mm.leadingBlanks).toBe(4);
    expect(mm.days).toHaveLength(31);
    expect(mm.days[0]).toBe(1);
    expect(mm.days[30]).toBe(31);
  });
  it("describes a Sunday-start month with 0 leading blanks", () => {
    const mm = monthMatrix(2026, 2);
    expect(mm.leadingBlanks).toBe(0);
    expect(mm.days).toHaveLength(28);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
npm run test:unit
```
Expected: FAIL — cannot resolve `./calendar-grid` (module not found).

- [ ] **Step 3: Write the implementation**

Create `src/lib/calendar-grid.ts`:

```ts
/* Pure month-grid date math for the calendar island. No DOM, no clock state —
   everything is a function of (year, month) so it can be unit-tested directly.
   `month` is 1-12 throughout; weekday is 0=Sunday .. 6=Saturday. */

/** Number of days in the given month (handles leap February). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Weekday of the 1st of the month: 0=Sunday .. 6=Saturday. */
export function firstWeekday(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export interface MonthMatrix {
  year: number;
  month: number;
  /** Empty cells to render before day 1 so day 1 lands in its weekday column. */
  leadingBlanks: number;
  /** Day numbers 1..daysInMonth. */
  days: number[];
}

/** Layout description for one month's grid. */
export function monthMatrix(year: number, month: number): MonthMatrix {
  const n = daysInMonth(year, month);
  return {
    year,
    month,
    leadingBlanks: firstWeekday(year, month),
    days: Array.from({ length: n }, (_, i) => i + 1),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
npm run test:unit
```
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar-grid.ts src/lib/calendar-grid.test.ts
git commit -m "feat(web): add pure month-grid date helpers with unit tests"
```

---

## Task 3: Rewrite the calendar page (markup, island, styles)

The page markup, island, and styles are tightly coupled — the page is not functional half-migrated — so they land together in one commit.

**Files:**
- Rewrite: `src/pages/calendar.astro`
- Rewrite: `src/islands/calendar.client.ts`

- [ ] **Step 1: Rewrite `src/islands/calendar.client.ts`**

Replace the entire file with the following. Note: all DOM is built with `createElement`/`textContent`/`replaceChildren` and never `innerHTML`, so no string is ever parsed as HTML. Saint lists come from `cloneNode` of the server-rendered (already-escaped) source DOM.

```ts
/* Calendar island — progressively enhances the pre-rendered day-lists
   (.cal-source) into a real, navigable month grid with a day panel.
   Everything that needs the visitor's real clock (weekday alignment of the
   grid, "today") runs here; a build-time new Date() would freeze to the deploy
   day. With JS disabled, .cal-source stays visible as the full fallback. */

import { MONTHS_FULL, WEEKDAYS } from "../lib/format";
import { monthMatrix } from "../lib/calendar-grid";

const root = document.getElementById("calendar-page");
const app = document.querySelector<HTMLElement>(".cal-app");
const source = document.getElementById("cal-source");
const grid = document.getElementById("cal-grid");
const panel = document.getElementById("cal-panel");
const monthLabel = document.getElementById("cal-month-label");
const picker = document.getElementById(
  "cal-month-picker",
) as HTMLSelectElement | null;
const todayLabel = document.getElementById("cal-today-label");
const movableBtn = document.getElementById("cal-movable-btn");

/** Small element builder: tag + class (+ optional text), all via safe DOM APIs. */
function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function panelHead(title: string, label: string): HTMLElement {
  const head = el("div", "cal-panel-head");
  head.append(el("span", "d", title), el("span", "lbl", label));
  return head;
}

if (root && app && source && grid && panel && monthLabel) {
  const now = new Date();
  const TODAY_Y = now.getFullYear();
  const TODAY_M = now.getMonth() + 1;
  const TODAY_D = now.getDate();

  // Index the pre-rendered source lists by "m-d", plus the movable list.
  const dayLists = new Map<string, HTMLUListElement>();
  source.querySelectorAll<HTMLElement>(".cal-src-day").forEach((dayEl) => {
    const m = dayEl.closest<HTMLElement>("[data-month]")?.dataset.month;
    const d = dayEl.dataset.day;
    const ul = dayEl.querySelector("ul");
    if (m && d && ul) dayLists.set(`${m}-${d}`, ul as HTMLUListElement);
  });
  const movableList = source.querySelector<HTMLUListElement>(
    ".cal-src-movable ul",
  );

  let viewY = TODAY_Y;
  let viewM = TODAY_M;

  const countFor = (m: number, d: number): number =>
    dayLists.get(`${m}-${d}`)?.childElementCount ?? 0;

  const plural = (n: number): string =>
    `${n} commemoration${n === 1 ? "" : "s"}`;

  function renderPanel(key: string): void {
    grid!
      .querySelectorAll(".cal-cell.is-selected")
      .forEach((c) => c.classList.remove("is-selected"));
    movableBtn?.classList.remove("is-active");

    if (key === "movable") {
      movableBtn?.classList.add("is-active");
      const n = movableList?.childElementCount ?? 0;
      panel!.replaceChildren(
        panelHead("Movable", `Paschal cycle · ${plural(n)}`),
        el(
          "p",
          "cal-panel-note",
          "Commemorations tied to Pascha rather than a fixed date — their day shifts each year.",
        ),
      );
      if (movableList) panel!.append(movableList.cloneNode(true));
      return;
    }

    const [m, d] = key.split("-").map(Number);
    grid!.querySelector(`[data-key="${key}"]`)?.classList.add("is-selected");
    const ul = dayLists.get(key);
    const n = ul?.childElementCount ?? 0;
    const wd = WEEKDAYS[new Date(viewY, m - 1, d).getDay()];
    panel!.replaceChildren(
      panelHead(`${MONTHS_FULL[m - 1]} ${d}`, `${wd} · ${plural(n)}`),
    );
    if (ul && n) {
      panel!.append(ul.cloneNode(true));
    } else {
      panel!.append(
        el("p", "cal-panel-empty", "No commemoration recorded for this day."),
      );
    }
  }

  function defaultSelection(): string {
    if (viewY === TODAY_Y && viewM === TODAY_M && countFor(viewM, TODAY_D) > 0) {
      return `${viewM}-${TODAY_D}`;
    }
    for (const d of monthMatrix(viewY, viewM).days) {
      if (countFor(viewM, d) > 0) return `${viewM}-${d}`;
    }
    return `${viewM}-1`;
  }

  function renderGrid(): void {
    const { leadingBlanks, days } = monthMatrix(viewY, viewM);
    const small = document.createElement("small");
    small.textContent = String(viewY);
    monthLabel!.replaceChildren(`${MONTHS_FULL[viewM - 1]} `, small);
    if (picker) picker.value = String(viewM);

    const cells: HTMLElement[] = [];
    for (let i = 0; i < leadingBlanks; i++) {
      const blank = el("div", "cal-cell is-blank");
      blank.setAttribute("aria-hidden", "true");
      cells.push(blank);
    }
    for (const d of days) {
      const key = `${viewM}-${d}`;
      const n = countFor(viewM, d);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell";
      cell.dataset.key = key;
      if (n === 0) {
        cell.classList.add("is-empty");
        cell.disabled = true;
      }
      if (viewY === TODAY_Y && viewM === TODAY_M && d === TODAY_D) {
        cell.classList.add("is-today");
      }
      cell.setAttribute(
        "aria-label",
        `${MONTHS_FULL[viewM - 1]} ${d}, ${plural(n)}`,
      );
      cell.append(el("span", "cn", String(d)));
      if (n) cell.append(el("span", "cc", String(n)));
      if (n > 0) cell.addEventListener("click", () => renderPanel(key));
      cells.push(cell);
    }
    grid!.replaceChildren(...cells);
  }

  function show(y: number, m: number, select?: string): void {
    viewY = y;
    viewM = m;
    renderGrid();
    renderPanel(select ?? defaultSelection());
  }

  function step(delta: number): void {
    let y = viewY;
    let m = viewM + delta;
    if (m < 1) {
      m = 12;
      y--;
    } else if (m > 12) {
      m = 1;
      y++;
    }
    show(y, m);
  }

  document.getElementById("cal-prev")?.addEventListener("click", () => step(-1));
  document.getElementById("cal-next")?.addEventListener("click", () => step(1));
  document
    .getElementById("cal-today-btn")
    ?.addEventListener("click", () => show(TODAY_Y, TODAY_M));
  movableBtn?.addEventListener("click", () => renderPanel("movable"));
  picker?.addEventListener("change", () => show(viewY, Number(picker.value)));

  if (todayLabel) {
    todayLabel.textContent = `Today is ${WEEKDAYS[now.getDay()]}, ${MONTHS_FULL[TODAY_M - 1]} ${TODAY_D}.`;
  }

  // Enhance: reveal the interactive app, hide the no-JS source.
  root.classList.add("is-enhanced");
  app.hidden = false;
  show(TODAY_Y, TODAY_M);
}
```

- [ ] **Step 2: Rewrite `src/pages/calendar.astro`**

Replace the entire file with the following. The frontmatter keeps the existing data model verbatim (Entry, RANK_W, weight, months/movable build, monthData); only the template and styles change.

````astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import DomeMark from "../components/icons/DomeMark.astro";
import { withBase, MONTHS, MONTHS_FULL } from "../lib/format";
import { SAINTS } from "../lib/data";
import { feastDates, primaryRank, rankSlug } from "../lib/saints";
import { splitName } from "../lib/names";

// Every saint grouped onto each fixed feast date they hold. Movable-cycle
// commemorations (no fixed Mon-D) collect separately. The grid + "today" are
// built client-side (islands/calendar) because a build-time new Date() would
// freeze to the deploy day; this page renders the full day-lists as the SEO +
// no-JS source the island reads from.
// TODO(scale): like /search, this pre-renders the whole corpus on one page;
// comfortable at today's size, split per-month if the calendar grows heavy.

interface Entry {
  id: string;
  title: string;
  epithet: string;
  rank: string;
  slug: string;
  w: number;
}

const RANK_W: Record<string, number> = {
  Theotokos: 10,
  Apostle: 9,
  Forerunner: 9,
  "Equal-to-the-Apostles": 8,
  Prophet: 7,
  "Great Martyr": 7,
  Enlightener: 6,
  Hierarch: 6,
  Hieromartyr: 6,
  Wonderworker: 5,
  Unmercenary: 5,
  Confessor: 4,
  "New Martyr": 4,
  "Venerable-Martyr": 4,
  "Passion-Bearer": 4,
  Martyr: 3,
  "Venerable (Monastic)": 2,
  Righteous: 2,
};
const weight = (rank: string[]): number =>
  rank.length ? Math.max(...rank.map((r) => RANK_W[r] ?? 1)) : 1;

const months: Map<number, Entry[]>[] = Array.from(
  { length: 13 },
  () => new Map<number, Entry[]>(),
);
const movable: Entry[] = [];

for (const s of SAINTS) {
  const sn = splitName(s.name);
  const entry: Entry = {
    id: s.id,
    title: sn.title,
    epithet: sn.epithet,
    rank: primaryRank(s),
    slug: rankSlug(s),
    w: weight(s.rank),
  };
  const dates = feastDates(s);
  if (!dates.length) {
    movable.push(entry);
    continue;
  }
  const seen = new Set<string>();
  for (const { m, d } of dates) {
    if (m < 1 || m > 12 || d < 1 || d > 31) continue;
    const key = `${m}-${d}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const map = months[m];
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(entry);
  }
}

const byRank = (a: Entry, b: Entry) =>
  b.w - a.w || a.title.localeCompare(b.title);
for (const map of months) for (const arr of map.values()) arr.sort(byRank);
movable.sort(byRank);

const monthData = MONTHS.map((abbr, i) => {
  const m = i + 1;
  const map = months[m];
  const days = [...map.keys()]
    .sort((a, b) => a - b)
    .map((d) => ({ d, entries: map.get(d)! }));
  const count = days.reduce((n, day) => n + day.entries.length, 0);
  return { m, abbr, full: MONTHS_FULL[i], days, count };
});

const totalEntries =
  monthData.reduce((n, mo) => n + mo.count, 0) + movable.length;
---

<BaseLayout
  active="calendar"
  title="The Calendar"
  description="A month-by-month Orthodox calendar of the saints — browse every commemoration by date, plus the movable cycle."
>
  <div id="calendar-page">
    <section class="cal-hero">
      <div class="dome-bg" aria-hidden="true">
        <DomeMark w={460} color="var(--byz)" />
      </div>
      <div class="cal-hero-inner">
        <div class="eyebrow-rule" aria-hidden="true">
          <span class="ln"></span><span class="dm"></span>
          <span class="lbl">The Church Year</span>
          <span class="dm"></span><span class="ln"></span>
        </div>
        <h1 class="cal-title">The Calendar</h1>
        <p class="cal-lede">
          {totalEntries.toLocaleString()} commemorations across the fixed calendar,
          with the movable cycle alongside.
        </p>
        <span id="cal-today-label" class="cal-today-label" aria-live="polite"
        ></span>
      </div>
    </section>

    {/* interactive month grid — revealed by the island on enhancement */}
    <div class="cal-app" hidden>
      <div class="cal-bar">
        <div class="cal-month-label" id="cal-month-label"></div>
        <div class="cal-ctrls">
          <button type="button" id="cal-today-btn">Today</button>
          <button
            type="button"
            id="cal-prev"
            class="cal-nav-arrow"
            aria-label="Previous month">‹</button
          >
          <select id="cal-month-picker" aria-label="Jump to month">
            {MONTHS_FULL.map((full, i) => <option value={i + 1}>{full}</option>)}
          </select>
          <button
            type="button"
            id="cal-next"
            class="cal-nav-arrow"
            aria-label="Next month">›</button
          >
        </div>
      </div>

      <div class="cal-main">
        <div class="cal-grid-wrap">
          <div class="cal-dow" aria-hidden="true">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span>
            <span>Thu</span><span>Fri</span><span>Sat</span>
          </div>
          <div class="cal-grid" id="cal-grid" role="grid"></div>
        </div>
        <aside class="cal-panel" id="cal-panel" aria-live="polite"></aside>
      </div>

      <div class="cal-foot">
        {
          movable.length > 0 && (
            <button type="button" id="cal-movable-btn" class="cal-pill">
              ✶ Movable commemorations ({movable.length.toLocaleString()}) →
            </button>
          )
        }
        <div class="cal-legend">
          <span><i style="background:#b7912b"></i>Apostles · Hierarchs</span>
          <span><i style="background:#8d3a2f"></i>Martyrs</span>
          <span><i style="background:#3d6157"></i>Monastics</span>
        </div>
      </div>
    </div>

    {/* SEO + no-JS source: every day's full list; the island reads + clones from here */}
    <div class="cal-source" id="cal-source">
      {
        monthData.map((mo) => (
          <section data-month={mo.m} aria-label={mo.full}>
            <h2>{mo.full}</h2>
            {mo.days.map((day) => (
              <div class="cal-src-day" data-day={day.d}>
                <h3>
                  {mo.full} {day.d}
                </h3>
                <ul class="cal-list">
                  {day.entries.map((e) => (
                    <li>
                      <a href={withBase(`saint/${e.id}`)}>
                        <span
                          class={`cd ${e.slug}`}
                          title={e.rank}
                          aria-hidden="true"
                        />
                        <span class="nm">
                          {e.title}
                          {e.epithet && <i> {e.epithet}</i>}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      }
      {
        movable.length > 0 && (
          <div class="cal-src-movable" aria-label="Movable Commemorations">
            <h2>Movable Commemorations</h2>
            <ul class="cal-list">
              {movable.map((e) => (
                <li>
                  <a href={withBase(`saint/${e.id}`)}>
                    <span
                      class={`cd ${e.slug}`}
                      title={e.rank}
                      aria-hidden="true"
                    />
                    <span class="nm">
                      {e.title}
                      {e.epithet && <i> {e.epithet}</i>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )
      }
    </div>
  </div>

  <script>
    import "../islands/calendar.client.ts";
  </script>
</BaseLayout>

<style>
  /* ---------- hero ---------- */
  .cal-hero {
    position: relative;
    text-align: center;
    padding: clamp(34px, 6vw, 64px) 20px clamp(18px, 3vw, 26px);
    overflow: hidden;
  }
  .cal-hero-inner {
    position: relative;
    z-index: 1;
  }
  .cal-title {
    font-size: var(--page-title-size);
    color: var(--byz-deep);
    line-height: 1;
    margin: 14px 0 16px;
    font-weight: 600;
  }
  .cal-lede {
    font-family: var(--serif);
    font-style: italic;
    font-size: var(--page-lede-size);
    color: var(--celest);
    max-width: 620px;
    margin: 0 auto 14px;
    line-height: 1.45;
    text-wrap: balance;
  }
  .cal-today-label {
    font-family: var(--text);
    font-size: 14px;
    color: var(--ink-soft);
  }

  /* ---------- interactive app ---------- */
  .cal-app[hidden] {
    display: none;
  }
  .cal-app {
    max-width: 1100px;
    margin: 0 auto;
    padding: 6px clamp(14px, 3vw, 28px) 56px;
  }
  .cal-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .cal-month-label {
    font-family: var(--serif);
    font-size: clamp(24px, 5vw, 34px);
    font-weight: 700;
    color: var(--byz-deep);
    line-height: 1;
  }
  .cal-month-label small {
    font-weight: 400;
    font-style: italic;
    color: var(--celest);
    font-size: 0.6em;
    margin-left: 5px;
  }
  .cal-ctrls {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cal-ctrls button,
  .cal-ctrls select {
    font-family: var(--text);
    height: 38px;
    border: 1px solid var(--line-gold);
    background: var(--paper);
    color: var(--byz);
    border-radius: 7px;
    padding: 0 12px;
    font-size: 15px;
    cursor: pointer;
  }
  .cal-ctrls button:hover {
    background: #fff;
  }
  .cal-nav-arrow {
    min-width: 38px;
    font-size: 17px;
    line-height: 1;
  }
  #cal-today-btn {
    background: var(--gold);
    border-color: var(--gold-deep);
    color: var(--byz-ink);
    font-weight: 600;
  }
  #cal-today-btn:hover {
    background: var(--gold-soft);
  }

  .cal-main {
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    gap: 18px;
    align-items: start;
  }
  .cal-dow {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    margin-bottom: 6px;
  }
  .cal-dow span {
    text-align: center;
    font-family: var(--text);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--gold-deep);
  }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-auto-rows: 1fr;
    gap: 5px;
  }
  .cal-cell {
    aspect-ratio: 1 / 0.9;
    background: var(--paper);
    border: 1px solid rgba(35, 76, 122, 0.1);
    border-radius: 7px;
    padding: 6px 7px;
    position: relative;
    text-align: left;
    cursor: pointer;
    font-family: var(--serif);
    transition:
      background 0.12s,
      border-color 0.12s,
      box-shadow 0.12s;
  }
  .cal-cell:hover:not(.is-empty):not(.is-blank) {
    background: #fff;
    border-color: var(--line-gold);
  }
  .cal-cell .cn {
    font-weight: 700;
    color: var(--byz);
    font-size: clamp(14px, 2.4vw, 17px);
    line-height: 1;
  }
  .cal-cell .cc {
    position: absolute;
    bottom: 6px;
    right: 8px;
    font-family: var(--text);
    font-size: 10px;
    color: var(--ink-soft);
  }
  .cal-cell.is-blank {
    background: transparent;
    border-color: transparent;
    cursor: default;
  }
  .cal-cell.is-empty {
    cursor: default;
    opacity: 0.55;
  }
  .cal-cell.is-empty .cn {
    color: var(--ink-soft);
  }
  .cal-cell.is-today {
    box-shadow: inset 0 0 0 2px var(--gold);
  }
  .cal-cell.is-today .cn {
    color: var(--gold-deep);
  }
  .cal-cell.is-selected {
    background: var(--byz);
    border-color: var(--byz);
  }
  .cal-cell.is-selected .cn {
    color: var(--ivory);
  }
  .cal-cell.is-selected .cc {
    color: var(--gold-soft);
  }

  /* ---------- day panel ---------- */
  .cal-panel {
    background: var(--paper);
    border: 1px solid var(--line-gold);
    border-radius: 10px;
    padding: 16px 18px;
    position: sticky;
    top: 12px;
  }
  .cal-panel-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-bottom: 1px solid var(--line-gold);
    padding-bottom: 9px;
    margin-bottom: 10px;
  }
  .cal-panel-head .d {
    font-family: var(--serif);
    font-size: 23px;
    font-weight: 700;
    color: var(--byz-deep);
    line-height: 1.05;
  }
  .cal-panel-head .lbl {
    font-family: var(--text);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.13em;
    color: var(--gold-deep);
  }
  .cal-panel-note {
    font-family: var(--serif);
    font-style: italic;
    color: var(--ink-soft);
    font-size: 14px;
    margin: 0 0 10px;
  }
  .cal-panel-empty {
    font-family: var(--serif);
    font-style: italic;
    color: var(--ink-soft);
    margin: 0;
  }
  .cal-panel .cal-list {
    max-height: 60vh;
    overflow: auto;
  }

  /* ---------- shared saint list (panel + source) ---------- */
  .cal-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .cal-list li a {
    display: flex;
    align-items: baseline;
    gap: 9px;
    padding: 5px 6px;
    border-radius: 4px;
    text-decoration: none;
    color: var(--ink);
    line-height: 1.3;
  }
  .cal-list li a:hover {
    background: rgba(212, 175, 55, 0.12);
  }
  .cal-list li a:hover .nm {
    color: var(--byz-deep);
  }
  .cal-list .nm {
    font-family: var(--serif);
    font-size: 16px;
  }
  .cal-list .nm i {
    font-style: italic;
    color: var(--ink-soft);
    font-size: 14.5px;
  }

  /* rank color dot — keyed to rankSlug; mirrors the .tag families */
  .cd {
    width: 7px;
    height: 7px;
    margin-top: 6px;
    border-radius: 50%;
    flex: 0 0 auto;
    background: var(--byz);
  }
  .cd.t-apostle,
  .cd.t-equal-to-the-apostles,
  .cd.t-prophet,
  .cd.t-forerunner,
  .cd.t-confessor,
  .cd.t-enlightener,
  .cd.t-patriarch-ot,
  .cd.t-theotokos {
    background: #b7912b;
  }
  .cd.t-hierarch {
    background: var(--byz);
  }
  .cd.t-martyr,
  .cd.t-great-martyr,
  .cd.t-hieromartyr,
  .cd.t-new-martyr,
  .cd.t-virgin-martyr,
  .cd.t-venerable-martyr,
  .cd.t-passion-bearer {
    background: #8d3a2f;
  }
  .cd.t-venerable-monastic,
  .cd.t-righteous,
  .cd.t-ascetic,
  .cd.t-hermit,
  .cd.t-stylite,
  .cd.t-myrrh-bearer {
    background: #3d6157;
  }
  .cd.t-unmercenary,
  .cd.t-fool-for-christ,
  .cd.t-wonderworker,
  .cd.t-missionary {
    background: var(--dome);
  }

  /* ---------- foot: movable pill + legend ---------- */
  .cal-foot {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 16px;
  }
  .cal-pill {
    font-family: var(--text);
    font-size: 13px;
    color: var(--gold-deep);
    font-style: italic;
    border: 1px dashed var(--line-gold);
    border-radius: 999px;
    padding: 7px 15px;
    cursor: pointer;
    background: transparent;
  }
  .cal-pill:hover,
  .cal-pill.is-active {
    background: rgba(212, 175, 55, 0.14);
  }
  .cal-legend {
    margin-left: auto;
    display: flex;
    gap: 13px;
    font-family: var(--text);
    font-size: 11.5px;
    color: var(--celest);
    flex-wrap: wrap;
  }
  .cal-legend i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 4px;
  }

  /* ---------- no-JS source / fallback ---------- */
  #calendar-page.is-enhanced .cal-source {
    display: none;
  }
  .cal-source {
    max-width: 1100px;
    margin: 0 auto;
    padding: 6px clamp(14px, 3vw, 28px) 60px;
  }
  .cal-source section,
  .cal-src-movable {
    padding-top: 22px;
  }
  .cal-source h2 {
    font-family: var(--serif);
    font-size: clamp(22px, 4vw, 30px);
    font-weight: 600;
    color: var(--byz-deep);
    border-bottom: 2px solid var(--line-gold);
    padding-bottom: 6px;
    margin: 0 0 10px;
  }
  .cal-source h3 {
    font-family: var(--text);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--gold-deep);
    margin: 12px 0 4px;
  }

  @media (max-width: 760px) {
    .cal-main {
      grid-template-columns: 1fr;
    }
    .cal-panel {
      position: static;
    }
  }
</style>
````

- [ ] **Step 3: Build to verify the page compiles**

Run:
```bash
python build.py --no-xlsx && npm run build
```
Expected: Astro build completes ("2761 page(s) built" or current count), no errors.

- [ ] **Step 4: Lint**

Run:
```bash
npm run lint
```
Expected: ESLint clean; Prettier "All matched files use Prettier code style!" (run `npm run format` first if Prettier flags the new files, then re-lint).

- [ ] **Step 5: Visual check on the dev server**

Run the dev server (`python build.py --no-xlsx && npm run dev`) and load `http://localhost:4321/calendar/`. Confirm: opens on the current month; today has a gold ring; a day is selected and its saints show in the panel; `‹`/`›` and the month picker change months; `Today` returns; the movable pill loads the movable list. (A scripted Playwright/chromium screenshot is fine too.)

- [ ] **Step 6: Commit**

```bash
git add src/pages/calendar.astro src/islands/calendar.client.ts
git commit -m "feat(web): rebuild the calendar as a navigable month grid with a day panel"
```

---

## Task 4: Update the e2e smoke tests

**Files:**
- Modify: `e2e/smoke.spec.ts` (replace the two calendar tests at lines ~327-355)

- [ ] **Step 1: Replace the calendar tests**

Delete the two existing tests (`"calendar renders all twelve months and highlights today"` and `"calendar day links open the full saint page"`) and replace them with these four:

```ts
test("calendar opens on the current month as a grid with today highlighted", async ({
  page,
}) => {
  const resp = await page.goto("./calendar/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".cal-title")).toHaveText("The Calendar");

  // The grid is built client-side and the interactive app is revealed.
  const grid = page.locator("#cal-grid");
  await expect(grid).toBeVisible();
  // The default view is the current month, so today is highlighted exactly once.
  await expect(grid.locator(".cal-cell.is-today")).toHaveCount(1);
  // A day is selected by default and rendered in the panel.
  await expect(grid.locator(".cal-cell.is-selected")).toHaveCount(1);
  await expect(page.locator(".cal-panel .cal-panel-head")).toBeVisible();
});

test("calendar month navigation changes the displayed month", async ({
  page,
}) => {
  await page.goto("./calendar/");
  const label = page.locator("#cal-month-label");
  const before = (await label.textContent())?.trim() ?? "";
  await page.click("#cal-next");
  await expect(label).not.toHaveText(before);
  // Stepping back returns to the original month.
  await page.click("#cal-prev");
  await expect(label).toHaveText(before);
});

test("selecting a calendar day shows its commemorations and links out", async ({
  page,
}) => {
  await page.goto("./calendar/");
  const day = page
    .locator(
      "#cal-grid .cal-cell:not(.is-empty):not(.is-blank):not(.is-selected)",
    )
    .first();
  await day.click();
  await expect(day).toHaveClass(/is-selected/);

  const link = page.locator(".cal-panel .cal-list li a").first();
  const href = await link.getAttribute("href");
  expect(href).toMatch(/\/saint\/OS-\d{4,}$/);
  await link.click();
  await page.waitForURL(/\/saint\/OS-\d{4,}\/?$/);
  await expect(page.locator("#saint-detail")).toBeVisible();
});

test("calendar movable-cycle button loads commemorations into the panel", async ({
  page,
}) => {
  await page.goto("./calendar/");
  await page.click("#cal-movable-btn");
  await expect(page.locator(".cal-panel .cal-panel-head .d")).toHaveText(
    "Movable",
  );
  await expect(page.locator(".cal-panel .cal-list li").first()).toBeVisible();
});
```

- [ ] **Step 2: Build the site for Playwright**

Run:
```bash
python build.py --no-xlsx && npm run build
```
Expected: build succeeds (Playwright tests run against `_site/`).

- [ ] **Step 3: Run the calendar e2e tests**

Run:
```bash
npm test -- -g "calendar"
```
Expected: all four calendar tests PASS.

- [ ] **Step 4: Lint**

Run:
```bash
npm run lint
```
Expected: clean (run `npm run format` if needed).

- [ ] **Step 5: Commit**

```bash
git add e2e/smoke.spec.ts
git commit -m "test(e2e): cover the month-grid calendar (grid, nav, day panel, movable)"
```

---

## Task 5: Full verification and PR

**Files:** none (verification + handoff)

- [ ] **Step 1: Run every gate locally**

Run:
```bash
npm run test:unit && npm run lint && python build.py --no-xlsx && npm run build && npm test
```
Expected: Vitest PASS; lint clean; build succeeds; full Playwright suite PASS.

- [ ] **Step 2: Push the branch and open a PR**

```bash
git push -u origin calendar-grid-redesign
gh pr create --base main --title "feat(web): rebuild the Calendar as a navigable month grid" \
  --body "Implements docs/superpowers/specs/2026-06-17-calendar-grid-redesign-design.md. Adds a Vitest unit runner. Frontend-only."
```

- [ ] **Step 3: Confirm CI is green**

Run:
```bash
gh pr checks --watch
```
Expected: `validate` and `frontend` both pass. Hand the green PR to the user to merge (merging to main is the production deploy — user-only).

---

## Self-Review Notes

- **Spec coverage:** Vitest runner (Task 1) ✓; pure helpers + unit tests (Task 2) ✓; grid + current-month default + prev/next + Today + month picker + day panel + count indicator + movable pill + a11y labels + SEO/no-JS source (Task 3) ✓; removal of the sticky rail/IO + scroll layout (Task 3, replaced markup) ✓; e2e updates (Task 4) ✓; CI/Makefile/CLAUDE.md wiring (Task 1) ✓.
- **Type consistency:** `monthMatrix`/`firstWeekday`/`daysInMonth` signatures match between `calendar-grid.ts`, its test, and the island. DOM hooks (`#cal-grid`, `#cal-panel`, `#cal-month-label`, `#cal-prev`, `#cal-next`, `#cal-today-btn`, `#cal-month-picker`, `#cal-movable-btn`, `.cal-cell`, `.cal-src-day[data-day]`, `[data-month]`, `.cal-src-movable ul`, `.cal-source`, `.cal-app`) are identical across the island, the page markup, and the e2e tests.
- **No placeholders:** all steps carry concrete code/commands.
- **Security:** the island builds DOM via `createElement`/`textContent`/`replaceChildren` and clones server-escaped source nodes — no `innerHTML`, no HTML string parsing.
