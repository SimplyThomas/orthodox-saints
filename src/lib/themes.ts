import catalogRaw from "../../public/themes.json";
import type { Saint } from "./types";

export interface ThemeMeta {
  slug: string;
  group: string;
  label: string;
  desc: string;
  count: number;
}

export const THEME_CATALOG = catalogRaw as unknown as ThemeMeta[];

export const themeBySlug: Map<string, ThemeMeta> = new Map(
  THEME_CATALOG.map((t) => [t.slug, t]),
);

export const THEME_GROUPS = [
  "Life Circumstances",
  "Vocations",
  "Virtues",
  "Struggles & Trials",
  "Historical Themes",
  "Family & Relationships",
  "Miracles & Wonders",
  "Geographic Themes",
];

/** Catalog grouped (THEMES order preserved), keeping only themes with count >= min. */
export function themesByGroup(
  min = 1,
): { group: string; themes: ThemeMeta[] }[] {
  return THEME_GROUPS.map((group) => ({
    group,
    themes: THEME_CATALOG.filter((t) => t.group === group && t.count >= min),
  })).filter((g) => g.themes.length > 0);
}

// Theme groups that read as a *class of saints* (a category one could ask for
// "more of"), as opposed to personal facets (a virtue, a struggle, a life
// circumstance). Only these feed the saint page's "Related Saints" links.
const RELATED_THEME_GROUPS = new Set([
  "Historical Themes",
  "Vocations",
  "Miracles & Wonders",
  "Geographic Themes",
]);

/** "Related Saints" theme links for a saint page: the saint's own theme tags,
 *  restricted to categorical groups, rarest-first (the rarer tag is the more
 *  distinctive "class"), and only where the destination holds enough saints to
 *  be worth a visit. Capped at `n`. */
export function relatedThemeLinks(saint: Saint, n = 6): ThemeMeta[] {
  const out: ThemeMeta[] = [];
  for (const slug of saint.themes || []) {
    const t = themeBySlug.get(slug);
    if (t && RELATED_THEME_GROUPS.has(t.group) && t.count >= 5) out.push(t);
  }
  out.sort((a, b) => a.count - b.count);
  return out.slice(0, n);
}

/** Other saints ranked by count of shared theme slugs (desc), then feastSort. */
export function relatedByThemes(saint: Saint, all: Saint[], n = 6): Saint[] {
  const mine = new Set(saint.themes || []);
  if (mine.size === 0) return [];
  const scored: { overlap: number; s: Saint }[] = [];
  for (const s of all) {
    if (s.id === saint.id) continue;
    let overlap = 0;
    for (const t of s.themes || []) if (mine.has(t)) overlap++;
    if (overlap > 0) scored.push({ overlap, s });
  }
  scored.sort((a, b) => b.overlap - a.overlap || a.s.feastSort - b.s.feastSort);
  return scored.slice(0, n).map((x) => x.s);
}
