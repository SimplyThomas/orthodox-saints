/** Phrase fragments (lowercased) → theme slug. The finder shows a "Browse the
 *  <label> theme" banner when the query contains a fragment. Order matters: the
 *  first matching fragment wins, so list more specific phrases first. */
export const THEME_ALIASES: { phrase: string; slug: string }[] = [
  { phrase: "defended icons", slug: "icon-defenders" },
  { phrase: "icon defender", slug: "icon-defenders" },
  { phrase: "in america", slug: "saints-of-america" },
  { phrase: "in alaska", slug: "saints-of-alaska" },
  { phrase: "soldier", slug: "soldiers" },
  { phrase: "mother", slug: "mothers" },
  { phrase: "father", slug: "fathers" },
  { phrase: "convert", slug: "converts" },
  { phrase: "martyr", slug: "martyrdom" },
  { phrase: "exile", slug: "exile" },
  { phrase: "persecut", slug: "persecution" },
  { phrase: "physician", slug: "physicians" },
  { phrase: "doctor", slug: "physicians" },
  { phrase: "monk", slug: "monastics" },
  { phrase: "nun", slug: "monastics" },
  { phrase: "monastic", slug: "monastics" },
  { phrase: "bishop", slug: "bishops" },
  { phrase: "missionary", slug: "missionaries" },
  { phrase: "missionaries", slug: "missionaries" },
  { phrase: "wonderworker", slug: "wonderworkers" },
  { phrase: "healer", slug: "healers" },
];

export function matchThemeAlias(query: string): string | null {
  const q = query.toLowerCase();
  for (const a of THEME_ALIASES) if (q.includes(a.phrase)) return a.slug;
  return null;
}
