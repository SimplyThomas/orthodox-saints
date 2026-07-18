/* Fuzzy, ranked free-text search over saints (MiniSearch).

   ONE engine backs every search box in the app so results rank identically
   everywhere. The finder (/search, /quiz) indexes the full record — including
   the deep `search` haystack of facet values, brief, and notes — while the
   header/hero quick-search typeahead indexes only name/aka/variants (a jump-to
   box, not a content search). Both share the same tokenizer, field boosts,
   prefix + typo tolerance, and prominence tiebreak, so a query orders the saints
   it has in common the same way in both places.

   Ranking, strongest to weakest: a name hit outranks an "Also Known As" hit,
   which outranks a name-variant hit, which (finder only) outranks a deep-
   haystack-only hit. Word-aware by construction — MiniSearch tokenizes on word
   boundaries, so an exact term hit ("Chrysostom" in "John Chrysostom") outranks
   a mere prefix hit ("Chrysostom" inside "Chrysostomos"). Among comparable hits,
   a small prominence boost (see prominence.ts) breaks the tie toward the
   better-known saint.

   Facet filtering stays hand-rolled set intersection in lib/filter — this module
   owns only the text path. And search never returns *less* than the old
   substring filter did: ranked hits are unioned with an AND-of-tokens substring
   pass, so mid-word fragments the tokenizer cannot see still surface, appended
   after the ranked hits. */

import MiniSearch from "minisearch";
import type { FinderSaint } from "./types";
import { matches, emptySelected } from "./filter";

/** The minimum a record needs to be ranked; FinderSaint satisfies it. */
export interface RankableSaint {
  id: string;
  name: string;
  aka?: string[];
  variants?: string[];
  search?: string;
  /** data-derived prominence tiebreak (see prominence.ts) */
  prom?: number;
}

const FIELD_BOOST: Record<string, number> = {
  name: 8,
  aka: 4,
  variants: 2,
  search: 1,
};

// Prominence reorders comparable matches, not a relevance override: a saturating
// curve caps the multiplier just under (1 + PROM_WEIGHT), so even a very
// prominent partial match cannot leapfrog an exact hit on an obscure saint (a
// distinctive-name query still resolves to its saint). Tuned so marquee patrons
// win their bare first-name query (Apostle Paul for "paul", St Nicholas the
// Wonderworker for "nicholas") while distinctive names stay exact.
const PROM_WEIGHT = 2.5;
const PROM_HALF = 6; // prominence at which half the maximum boost is reached

function promMultiplier(prom: number | undefined): number {
  if (!prom || prom <= 0) return 1;
  return 1 + PROM_WEIGHT * (prom / (prom + PROM_HALF));
}

function makeMini<T extends RankableSaint>(
  saints: T[],
  fields: string[],
): MiniSearch<T> {
  const mini = new MiniSearch<T>({
    idField: "id",
    fields,
    storeFields: ["prom"],
    // aka/variants are arrays; index them as one space-joined text.
    extractField: (s, field) => {
      const v = s[field as keyof T];
      return Array.isArray(v) ? v.join(" ") : ((v as string) ?? "");
    },
    searchOptions: {
      combineWith: "AND",
      prefix: true,
      fuzzy: 0.2,
      boost: Object.fromEntries(fields.map((f) => [f, FIELD_BOOST[f] ?? 1])),
      boostDocument: (_id, _term, stored) =>
        promMultiplier((stored as { prom?: number } | undefined)?.prom),
    },
  });
  mini.addAll(saints);
  return mini;
}

/** Lowercased name/aka/variant haystack per id, for the substring recall floor. */
function nameHaystacks<T extends RankableSaint>(
  saints: T[],
): Map<string, string> {
  return new Map(
    saints.map((s) => [
      s.id,
      [s.name, ...(s.aka ?? []), ...(s.variants ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    ]),
  );
}

export interface FinderSearchIndex {
  /** Ranked saints for a free-text query (empty query → empty array). */
  search(query: string): FinderSaint[];
}

const NO_FACETS = emptySelected();

/** Full finder index: name/aka/variants + the deep `search` haystack. */
export function buildSearchIndex(saints: FinderSaint[]): FinderSearchIndex {
  const mini = makeMini(saints, ["name", "aka", "variants", "search"]);
  const byId = new Map(saints.map((s) => [s.id, s]));

  return {
    search(query: string): FinderSaint[] {
      const q = query.trim();
      if (!q) return [];
      const ranked: FinderSaint[] = [];
      const seen = new Set<string>();
      for (const hit of mini.search(q)) {
        const s = byId.get(hit.id as string);
        if (s) {
          ranked.push(s);
          seen.add(s.id);
        }
      }
      // Legacy substring union (recall floor): anything the old filter matched
      // but the tokenizer missed, appended in dataset (feast) order.
      for (const s of saints)
        if (!seen.has(s.id) && matches(s, q, NO_FACETS)) ranked.push(s);
      return ranked;
    },
  };
}

export interface NameSearchIndex<T> {
  search(query: string): T[];
}

/* Name-scoped ranking for the header/hero quick-search typeahead: the SAME
   engine and prominence boost as the finder, over name/aka/variants only, so a
   query surfaces the saints it shares with the finder in the same order. Keeps
   the finder's substring recall floor (scoped to those fields). */
export function buildNameSearch<T extends RankableSaint>(
  saints: T[],
): NameSearchIndex<T> {
  const mini = makeMini(saints, ["name", "aka", "variants"]);
  const byId = new Map(saints.map((s) => [s.id, s]));
  const hay = nameHaystacks(saints);

  return {
    search(query: string): T[] {
      const q = query.trim();
      if (!q) return [];
      const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
      const out: T[] = [];
      const seen = new Set<string>();
      for (const hit of mini.search(q)) {
        const s = byId.get(hit.id as string);
        if (s) {
          out.push(s);
          seen.add(s.id);
        }
      }
      for (const s of saints)
        if (!seen.has(s.id) && tokens.every((t) => hay.get(s.id)!.includes(t)))
          out.push(s);
      return out;
    },
  };
}
