# iCal Calendar Subscription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Work in an isolated worktree created via superpowers:using-git-worktrees.

**Goal:** Ship two subscribable `.ics` calendar feeds — **New Calendar** and **Old Calendar** — each carrying the liturgical **feasts & fasts** plus one aggregated **"commemorations of the day"** event per day, so a parishioner can subscribe in Google/Apple/Outlook and see the feast + saints of the day in the app they already use.

**Architecture:** Two static, pre-rendered Astro endpoints (`/calendar/new.ics`, `/calendar/old.ics`) emitted at build time from the existing `public/data.json` (saints) and `public/feasts.json` (feasts + 2020–2040 Pascha table). Pure, unit-tested libs do the work: an RFC 5545 serializer (`src/lib/ical.ts`) and a feed builder (`src/lib/calendar-feed.ts`) that reuses the codebase's existing date logic — `resolveToken()` for movable feasts and `oldCalendarDay()` (+13 O.S./N.S.) for the Old-Calendar civil shift. Fixed-date events use `RRULE:FREQ=YEARLY` (one recurring VEVENT); movable feasts emit one dated VEVENT per year in the Pascha window. No backend, no subscriber storage, no ongoing cost.

**Tech Stack:** Astro static endpoints (`APIRoute`, `prerender`), TypeScript, Vitest (unit), Playwright (e2e). Reuses `src/lib/feast-dates.ts`, `src/lib/calendar-grid.ts`, `src/lib/feasts.ts`, `src/lib/data.ts`, `src/lib/format.ts`.

---

## Domain facts the engineer must know (read before starting)

- **The data is stored on the New (Revised Julian) calendar.** Fixed feast/saint dates (`"Dec 25"`, `"Sep 4"`) are the New-Calendar civil dates.
- **New vs Old Calendar difference:** Orthodox parishes on the Old (Julian) calendar keep the *same church date* but it lands on a **civil day 13 days later** (St Nicholas: church Dec 6 → civil Dec 6 New / **Dec 19 Old**; Nativity: church Dec 25 → civil Dec 25 New / **Jan 7 Old**). This +13 shift applies to **fixed** dates only.
- **Movable (Pascha-anchored) feasts are the SAME civil date on both calendars** — Orthodox Pascha is shared. So `paschal`-type tokens are NOT shifted for the Old feed.
- **`anchored` tokens** (`"Sun before Dec 25"`) are relative to a fixed church date, so for the Old feed their anchor shifts +13 (then the weekday is found) — implemented by shifting the anchor month/day with `oldCalendarDay()` before resolving.
- **The Pascha table covers 2020–2040** (`public/feasts.json` → `pascha`). Movable events can only be resolved in that window. Use `PASCHA_YEARS = 2020..2040`.
- **Build order:** `python build.py --no-xlsx` MUST run before `astro build` (it writes `public/data.json` + `public/feasts.json` that the libs read). The Makefile targets already chain this.

## Existing code to reuse (do NOT reimplement)

| Need | Reuse | Signature / shape |
|---|---|---|
| Movable feast → real date | `resolveToken` in `src/lib/feast-dates.ts` | `resolveToken(token: DateToken, year: number, pascha: PaschaTable): Date \| null` |
| Feast records + Pascha table | `FEASTS`, `PASCHA` in `src/lib/feasts.ts` | `FEASTS: Feast[]` (`.id`, `.name`, `.brief`, `.begins`, `.ends?`, `.category`, `.fasting?`), `PASCHA: PaschaTable` |
| Saint records | `SAINTS` in `src/lib/data.ts` | each has `.id` (`"OS-####"`), `.name` (string), `.feast` (string like `"Sep 4; Dec 10"`, may be empty) |
| +13 Old-Calendar civil day | `oldCalendarDay` in `src/lib/calendar-grid.ts` | `oldCalendarDay(month, day): { month, day }` |
| Month abbrev → index | `MONTHS` in `src/lib/format.ts` | `MONTHS = ["Jan",...,"Dec"]`; parse via `MONTHS.indexOf(abbr)` |
| DateToken type | `src/lib/feast-dates.ts` | `{type:"fixed",month,day} \| {type:"paschal",offset} \| {type:"anchored",dow,rel,month,day}` |
| Static endpoint pattern | `src/pages/search-index.json.ts`, `src/pages/finder-data/[hash].json.ts` | `export const prerender = true; export const GET: APIRoute = (ctx) => new Response(body, { headers })` |
| Absolute site URL | endpoint `context.site` (Astro config `site: https://orthodoxsaintfinder.com`) | `new URL("saint/OS-0007", context.site).href` |

