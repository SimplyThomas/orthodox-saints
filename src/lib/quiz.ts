/* Patron-saint quiz config + scoring (ported from app.js). */

import { valuesOf, cleanName } from "./saints";
import { facetCounts } from "./filter";

export interface QuizGroup {
  key: string;
  weight: number;
  /** short eyebrow label shown above the question in the step flow */
  kicker: string;
  q: string;
  optional?: boolean;
}

/* Dimension weights are aligned with the multi-path discovery goal (CLAUDE.md
   §1/§10): the quiz should surface a relatable patron across the *whole* corpus,
   not just the intercession-tagged minority. Weights track the relatability
   paths (story / calling / life / background) and the facets' real coverage:

     dimension     weight  coverage   path (§1)
     experience      3      56.0%     "a story you relate to"   ← lead signal
     vocation        3      21.7%     "a vocation you relate to"← lead signal
     family          2      24.1%     "a life you relate to"
     origin          2      97.0%     "a background you relate to" (NEW)
     virtue          2      69.0%     aspiration
     intercession    2      18.6%     need-matching — the NARROWEST path (§10),
                                       kept meaningful but no longer dominant
     tradition       1      92.4%     light affinity tie-shaper (optional)

   Intercession used to be the single highest weight (3) yet is the sparsest
   facet (18.6%), so the ~500 tagged saints crowded out the other ~81% even when
   those matched strongly on story/calling. It is now a mid weight, below the two
   lead relatability signals, so a story+calling match outranks an
   intercession-only match. Order leads with story rather than the affliction
   path, mirroring the §1 reframe. Scores are normalized per dimension in
   quizMatches() (a dimension counts its weight once) so a sparse-but-high-weight
   facet cannot dominate by stacking many tags. */
export const QUIZ: QuizGroup[] = [
  {
    key: "experience",
    weight: 3,
    kicker: "Your Story",
    q: "Have you walked through any of these?",
  },
  {
    key: "vocation",
    weight: 3,
    kicker: "Your Calling",
    q: "What is your work or calling?",
  },
  {
    key: "family",
    weight: 2,
    kicker: "Your Life",
    q: "Your state in life?",
  },
  {
    key: "origin",
    weight: 2,
    kicker: "Your Background",
    q: "Is there a land or people you call your own?",
    optional: true,
  },
  {
    key: "virtue",
    weight: 2,
    kicker: "Virtue",
    q: "Which virtue do you most desire to grow in?",
  },
  {
    key: "intercession",
    weight: 2,
    kicker: "Intercession",
    q: "What would you most like a saint to pray for?",
  },
  {
    key: "tradition",
    weight: 1,
    kicker: "Tradition",
    q: "Drawn to a particular tradition?",
    optional: true,
  },
];

type FacetSource = Record<string, unknown>;
export type QuizSelected = Record<string, Set<string>>;

export function emptyQuizSelected(): QuizSelected {
  const sel: QuizSelected = {};
  QUIZ.forEach((g) => (sel[g.key] = new Set()));
  return sel;
}

/* Distinct option values for a quiz facet, most common first. */
export function optionsFor(saints: FacetSource[], key: string): string[] {
  return facetCounts(saints, key).map(([v]) => v);
}

/** One matched value, tagged with the question it came from so the result UI
   can show the user transparently what they matched on, grouped by dimension. */
export interface QuizReason {
  /** quiz group key (e.g. "experience") */
  key: string;
  /** the question's short label (e.g. "Your Story") */
  kicker: string;
  /** the facet value the user picked that this saint shares (e.g. "Grief") */
  value: string;
}

export interface QuizMatch<T> {
  s: T;
  score: number;
  reasons: QuizReason[];
}

/* Score every saint by weighted overlap with the quiz answers. */
export function quizMatches<T extends FacetSource & { name: string }>(
  saints: T[],
  selected: QuizSelected,
): QuizMatch<T>[] {
  const out: QuizMatch<T>[] = [];
  for (const s of saints) {
    let score = 0;
    const reasons: QuizReason[] = [];
    for (const { key, weight, kicker } of QUIZ) {
      const chosen = selected[key];
      if (!chosen.size) continue;
      let dimMatched = false;
      for (const v of valuesOf(s, key))
        if (chosen.has(v)) {
          dimMatched = true;
          reasons.push({ key, kicker, value: v });
        }
      // Normalize per dimension: a matched dimension contributes its weight
      // ONCE, regardless of how many values matched. This keeps a sparse but
      // high-weight facet (e.g. Intercession, ~18.6% covered) from dominating
      // the leaderboard by stacking several tags — breadth across the
      // relatability dimensions wins; depth within one is only a tie-break.
      if (dimMatched) score += weight;
    }
    if (score > 0) out.push({ s, score, reasons });
  }
  out.sort(
    (a, b) =>
      b.score - a.score ||
      // tie-break: more individual values matched (richer overlap), then name.
      b.reasons.length - a.reasons.length ||
      cleanName(a.s.name).localeCompare(cleanName(b.s.name)),
  );
  return out;
}
