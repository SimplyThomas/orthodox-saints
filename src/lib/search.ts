/* Fuzzy, ranked free-text search over the finder dataset (MiniSearch).

   The finder island builds one index after the dataset fetch resolves and
   routes every typed query through it: token-AND with prefix matching and
   typo tolerance (fuzzy 0.2), ranked by field-boosted relevance so a name
   hit outranks an "Also Known As" hit, which outranks a name-variant hit,
   which outranks a deep-haystack-only hit (the haystack mixes in every facet
   value, brief, and notes — see build.py).

   Facet filtering stays hand-rolled set intersection in lib/filter — this
   module owns only the text path. And search never returns *less* than the
   old substring filter did: results are unioned with the legacy AND-of-tokens
   substring pass (lib/filter matches), so mid-word fragments MiniSearch's
   tokenizer cannot see still surface, after the ranked hits. */

import MiniSearch from "minisearch";
import type { FinderSaint } from "./types";
import { matches, emptySelected } from "./filter";

export interface FinderSearchIndex {
  /** Ranked saints for a free-text query (empty query → empty array). */
  search(query: string): FinderSaint[];
}

const NO_FACETS = emptySelected();

export function buildSearchIndex(saints: FinderSaint[]): FinderSearchIndex {
  const mini = new MiniSearch<FinderSaint>({
    idField: "id",
    fields: ["name", "aka", "variants", "search"],
    // aka/variants are arrays; index them as one space-joined text.
    extractField: (s, field) => {
      const v = s[field as keyof FinderSaint];
      return Array.isArray(v) ? v.join(" ") : ((v as string) ?? "");
    },
    searchOptions: {
      combineWith: "AND",
      prefix: true,
      fuzzy: 0.2,
      boost: { name: 8, aka: 4, variants: 2, search: 1 },
    },
  });
  mini.addAll(saints);
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
      // Legacy substring union (recall floor): anything the old filter
      // matched but the tokenizer missed, appended in dataset (feast) order.
      for (const s of saints)
        if (!seen.has(s.id) && matches(s, q, NO_FACETS)) ranked.push(s);
      return ranked;
    },
  };
}
