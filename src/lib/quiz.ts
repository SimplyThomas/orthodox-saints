/* Patron-saint quiz config + scoring (ported from app.js). */

import { valuesOf, cleanName } from "./saints";
import { facetCounts } from "./filter";

export interface QuizGroup {
  key: string;
  weight: number;
  q: string;
}

export const QUIZ: QuizGroup[] = [
  {
    key: "intercession",
    weight: 3,
    q: "What would you most like a saint to pray for?",
  },
  { key: "experience", weight: 2, q: "Have you walked through any of these?" },
  { key: "vocation", weight: 2, q: "What is your work or calling?" },
  { key: "family", weight: 2, q: "Your state in life?" },
  {
    key: "virtue",
    weight: 1,
    q: "Which virtue do you most desire to grow in?",
  },
  {
    key: "tradition",
    weight: 1,
    q: "Drawn to a particular tradition? (optional)",
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

export interface QuizMatch<T> {
  s: T;
  score: number;
  reasons: string[];
}

/* Score every saint by weighted overlap with the quiz answers. */
export function quizMatches<T extends FacetSource & { name: string }>(
  saints: T[],
  selected: QuizSelected,
): QuizMatch<T>[] {
  const out: QuizMatch<T>[] = [];
  for (const s of saints) {
    let score = 0;
    const reasons: string[] = [];
    for (const { key, weight } of QUIZ) {
      const chosen = selected[key];
      if (!chosen.size) continue;
      for (const v of valuesOf(s, key))
        if (chosen.has(v)) {
          score += weight;
          reasons.push(v);
        }
    }
    if (score > 0) out.push({ s, score, reasons });
  }
  out.sort(
    (a, b) =>
      b.score - a.score ||
      cleanName(a.s.name).localeCompare(cleanName(b.s.name)),
  );
  return out;
}
