/* Pure month-grid date math for the calendar island. No DOM, no clock state —
   everything is a function of (year, month) so it can be unit-tested directly.
   `month` is 1-12 throughout; weekday is 0=Sunday .. 6=Saturday.
   Local-time Date constructors are intentional — a calendar shown in the visitor's local time, not UTC. */

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

/* Old Calendar (Julian) support. A fixed feast keeps the same CHURCH date on
   both calendars (St. Nicholas is Dec 6 for everyone); what differs is the
   civil day it falls on — 13 days later for Julian-reckoning churches. The
   offset is constant for civil dates Mar 1900 – Feb 2100 (it becomes 14 after
   Feb 2100, when the Julian calendar takes a leap day the Gregorian skips). */
export const JULIAN_OFFSET_DAYS = 13;

export interface ChurchDate {
  year: number;
  month: number;
  day: number;
}

/** The Julian ("Old Style") church date that falls on the given civil day. */
export function civilToChurch(
  year: number,
  month: number,
  day: number,
): ChurchDate {
  const dt = new Date(year, month - 1, day - JULIAN_OFFSET_DAYS);
  return {
    year: dt.getFullYear(),
    month: dt.getMonth() + 1,
    day: dt.getDate(),
  };
}
