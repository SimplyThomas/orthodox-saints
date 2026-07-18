/* Build iCal event models for the New/Old Calendar feeds from the saints and
   feasts data. Pure + unit-tested; reuses the codebase's date logic.
   NOTE: imports are added incrementally per task so no commit carries an
   unused import (eslint no-unused-vars). Task 2 needs only MONTHS. */
import { MONTHS } from "./format";

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