---

## File Structure

- **Create** `src/lib/ical.ts` — pure RFC 5545 serializer: text escaping, 75-octet line folding, all-day `DATE` formatting, one `IcalEvent` model → VEVENT, and `buildCalendar()` → full VCALENDAR string. No project types; fully unit-testable.
- **Create** `src/lib/ical.test.ts` — Vitest unit tests for the serializer.
- **Create** `src/lib/calendar-feed.ts` — builds `IcalEvent[]` for a given style (`"new" | "old"`): `feastEvents()`, `saintDayEvents()`, plus the `parseFeastDays()` helper. Reuses the table above.
- **Create** `src/lib/calendar-feed.test.ts` — Vitest unit tests for the feed builder.
- **Create** `src/pages/calendar/[style].ics.ts` — the two static endpoints (`/calendar/new.ics`, `/calendar/old.ics`) via `getStaticPaths`.
- **Create** `src/pages/subscribe.astro` — human page explaining the feeds with copy URLs + "Add to Google / Apple / Outlook" buttons.
- **Modify** `src/lib/nav.ts` — add "Subscribe" under **The Church Year** so people can find it.
- **Modify** `src/pages/calendar.astro` — a small "Subscribe to this calendar" callout linking `/subscribe`.
- **Modify** `e2e/smoke.spec.ts` — add a smoke test hitting both `.ics` endpoints.
- **Modify** `CLAUDE.md` §2 (routes list) + §5a (mention the feeds).

---

## Task 1: RFC 5545 serializer (`src/lib/ical.ts`)

**Files:**
- Create: `src/lib/ical.ts`
- Test: `src/lib/ical.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/ical.test.ts
import { describe, it, expect } from "vitest";
import { escapeText, foldLine, formatDate, eventToVevent, buildCalendar } from "./ical";

describe("escapeText", () => {
  it("escapes backslash, comma, semicolon and newline", () => {
    expect(escapeText("a,b; c\\d\ne")).toBe("a\\,b\\; c\\\\d\\ne");
  });
});

describe("foldLine", () => {
  it("leaves short lines untouched", () => {
    expect(foldLine("SUMMARY:Pascha")).toBe("SUMMARY:Pascha");
  });
  it("folds lines longer than 75 octets with CRLF + space", () => {
    const long = "DESCRIPTION:" + "x".repeat(200);
    const folded = foldLine(long);
    expect(folded).toContain("\r\n ");
    // every physical line is <= 75 chars
    for (const seg of folded.split("\r\n")) expect(seg.length).toBeLessThanOrEqual(75);
  });
});

describe("formatDate", () => {
  it("formats a local date as YYYYMMDD", () => {
    expect(formatDate(new Date(2027, 0, 7))).toBe("20270107"); // Jan 7 2027
  });
});

describe("eventToVevent", () => {
  it("emits an all-day VEVENT with a yearly RRULE and escaped summary", () => {
    const v = eventToVevent({
      uid: "saintday-12-06-new@orthodoxsaintfinder.com",
      start: new Date(2020, 11, 6),
      allDay: true,
      recurYearly: true,
      summary: "St Nicholas, a, b",
      description: "line1\nline2",
      url: "https://orthodoxsaintfinder.com/saint/OS-0007",
    });
    expect(v).toContain("BEGIN:VEVENT");
    expect(v).toContain("UID:saintday-12-06-new@orthodoxsaintfinder.com");
    expect(v).toContain("DTSTART;VALUE=DATE:20201206");
    expect(v).toContain("DTEND;VALUE=DATE:20201207"); // exclusive end = start + 1 day
    expect(v).toContain("RRULE:FREQ=YEARLY");
    expect(v).toContain("SUMMARY:St Nicholas\\, a\\, b");
    expect(v).toContain("URL:https://orthodoxsaintfinder.com/saint/OS-0007");
    expect(v).toContain("END:VEVENT");
  });
});

describe("buildCalendar", () => {
  it("wraps events with VCALENDAR headers and the calendar name", () => {
    const cal = buildCalendar({ name: "Test Cal", events: [] });
    expect(cal.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(cal).toContain("VERSION:2.0");
    expect(cal).toContain("X-WR-CALNAME:Test Cal");
    expect(cal.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(cal.includes("\n") && cal.includes("\r\n")).toBe(true); // CRLF line endings
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:unit -- ical`
Expected: FAIL — `Cannot find module './ical'`.

