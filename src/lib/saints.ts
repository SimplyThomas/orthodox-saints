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

/* Prominence weighting used to order a day's commemorations (calendar day
   lists, the home "Today" card). Higher weight = more prominent rank; unlisted
   ranks fall to 1. This is the single source of truth — the calendar and the
   home island both read it, so a day leads with the same saint in both. */
export const RANK_W: Record<string, number> = {
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

export function rankWeight(rank: string[] | undefined): number {
  return rank && rank.length ? Math.max(...rank.map((r) => RANK_W[r] ?? 1)) : 1;
}

/* Comparator for "which saint leads this day". Rank weight first, then a
   prominence tie-break so the day's principal saint wins when weights match
   (e.g. Dec 6 leads with the icon-bearing St. Nicholas, not an equally-ranked
   but obscure hierarch): a real portrait, then a filled intercession facet,
   then name. Sorts most-prominent first. */
export interface Prominent {
  rank?: string[];
  name: string;
  image?: string;
  intercession?: string[];
}
export function byProminence(a: Prominent, b: Prominent): number {
  const wa = rankWeight(a.rank);
  const wb = rankWeight(b.rank);
  if (wa !== wb) return wb - wa;
  const ia = a.image ? 1 : 0;
  const ib = b.image ? 1 : 0;
  if (ia !== ib) return ib - ia;
  const ca = a.intercession && a.intercession.length ? 1 : 0;
  const cb = b.intercession && b.intercession.length ? 1 : 0;
  if (ca !== cb) return cb - ca;
  return a.name.localeCompare(b.name);
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
