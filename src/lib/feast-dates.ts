/* Pure date logic for the Feasts & Fasts data (public/feasts.json).
   Client-safe: no fs, no build-time state — the /feasts island imports this
   to resolve the structurally-emitted date tokens (feastlib.py never makes
   the frontend re-parse strings) against the visitor's real clock. The
   movable cycle needs no computus here: feasts.json ships a resolved Pascha
   table (2020–2040), so a paschal offset is plain date arithmetic. */

import { MONTHS } from "./format";

export type DateToken =
  | { type: "fixed"; month: number; day: number }
  | { type: "paschal"; offset: number }
  | {
      type: "anchored";
      dow: number; // JS getDay(): 0=Sun..6=Sat
      rel: "before" | "after";
      month: number;
      day: number;
    };

/** Pascha table from feasts.json: { "2026": "2026-04-12", ... } */
export type PaschaTable = Record<string, string>;

export const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_MS = 86_400_000;

/** Local-midnight Date for y/m/d (m is 1-based). */
function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

/** date + n days, calendar-safe: setDate() rolls months AND absorbs DST
    shifts (raw ms arithmetic lands an hour off across the spring-forward
    boundary, which moves the DATE for negative paschal offsets). */
function addDays(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

function paschaDate(table: PaschaTable, year: number): Date | null {
  const iso = table[String(year)];
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return localDate(y, m, d);
}

/** Resolve a token to a concrete local date in `year`'s cycle (paschal tokens
    use that year's Pascha). Null when the Pascha table doesn't cover `year`. */
export function resolveToken(
  token: DateToken,
  year: number,
  pascha: PaschaTable,
): Date | null {
  if (token.type === "fixed") return localDate(year, token.month, token.day);
  if (token.type === "paschal") {
    const p = paschaDate(pascha, year);
    return p ? addDays(p, token.offset) : null;
  }
  // anchored: the nearest such weekday STRICTLY within 7 days before/after.
  const anchor = localDate(year, token.month, token.day);
  const step = token.rel === "before" ? -1 : 1;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(anchor, step * i);
    if (d.getDay() === token.dow) return d;
  }
  return null; // unreachable: any weekday occurs within 7 days
}

/** The next occurrence of `token` on or after `from` (date-only). */
export function nextOccurrence(
  token: DateToken,
  from: Date,
  pascha: PaschaTable,
): Date | null {
  const today = localDate(
    from.getFullYear(),
    from.getMonth() + 1,
    from.getDate(),
  );
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    const d = resolveToken(token, year, pascha);
    if (d && d.getTime() >= today.getTime()) return d;
  }
  return null;
}

/** Whole days from `from` (date-only) until `date`. 0 = today. */
export function daysUntil(date: Date, from: Date): number {
  const a = localDate(
    from.getFullYear(),
    from.getMonth() + 1,
    from.getDate(),
  ).getTime();
  return Math.round((date.getTime() - a) / DAY_MS);
}

/** Short human form of a token: "Dec 25" · "Pascha" · "P+49" · "Sun before Dec 25". */
export function tokenLabel(token: DateToken): string {
  if (token.type === "fixed") return `${MONTHS[token.month - 1]} ${token.day}`;
  if (token.type === "paschal") {
    if (token.offset === 0) return "Pascha";
    // U+2212 minus for typographic consistency with the design.
    return token.offset > 0 ? `P+${token.offset}` : `P−${-token.offset}`;
  }
  return `${DOW_SHORT[token.dow]} ${token.rel} ${MONTHS[token.month - 1]} ${token.day}`;
}

/** The dateline shown on cards: "Dec 25 · Fixed" / "P+49 · Movable". */
export function tokenDateline(token: DateToken): string {
  if (token.type === "paschal") return `${tokenLabel(token)} · Movable`;
  if (token.type === "anchored") return tokenLabel(token);
  return `${tokenLabel(token)} · Fixed`;
}

/** Grouping month for the liturgical-year listing: a token's fixed/anchored
    month, or null for paschal tokens (they group under the Paschal Cycle). */
export function groupMonth(token: DateToken): number | null {
  return token.type === "paschal" ? null : token.month;
}

/** Sort key within the liturgical year (Sep=first). Paschal entries sort by
    offset inside their own group, so they get a separate large-range key. */
export function liturgicalSort(token: DateToken): number {
  if (token.type === "paschal") return 100_000 + token.offset;
  const m = token.month;
  const monthRank = m >= 9 ? m - 9 : m + 3; // Sep..Dec = 0..3, Jan..Aug = 4..11
  return monthRank * 100 + token.day;
}