- [ ] **Step 3: Implement `src/lib/ical.ts`**

```ts
/* Minimal, dependency-free RFC 5545 (iCalendar) serializer. Pure functions,
   unit-tested; no project types. Emits CRLF line endings and 75-octet line
   folding as the spec requires. All-day events only (this project has no
   times); DTEND is the exclusive next day. */

export interface IcalEvent {
  /** Globally-unique, STABLE across rebuilds (so subscribers don't get dupes). */
  uid: string;
  /** All-day start date (local Y/M/D; only the date part is used). */
  start: Date;
  allDay: true;
  /** true → one VEVENT with RRULE:FREQ=YEARLY; false → a single dated event. */
  recurYearly: boolean;
  summary: string;
  description?: string;
  url?: string;
}

/** Escape a TEXT value per RFC 5545 §3.3.11 (order matters: backslash first). */
export function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold a content line to <=75 octets with CRLF + single leading space. */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  // First segment 75, continuations 74 (a leading space costs one octet).
  parts.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
}

/** Local date → YYYYMMDD (all-day DATE value). */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function addOneDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

export function eventToVevent(e: IcalEvent): string {
  const lines: string[] = ["BEGIN:VEVENT", `UID:${e.uid}`];
  lines.push(`DTSTART;VALUE=DATE:${formatDate(e.start)}`);
  lines.push(`DTEND;VALUE=DATE:${formatDate(addOneDay(e.start))}`);
  if (e.recurYearly) lines.push("RRULE:FREQ=YEARLY");
  lines.push(`SUMMARY:${escapeText(e.summary)}`);
  if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
  if (e.url) lines.push(`URL:${e.url}`);
  lines.push("TRANSP:TRANSPARENT"); // all-day observances shouldn't block "busy"
  lines.push("END:VEVENT");
  return lines.map(foldLine).join("\r\n");
}

export function buildCalendar(opts: { name: string; events: IcalEvent[] }): string {
  const head = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cloud of Witnesses//Orthodox Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.name)}`,
    "X-PUBLISHED-TTL:PT12H", // clients may refresh twice a day
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
  ].map(foldLine);
  const body = opts.events.map(eventToVevent);
  return [...head, ...body, "END:VCALENDAR"].join("\r\n") + "\r\n";
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:unit -- ical`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ical.ts src/lib/ical.test.ts
git commit -m "feat(ical): RFC 5545 serializer for calendar feeds"
```

---

## Task 2: `parseFeastDays()` — saint feast string → dates

**Files:**
- Create: `src/lib/calendar-feed.ts` (start it here; more added in Task 3)
- Test: `src/lib/calendar-feed.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/calendar-feed.test.ts
import { describe, it, expect } from "vitest";
import { parseFeastDays } from "./calendar-feed";

describe("parseFeastDays", () => {
  it("parses a multi-date feast string to {month, day}", () => {
    expect(parseFeastDays("Sep 4; Dec 10")).toEqual([
      { month: 9, day: 4 },
      { month: 12, day: 10 },
    ]);
  });
  it("returns [] for blank or unparseable input", () => {
    expect(parseFeastDays("")).toEqual([]);
    expect(parseFeastDays("Movable")).toEqual([]);
  });
  it("ignores tokens it cannot parse but keeps the good ones", () => {
    expect(parseFeastDays("Jan 1; ???")).toEqual([{ month: 1, day: 1 }]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- calendar-feed`
Expected: FAIL — `Cannot find module './calendar-feed'`.

- [ ] **Step 3: Implement `parseFeastDays` in `src/lib/calendar-feed.ts`**

