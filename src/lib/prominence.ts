/* A coarse, data-derived prominence proxy.

   Two saints of comparable text relevance should rank better-known-first — a
   query for "chrysostom" should surface St John Chrysostom above a local
   hierarch who happens to share the name. We nudge the search score by a few
   signals already present in every finder record:
     • how many feast days the saint holds (major saints accrue several),
     • how broadly they are venerated (tradition count, with a bonus for the
       pan-Orthodox calendar), and
     • whether we carry a curated portrait for them, and how many
       "commonly asked intercessions" we have curated (that facet is filled
       patron-first, so it tracks how sought-after a saint is — it floats St
       Nicholas the Wonderworker above a same-named theologian for a bare
       "nicholas" query).

   It is deliberately blunt and stays a *tiebreak*: search.ts maps it to a
   bounded multiplier so it reorders comparable matches without overturning a
   real relevance gap. Computed from data
   fields alone (never review state), so the header quick-search index and the
   full finder payload derive the identical number and rank the same way. */

import type { FinderSaint } from "./types";

export function prominence(s: FinderSaint): number {
  const feasts = s.feast
    ? s.feast.split(";").filter((t) => t.trim()).length
    : 0;
  const traditions = s.tradition?.length ?? 0;
  const panOrthodox = s.tradition?.some((t) => /pan-orthodox/i.test(t)) ? 1 : 0;
  const portrait = s.image ? 1 : 0;
  const intercessions = Math.min(s.intercession?.length ?? 0, 5);
  return feasts + traditions + 2 * panOrthodox + 2 * portrait + intercessions;
}
