/* Finder facets + filtering/sorting logic (ported from app.js). */

import { valuesOf, cleanName, centuryNum } from "./saints";

export interface FacetDef {
  key: string;
  label: string;
  multi: boolean;
}

/* Facets to expose, in display order. key = data field; multi = array field. */
export const FACETS: FacetDef[] = [
  { key: "intercession", label: "Intercessions", multi: true },
  { key: "experience", label: "Life Experience", multi: true },
  { key: "rank", label: "Rank / Type", multi: true },
  { key: "vocation", label: "Vocation", multi: true },
  { key: "origin", label: "Region of Origin", multi: true },
  { key: "tradition", label: "Tradition of Veneration", multi: true },
  { key: "era", label: "Era", multi: false },
  { key: "century", label: "Century", multi: false },
  { key: "gender", label: "Gender", multi: false },
  // Group-taxonomy membership (data/saint_groups.csv). Options are group names;
  // most saints carry none, so the option list stays short. Generic path.
  { key: "groupNames", label: "Group", multi: true },
  // Curated cross-cut over the facets above. Its options are slugs (not the
  // human label) and it is rendered as a bespoke grouped block in
  // FacetSidebar, not via the generic facetCounts() path.
  { key: "themes", label: "Themes", multi: true },
];

export const OPEN_BY_DEFAULT = new Set(["intercession", "experience"]);
export const PER_PAGE = 24;

type FacetSource = Record<string, unknown>;
export type Selected = Record<string, Set<string>>;

export function emptySelected(): Selected {
  const sel: Selected = {};
  FACETS.forEach((f) => (sel[f.key] = new Set()));
  return sel;
}

export function activeCount(selected: Selected): number {
  return FACETS.reduce((n, f) => n + selected[f.key].size, 0);
}

/* Does a saint pass the free-text query AND the selected facets? */
export function matches(
  saint: FacetSource & { search?: string; name?: string },
  query: string,
  selected: Selected,
): boolean {
  if (query) {
    const hay = (saint.search || saint.name || "").toLowerCase();
    for (const tok of query.toLowerCase().split(/\s+/))
      if (tok && !hay.includes(tok)) return false;
  }
  for (const facet of FACETS) {
    const chosen = selected[facet.key];
    if (chosen.size === 0) continue;
    const vals = valuesOf(saint, facet.key);
    if (![...chosen].some((c) => vals.includes(c))) return false;
  }
  return true;
}

export type SortMode = "feast" | "name" | "century";

/* The comparator behind a given sort mode (shared by sortSaints and the
   relevance tiebreak). */
function sortComparator<T extends { feastSort?: number; name: string }>(
  sortMode: SortMode,
): (a: T, b: T) => number {
  if (sortMode === "name")
    return (a, b) => cleanName(a.name).localeCompare(cleanName(b.name));
  if (sortMode === "century")
    return (a, b) =>
      centuryNum(a as { century?: string; era?: string }) -
        centuryNum(b as { century?: string; era?: string }) ||
      (a.feastSort || 0) - (b.feastSort || 0);
  return (a, b) =>
    (a.feastSort || 9999) - (b.feastSort || 9999) ||
    cleanName(a.name).localeCompare(cleanName(b.name));
}

export function sortSaints<T extends { feastSort?: number; name: string }>(
  list: T[],
  sortMode: SortMode,
): T[] {
  return list.slice().sort(sortComparator(sortMode));
}

/* Facet value -> count across a saint list, sorted by count then label.
   Extracted from app.js buildFacets(). */
export function facetCounts(
  saints: FacetSource[],
  key: string,
): [string, number][] {
  const counts = new Map<string, number>();
  for (const s of saints)
    for (const v of valuesOf(s, key)) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}