```ts
/* Build iCal event models for the New/Old Calendar feeds from the saints and
   feasts data. Pure + unit-tested; reuses the codebase's date logic.
   NOTE: imports are added incrementally per task so no commit carries an
   unused import (eslint no-unused-vars). Task 2 needs only MONTHS. */
import { MONTHS } from "./format";

export type CalendarStyle = "new" | "old";

/** Parse a saint "Feast Day(s)" string ("Sep 4; Dec 10") into fixed dates.
    Anything that isn't a "Mon D" token is dropped (blank/movable/odd rows). */
export function parseFeastDays(feast: string): { month: number; day: number }[] {
  if (!feast) return [];
  const out: { month: number; day: number }[] = [];
  for (const part of feast.split(";")) {
    const m = part.trim().match(/^([A-Z][a-z]{2})\s+(\d{1,2})$/);
    if (!m) continue;
    const month = MONTHS.indexOf(m[1]) + 1;
    const day = Number(m[2]);
    if (month >= 1 && day >= 1 && day <= 31) out.push({ month, day });
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:unit -- calendar-feed`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar-feed.ts src/lib/calendar-feed.test.ts
git commit -m "feat(calendar-feed): parse saint feast-day strings"
```

---

## Task 3: `saintDayEvents()` — aggregated "commemorations of the day"

**Files:**
- Modify: `src/lib/calendar-feed.ts`
- Test: `src/lib/calendar-feed.test.ts`

**Design:** group every saint by the civil {month, day} its feast falls on for the chosen style (New = as parsed; Old = `oldCalendarDay(month, day)`), then emit **one** all-day yearly-recurring VEVENT per day. SUMMARY = principal name + " & N others"; DESCRIPTION = every name with its absolute URL. A saint with several feast days appears on each. Skip saints with no parseable feast.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/lib/calendar-feed.test.ts
import { saintDayEvents } from "./calendar-feed";

const SAINTS_FIXTURE = [
  { id: "OS-0007", name: "Nicholas the Wonderworker", feast: "Dec 6" },
  { id: "OS-0100", name: "Abramios the Recluse", feast: "Dec 6" },
  { id: "OS-0200", name: "No Feast", feast: "" },
];

describe("saintDayEvents", () => {
  it("aggregates one event per day (New calendar) with count in the summary", () => {
    const evs = saintDayEvents(SAINTS_FIXTURE, "new", "https://x.test/");
    expect(evs).toHaveLength(1);
    const e = evs[0];
    expect(e.start.getMonth()).toBe(11); // December
    expect(e.start.getDate()).toBe(6);
    expect(e.recurYearly).toBe(true);
    expect(e.summary).toMatch(/Nicholas the Wonderworker/);
    expect(e.summary).toMatch(/1 other/);
    expect(e.description).toContain("https://x.test/saint/OS-0007");
    expect(e.uid).toBe("saintday-12-06-new@orthodoxsaintfinder.com");
  });
  it("shifts the day +13 for the Old calendar (Dec 6 -> Dec 19)", () => {
    const evs = saintDayEvents(SAINTS_FIXTURE, "old", "https://x.test/");
    expect(evs[0].start.getDate()).toBe(19);
    expect(evs[0].uid).toBe("saintday-12-19-old@orthodoxsaintfinder.com");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- calendar-feed`
Expected: FAIL — `saintDayEvents is not a function`.

- [ ] **Step 3: Implement `saintDayEvents` in `src/lib/calendar-feed.ts`**

```ts
// add these imports at the top (MONTHS already imported in Task 2):
import { oldCalendarDay } from "./calendar-grid";
import type { IcalEvent } from "./ical";

interface SaintLike {
  id: string;
  name: string;
  feast: string;
}

const key = (m: number, d: number) => `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** One aggregated all-day event per calendar day listing that day's saints.
    `siteBase` is the absolute site origin with trailing slash (e.g. the value
    of context.site). Base recurrence year is 2020 (arbitrary; RRULE yearly). */
