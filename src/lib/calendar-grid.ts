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
