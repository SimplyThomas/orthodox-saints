import { describe, it, expect } from "vitest";
import {
  QUIZ,
  emptyQuizSelected,
  quizMatches,
  type QuizSelected,
} from "./quiz";

/* Minimal facet-bearing saint stub: the scorer only reads the facet arrays
   keyed by QUIZ keys, plus `name` for the tie-break. */
type Stub = { name: string } & Record<string, string[] | string>;
const saint = (name: string, facets: Record<string, string[]>): Stub => ({
  name,
  ...facets,
});

/* Helper: build a selection from { key: [values] }. */
function select(picks: Record<string, string[]>): QuizSelected {
  const sel = emptyQuizSelected();
  for (const [k, vals] of Object.entries(picks)) sel[k] = new Set(vals);
  return sel;
}

const weightOf = (key: string) => QUIZ.find((g) => g.key === key)!.weight;

describe("QUIZ weighting (multi-path discovery — CLAUDE.md §1/§10)", () => {
  it("does not weight the sparse intercession facet highest", () => {
    // The whole point of the reweighting: the relatability paths carry the
    // quiz, not the ~18.6%-covered intercession facet.
    expect(weightOf("experience")).toBeGreaterThan(weightOf("intercession"));
    expect(weightOf("vocation")).toBeGreaterThan(weightOf("intercession"));
  });

  it("keeps intercession a meaningful (non-trivial) signal when present", () => {
    expect(weightOf("intercession")).toBeGreaterThan(weightOf("tradition"));
  });

  it("exposes a Region/background dimension (origin, ~97% covered)", () => {
    expect(QUIZ.some((g) => g.key === "origin")).toBe(true);
  });
});

describe("quizMatches scoring", () => {
  it("ranks a story+calling match above an intercession-only match", () => {
    const storyVocation = saint("Story Vocation", {
      experience: ["Grief"],
      vocation: ["Soldier"],
    });
    const intercessionOnly = saint("Intercession Only", {
      intercession: ["Healing"],
    });

    const sel = select({
      experience: ["Grief"],
      vocation: ["Soldier"],
      intercession: ["Healing"],
    });
    const ranked = quizMatches([intercessionOnly, storyVocation], sel);

    expect(ranked[0].s.name).toBe("Story Vocation");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("ranks even a single story match above an intercession-only match", () => {
    const storyOnly = saint("Story Only", { experience: ["Grief"] });
    const intercessionOnly = saint("Intercession Only", {
      intercession: ["Healing"],
    });
    const sel = select({ experience: ["Grief"], intercession: ["Healing"] });
    const ranked = quizMatches([intercessionOnly, storyOnly], sel);

    expect(ranked[0].s.name).toBe("Story Only");
  });

  it("normalizes per dimension: stacking many intercession tags cannot dominate a single story match", () => {
    // Intercession-only saint matching FOUR intercession picks. Under the old
    // per-value scoring this would score 4×3 = 12 and bury everything; under
    // per-dimension normalization it scores its weight once.
    const intercessionHeavy = saint("Intercession Heavy", {
      intercession: ["Healing", "Travel", "Anxiety", "Work"],
    });
    const storyOnly = saint("Story Only", { experience: ["Grief"] });
    const sel = select({
      intercession: ["Healing", "Travel", "Anxiety", "Work"],
      experience: ["Grief"],
    });
    const ranked = quizMatches([intercessionHeavy, storyOnly], sel);

    expect(ranked[0].s.name).toBe("Story Only");
    expect(ranked[0].score).toBe(weightOf("experience"));
    expect(ranked[1].score).toBe(weightOf("intercession"));
  });

  it("scores a region/background match (previously had no question)", () => {
    const fromGreece = saint("From Greece", { origin: ["Greece"] });
    const sel = select({ origin: ["Greece"] });
    const ranked = quizMatches([fromGreece], sel);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].score).toBe(weightOf("origin"));
  });

  it("breaks ties by breadth of overlap (more values matched), then name", () => {
    // Same dimensions matched (experience), so same weighted score; the saint
    // matching more individual values should rank first.
    const broad = saint("Broad", { experience: ["Grief", "Illness"] });
    const narrow = saint("Narrow", { experience: ["Grief"] });
    const sel = select({ experience: ["Grief", "Illness"] });
    const ranked = quizMatches([narrow, broad], sel);

    expect(ranked[0].s.name).toBe("Broad");
    expect(ranked[0].score).toBe(ranked[1].score);
  });

  it("omits saints with no overlap at all", () => {
    const unrelated = saint("Unrelated", { virtue: ["Patience"] });
    const sel = select({ experience: ["Grief"] });
    expect(quizMatches([unrelated], sel)).toHaveLength(0);
  });
});