export function saintDayEvents(
  saints: SaintLike[],
  style: CalendarStyle,
  siteBase: string,
): IcalEvent[] {
  const byDay = new Map<string, { m: number; d: number; saints: SaintLike[] }>();
  for (const s of saints) {
    for (const fd of parseFeastDays(s.feast)) {
      const civ = style === "old" ? oldCalendarDay(fd.month, fd.day) : fd;
      const k = key(civ.month, civ.day);
      if (!byDay.has(k)) byDay.set(k, { m: civ.month, d: civ.day, saints: [] });
      byDay.get(k)!.saints.push(s);
    }
  }
  const events: IcalEvent[] = [];
  for (const { m, d, saints: list } of byDay.values()) {
    const primary = list[0];
    const others = list.length - 1;
    const summary =
      others > 0
        ? `☦ ${primary.name} & ${others} other${others > 1 ? "s" : ""}`
        : `☦ ${primary.name}`;
    const description = list
      .map((s) => `${s.name} — ${new URL(`saint/${s.id}`, siteBase).href}`)
      .join("\n");
    events.push({
      uid: `saintday-${key(m, d)}-${style}@orthodoxsaintfinder.com`,
      start: new Date(2020, m - 1, d),
      allDay: true,
      recurYearly: true,
      summary,
      description,
    });
  }
  return events;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:unit -- calendar-feed`
Expected: PASS (5 tests total in the file).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar-feed.ts src/lib/calendar-feed.test.ts
git commit -m "feat(calendar-feed): aggregated commemorations-of-the-day events"
```

---

## Task 4: `feastEvents()` — the 83 feasts & fasts

**Files:**
- Modify: `src/lib/calendar-feed.ts`
- Test: `src/lib/calendar-feed.test.ts`

**Design:**
- **Fixed** feast → one yearly-recurring VEVENT. New: the stored `{month,day}`. Old: `oldCalendarDay(month,day)`.
- **Movable** feast (`paschal`, or `anchored`) → one dated VEVENT **per year** in the Pascha window (`resolveToken` per year). Movable feasts are the SAME civil date on both calendars, EXCEPT `anchored` feasts whose fixed anchor shifts +13 on Old — handle by resolving with an Old-shifted anchor.
- Fasts (category "Fast Season"/"Fast Day") are just feasts with a `.fasting` field; include them (the church-year calendar wants them).

- [ ] **Step 1: Write the failing test**

```ts
// append to src/lib/calendar-feed.test.ts
import { feastEvents } from "./calendar-feed";
import type { PaschaTable } from "./feast-dates";

const PASCHA: PaschaTable = { "2027": "2027-05-02" }; // Orthodox Pascha 2027

const NATIVITY = {
  id: "FF-0013", name: "Nativity of Christ", brief: "",
  begins: { type: "fixed", month: 12, day: 25 } as const,
};
const PASCHA_FEAST = {
  id: "FF-0001", name: "Pascha", brief: "",
  begins: { type: "paschal", offset: 0 } as const,
};

describe("feastEvents", () => {
  it("fixed feast → one yearly-recurring event; Old shifts +13", () => {
    const [nvNew] = feastEvents([NATIVITY as any], "new", PASCHA, [2027]);
    expect(nvNew.recurYearly).toBe(true);
    expect(nvNew.start.getMonth()).toBe(11); // Dec
    expect(nvNew.start.getDate()).toBe(25);

    const [nvOld] = feastEvents([NATIVITY as any], "old", PASCHA, [2027]);
    expect(nvOld.start.getMonth()).toBe(0); // Jan
    expect(nvOld.start.getDate()).toBe(7);  // Old Nativity civil day
  });
  it("movable feast → one dated (non-recurring) event per year, same civil date both styles", () => {
    const evNew = feastEvents([PASCHA_FEAST as any], "new", PASCHA, [2027]);
    const evOld = feastEvents([PASCHA_FEAST as any], "old", PASCHA, [2027]);
    expect(evNew).toHaveLength(1);
    expect(evNew[0].recurYearly).toBe(false);
    expect(evNew[0].start).toEqual(new Date(2027, 4, 2)); // May 2 2027
    expect(evOld[0].start).toEqual(evNew[0].start);       // Pascha shared
    expect(evNew[0].uid).toBe("feast-FF-0001-2027-new@orthodoxsaintfinder.com");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:unit -- calendar-feed`
Expected: FAIL — `feastEvents is not a function`.

- [ ] **Step 3: Implement `feastEvents` in `src/lib/calendar-feed.ts`**

```ts
// add these imports at top (oldCalendarDay + IcalEvent already imported in Task 3):
import { resolveToken, type PaschaTable, type DateToken } from "./feast-dates";
import type { Feast } from "./feasts";

/** Shift an anchored/fixed token's ANCHOR by +13 civil days for the Old feed. */
function oldShiftToken(token: DateToken): DateToken {
  if (token.type === "paschal") return token; // shared Pascha, no shift
  const oc = oldCalendarDay(token.month, token.day);
  return { ...token, month: oc.month, day: oc.day };
}

export function feastEvents(
  feasts: Feast[],
  style: CalendarStyle,
  pascha: PaschaTable,
  years: number[],
): IcalEvent[] {
  const events: IcalEvent[] = [];
  for (const f of feasts) {
    const token = style === "old" ? oldShiftToken(f.begins) : f.begins;
    const summary = `☦ ${f.name}`;
    const description = f.brief || undefined;
    if (token.type === "fixed") {
      // One recurring event; base year is the first in range.
      const d = resolveToken(token, years[0], pascha);
      if (!d) continue;
      events.push({
        uid: `feast-${f.id}-${style}@orthodoxsaintfinder.com`,
        start: d, allDay: true, recurYearly: true, summary, description,
      });
    } else {
      // Movable: one dated event per year in the Pascha window.
      for (const y of years) {
        const d = resolveToken(token, y, pascha);
        if (!d) continue;
        events.push({
          uid: `feast-${f.id}-${y}-${style}@orthodoxsaintfinder.com`,
          start: d, allDay: true, recurYearly: false, summary, description,
        });
      }
    }
  }
  return events;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:unit -- calendar-feed`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar-feed.ts src/lib/calendar-feed.test.ts
git commit -m "feat(calendar-feed): feast/fast events (fixed RRULE + movable per-year)"
```

---

## Task 5: The two `.ics` endpoints (`/calendar/new.ics`, `/calendar/old.ics`)

**Files:**
- Create: `src/pages/calendar/[style].ics.ts`

- [ ] **Step 1: Implement the endpoint** (no unit test — covered by the e2e in Task 7)

```ts
// src/pages/calendar/[style].ics.ts
import type { APIRoute, GetStaticPaths } from "astro";
import { SAINTS } from "../../lib/data";
import { FEASTS, PASCHA } from "../../lib/feasts";
import { feastEvents, saintDayEvents, type CalendarStyle } from "../../lib/calendar-feed";
import { buildCalendar } from "../../lib/ical";

export const prerender = true;

// Movable feasts resolve only inside the Pascha table window.
const YEARS = Array.from({ length: 2040 - 2020 + 1 }, (_, i) => 2020 + i);

export const getStaticPaths = (() => [
  { params: { style: "new" } },
  { params: { style: "old" } },
]) satisfies GetStaticPaths;

export const GET: APIRoute = (context) => {
  const style = context.params.style as CalendarStyle;
  const siteBase = context.site!.href; // e.g. https://orthodoxsaintfinder.com/
  const name =
    style === "old"
      ? "Orthodox Saints & Feasts (Old Calendar)"
      : "Orthodox Saints & Feasts (New Calendar)";
  const events = [
    ...feastEvents(FEASTS, style, PASCHA, YEARS),
    ...saintDayEvents(
      SAINTS.map((s) => ({ id: s.id, name: s.name, feast: s.feast ?? "" })),
      style,
      siteBase,
    ),
  ];
  const body = buildCalendar({ name, events });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="orthodox-calendar-${style}.ics"`,
    },
  });
};
```

> **Note for the engineer:** confirm `SAINTS` is exported from `src/lib/data.ts` and each record has `.feast`. If the export is named differently (e.g. `FINDER_SAINTS`), use that and map to `{id,name,feast}`. Group records (profile_type "group") without a `.feast` are naturally skipped by `parseFeastDays`.

- [ ] **Step 2: Build and verify the endpoints emit valid calendars**

```bash
python build.py --no-xlsx && npm run build
```
Expected: build succeeds; `_site/calendar/new.ics` and `_site/calendar/old.ics` exist.

```bash
head -20 _site/calendar/new.ics
grep -c "BEGIN:VEVENT" _site/calendar/new.ics   # expect a few thousand
grep -A2 "Nativity of Christ" _site/calendar/old.ics | grep DTSTART  # expect ...0107 (Jan 7)
```
Expected: starts `BEGIN:VCALENDAR`; Nativity in the Old feed is dated `...0107`.

- [ ] **Step 3: Validate against an iCal validator (adversarial check — dispatch a subagent)**

Dispatch a subagent: "Read `_site/calendar/new.ics`. Check it against RFC 5545: every `BEGIN:` has a matching `END:`, all lines are CRLF-terminated and ≤75 octets (accounting for folding), `DTSTART`/`DTEND` are valid `VALUE=DATE`, every `VEVENT` has a `UID`, and `SUMMARY`/`DESCRIPTION` special chars are escaped. Report any violation with the offending line." Fix anything it finds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/calendar/[style].ics.ts
git commit -m "feat(calendar): /calendar/new.ics + /calendar/old.ics feeds"
```

---

## Task 6: Subscribe page + discoverability

**Files:**
- Create: `src/pages/subscribe.astro`
- Modify: `src/lib/nav.ts` (add under "The Church Year")
- Modify: `src/pages/calendar.astro` (callout linking `/subscribe`)

- [ ] **Step 1: Create `src/pages/subscribe.astro`**

Use `BaseLayout` and `withBase`. Show both feeds with a copy-able absolute URL and add-to-calendar buttons. Google: `https://calendar.google.com/calendar/r?cid=<url-encoded webcal URL>`. Apple/Outlook: a `webcal://` link (same URL with `webcal://` scheme). Keep styling component-scoped.

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { withBase } from "../lib/format";

const origin = Astro.site?.href.replace(/\/$/, "") ?? "";
const feeds = [
  { style: "new", label: "New Calendar (Revised Julian)",
    blurb: "For parishes on the new calendar — fixed feasts on their civil date." },
  { style: "old", label: "Old Calendar (Julian)",
    blurb: "For parishes on the old calendar — fixed feasts 13 days later; Pascha is shared." },
].map((f) => {
  const httpsUrl = `${origin}${withBase(`calendar/${f.style}.ics`)}`;
  const webcal = httpsUrl.replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  return { ...f, httpsUrl, webcal, google };
});
---
<BaseLayout title="Subscribe to the Calendar" description="Add the Orthodox feasts, fasts, and saints of the day to your own calendar app.">
  <section class="sub">
    <h1>Subscribe to the Church Calendar</h1>
    <p>Add the feasts, fasts, and daily commemorations to Google, Apple, or Outlook
       Calendar — each day shows the feast and the saints commemorated, with links
       back to their pages. Choose the calendar your parish keeps.</p>
    {feeds.map((f) => (
      <div class="feed">
        <h2>{f.label}</h2>
        <p>{f.blurb}</p>
        <div class="acts">
          <a class="btn btn--gold" href={f.webcal}>Add to Apple / Outlook</a>
          <a class="btn btn--ghost" href={f.google} target="_blank" rel="noopener">Add to Google</a>
        </div>
        <label class="url">Or copy this URL into your calendar app:
          <input type="text" readonly value={f.httpsUrl} onclick="this.select()" />
        </label>
      </div>
    ))}
  </section>
</BaseLayout>
<style>
  .sub { max-width: 46rem; margin: 0 auto; padding: 2rem clamp(16px,4vw,40px) 4rem; }
  .feed { border: 1px solid var(--line-gold); border-radius: 8px; padding: 1.2rem 1.3rem; margin: 1.2rem 0; background: var(--ivory-2); }
  .feed h2 { font-family: var(--serif); color: var(--byz-deep); margin: 0 0 .3rem; }
  .acts { display: flex; gap: .6rem; flex-wrap: wrap; margin: .8rem 0; }
  .url { display: block; font-size: .85rem; color: var(--ink-soft); }
  .url input { width: 100%; margin-top: .3rem; padding: .5rem .6rem; border: 1px solid var(--line); border-radius: 6px; font: inherit; }
</style>
```

- [ ] **Step 2: Add the nav entry** — in `src/lib/nav.ts`, inside the `feasts-fasts` (The Church Year) `children`, after the moveable-calendar entry:

```ts
{ key: "subscribe", label: "Subscribe (iCal)", href: withBase("subscribe") },
```

- [ ] **Step 3: Add a callout on `src/pages/calendar.astro`** — near the top of the calendar body, a small linked note:

```astro
<p class="cal-subscribe-note">
  📅 <a href={withBase("subscribe")}>Subscribe to this calendar</a> in Google, Apple, or Outlook.
</p>
```
(Style it minimally in the page's `<style>` — e.g. muted, small, margin below the heading.)

- [ ] **Step 4: Lint + build**

Run: `npm run lint && python build.py --no-xlsx && npm run build`
Expected: clean; `_site/subscribe/index.html` exists and shows both feeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/subscribe.astro src/lib/nav.ts src/pages/calendar.astro
git commit -m "feat(calendar): subscribe page + nav/calendar discoverability"
```

---

## Task 7: e2e smoke test

**Files:**
- Modify: `e2e/smoke.spec.ts`

- [ ] **Step 1: Add the test** (append near the other route tests; `BASE` is already defined in the file)

```ts
test("iCal feeds are served and reckon Old vs New correctly", async ({ request }) => {
  for (const style of ["new", "old"]) {
    const res = await request.get(`${BASE}calendar/${style}.ics`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("BEGIN:VEVENT");
    expect(body.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  }
  // Nativity is Dec 25 on New, Jan 7 on Old.
  const newBody = await (await request.get(`${BASE}calendar/new.ics`)).text();
  const oldBody = await (await request.get(`${BASE}calendar/old.ics`)).text();
  expect(newBody).toMatch(/Nativity of Christ[\s\S]*?DTSTART;VALUE=DATE:\d{4}1225/);
  expect(oldBody).toMatch(/Nativity of Christ[\s\S]*?DTSTART;VALUE=DATE:\d{4}0107/);
});

test("the subscribe page lists both feeds", async ({ page }) => {
  const res = await page.goto("./subscribe/");
  expect(res?.status()).toBe(200);
  await expect(page.locator(".feed")).toHaveCount(2);
  await expect(page.locator('input[value$="calendar/new.ics"]')).toHaveCount(1);
  await expect(page.locator('input[value$="calendar/old.ics"]')).toHaveCount(1);
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `npm run build && npm test` (build first so `_site` is current)
Expected: the two new tests PASS. (Note: the pre-existing `smoke.spec.ts:*"header quick-search"` `.hs-panel` test may fail locally — it is a known pre-existing issue unrelated to this work; see memory "Witness e2e stale". Confirm ONLY that test fails, nothing new.)

- [ ] **Step 3: Commit**

```bash
git add e2e/smoke.spec.ts
git commit -m "test(e2e): iCal feeds + subscribe page smoke tests"
```

---

## Task 8: Docs

**Files:**
- Modify: `CLAUDE.md` (§2 routes list; §5a Feasts frontend note)

- [ ] **Step 1: Update `CLAUDE.md`**

In §2's `pages/` route list, add `subscribe` and the `calendar/[style].ics` feeds. In §5a's "Frontend (shipped)" paragraph, add a sentence: "Two subscribable iCal feeds — `/calendar/new.ics` and `/calendar/old.ics` (New/Old calendar) — carry the feasts + an aggregated 'commemorations of the day' event, built by `src/lib/ical.ts` + `src/lib/calendar-feed.ts`; a `/subscribe` page hosts the add-to-calendar buttons."

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note the iCal calendar feeds"
```

---

## Definition of done

- `npm run lint` clean; `npm run test:unit` green (new ical + calendar-feed suites pass); `npm run build` succeeds and emits `_site/calendar/new.ics` + `_site/calendar/old.ics`; `npm test` passes the two new e2e tests (only the pre-existing `.hs-panel` test may be red).
- The Old feed dates Nativity on Jan 7 and St Nicholas on Dec 19; the New feed on Dec 25 / Dec 6; Pascha is the same civil date in both.
- A real subscribe: paste `https://<preview-host>/calendar/new.ics` into Google Calendar ("From URL") and confirm feasts + a "commemorations" entry appear. (Manual, on the PR preview.)
- Open a PR per CLAUDE.md §12 with the Cloudflare preview link.

## Notes, decisions, and deliberately-out-of-scope

- **Decisions baked in:** two feeds split by calendar (New/Old), each combining feasts + one aggregated saint-of-day event; fixed events use `RRULE:FREQ=YEARLY` (small file), movable events are emitted per-year across the 2020–2040 Pascha window; saint feeds cover **fixed** dates only.
- **Out of scope (note in the PR, don't build):** movable *saint* commemorations (rare; saints.csv feasts are fixed strings); per-saint individual events (rejected as calendar clutter); timezone/VTIMEZONE (all-day events need none); a "fasts-only" or per-jurisdiction feed. If the movable window needs to extend past 2040, `pascha.py` covers 1900–2099 — regenerate a wider table in `feasts.json` first.
- **Principal-saint choice:** the SUMMARY's lead name is simply the first saint listed for that day (entry order). A future refinement could lead with the `humanReviewed`/dove saint or a notability flag — left out to keep this cheap.
