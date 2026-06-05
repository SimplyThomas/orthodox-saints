/* Saint data utilities (ported from app.js). Typed loosely so they work for
   both the full Saint record and the trimmed FinderSaint projection. */

import { cleanName } from "./names";

type FacetSource = Record<string, unknown>;

/* All values of a field as an array (single values become a 1-element array). */
export function valuesOf(saint: FacetSource, key: string): string[] {
  const v = saint[key];
  if (Array.isArray(v)) return v as string[];
  return v ? [v as string] : [];
}

export function rankSlug(s: { rank?: string[] }): string {
  const r = (s.rank && s.rank[0]) || "";
  return (
    "t-" +
    r
      .toLowerCase()
      .replace(/[^a-z]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

export function primaryRank(s: { rank?: string[] }): string {
  return (s.rank && s.rank[0]) || "Saint";
}

export function firstFeast(s: { feast?: string }): string {
  const m = (s.feast || "").match(/([A-Z][a-z]{2})\s+\d{1,2}/);
  return m ? m[0] : (s.feast || "").split(";")[0].trim();
}

export function centuryLabel(s: { century?: string; era?: string }): string {
  if (s.century) return s.century + " c.";
  if ((s.era || "").toLowerCase().includes("old testament")) return "O.T.";
  return s.era || "";
}

export function centuryNum(s: { century?: string; era?: string }): number {
  const c = (s.century || "").trim();
  if (!c)
    return (s.era || "").toLowerCase().includes("old testament") ? -1000 : 9999;
  const bc = /bc/i.test(c);
  const n = parseInt(c, 10);
  if (isNaN(n)) return 9999;
  return bc ? -n : n;
}

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/* Parsed { month, day } feast dates from a feast string. */
export function feastDates(s: { feast?: string }): { m: number; d: number }[] {
  const out: { m: number; d: number }[] = [];
  const re = /([A-Z][a-z]{2})\s+(\d{1,2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s.feast || ""))) {
    const mi = MONTH_ABBR.indexOf(m[1]);
    if (mi >= 0) out.push({ m: mi + 1, d: +m[2] });
  }
  return out;
}

export { cleanName };
