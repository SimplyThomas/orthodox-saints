/* Build iCal event models for the New/Old Calendar feeds from the saints and
   feasts data. Pure + unit-tested; reuses the codebase's date logic.
   NOTE: imports are added incrementally per task so no commit carries an
   unused import (eslint no-unused-vars). Task 2 needs only MONTHS. */
import { MONTHS } from "./format";
import { oldCalendarDay } from "./calendar-grid";
import type { IcalEvent } from "./ical";

export type CalendarStyle = "new" | "old";

/** Parse a saint "Feast Day(s)" string ("Sep 4; Dec 10") into fixed dates.
    Anything that isn't a "Mon D" token is dropped (blank/movable/odd rows). */
export function parseFeastDays(
  feast: string,
): { month: number; day: number }[] {
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

interface SaintLike {
  id: string;
  name: string;
  feast: string;
}

const key = (m: number, d: number) =>
  `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** One aggregated all-day event per calendar day listing that day's saints.
    `siteBase` is the absolute site origin with trailing slash (e.g. the value
    of context.site). Base recurrence year is 2020 (arbitrary; RRULE yearly). */
export function saintDayEvents(
  saints: SaintLike[],
  style: CalendarStyle,
  siteBase: string,
): IcalEvent[] {
  const byDay = new Map<
    string,
    { m: number; d: number; saints: SaintLike[] }
  >();
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
