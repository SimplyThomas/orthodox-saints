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

/* ── Relevance ranking ───────────────────────────────────────────────────
   A free-text query is more than a yes/no filter: a reader who types a name
   or title ("Theotokos", "Virgin Mary") expects that saint first, not whoever
   merely mentions the word in a facet or note. scoreMatch grades WHERE the
   query landed — the display name ranks far above the "Also Known As" list,
   which ranks above name variants, which rank above a deep-haystack-only hit
   (the haystack mixes in every facet value, brief, and notes; see build.py).
   sortByRelevance orders by that score, using the reader's chosen SortMode as
   the tiebreak among equally-relevant saints. */

export interface Scorable {
  name: string;
  aka?: string[];
  variants?: string[];
  search?: string;
}

// Field weights. A higher base means a hit there outranks every lower field.
const NAME_BASE = 60; // name: exact 100 / prefix 90 / word 80 / substring 70
const AKA_BASE = 30; // aka:  exact 50  / prefix 45 / word 45 / substring 35
const NAME_TOKENS = 65; // all query words in the name, but not as one phrase
const VARIANT = 20; // matched only via a name variant
const HAYSTACK = 1; // matched only in facets / brief / notes

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Grade of `q` within one text: 4 exact, 3 prefix, 2 whole-word, 1 substring, 0 none.
function grade(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t === q) return 4;
  if (t.startsWith(q)) return 3;
  if (new RegExp(`\\b${escapeRe(q)}\\b`).test(t)) return 2;
  if (t.includes(q)) return 1;
  return 0;
}

function fieldScore(
  text: string,
  q: string,
  base: number,
  step: number,
): number {
  const g = grade(text, q);
  return g ? base + g * step : 0;
}

/* Relevance score of a saint against a (non-empty) query. Higher = better. */
export function scoreMatch(saint: Scorable, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const tokens = q.split(/\s+/).filter(Boolean);

  let score = fieldScore(saint.name, q, NAME_BASE, 10);

  for (const a of saint.aka || [])
    score = Math.max(score, fieldScore(a, q, AKA_BASE, 5));

  // Multi-word query whose every word appears in the name (but not contiguously):
  // strong, but always below a true phrase hit on the name.
  if (tokens.length > 1) {
    const name = saint.name.toLowerCase();
    if (tokens.every((t) => name.includes(t)))
      score = Math.max(score, NAME_TOKENS);
  }

  if (
    score === 0 &&
    (saint.variants || []).some((v) => v.toLowerCase().includes(q))
  )
    score = VARIANT;

  // Haystack fallback: every token present somewhere in the precomputed haystack.
  if (score === 0) {
    const hay = (saint.search || saint.name).toLowerCase();
    if (tokens.every((t) => hay.includes(t))) score = HAYSTACK;
  }
  return score;
}

/* Sort by relevance to `query` (descending), tie-broken by the chosen SortMode.
   Scores are computed once per saint, not on every comparator call. */
export function sortByRelevance<
  T extends Scorable & { feastSort?: number; name: string },
>(list: T[], query: string, sortMode: SortMode): T[] {
  const score = new Map<T, number>();
  for (const s of list) score.set(s, scoreMatch(s, query));
  const tie = sortComparator(sortMode);
  return list
    .slice()
    .sort((a, b) => score.get(b)! - score.get(a)! || tie(a, b));
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
