import { describe, it, expect } from "vitest";
import {
  QUIZ,
  EXPERIENCE_OPTION_GROUPS,
  VOCATION_OPTION_GROUPS,
  FAMILY_OPTION_GROUPS,
  INTERCESSION_OPTION_GROUPS,
  emptyQuizSelected,
  quizMatches,
  tierMatches,
  exploreLinks,
  type QuizSelected,
  type QuizMatch,
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

/* The "experience" question is a MAPPED question (CLAUDE.md §9): the user picks
   a modern pastoral label, which scores against one or more real DB tags. Derive
   two representative (label → DB tag) pairs from the live config so these tests
   track the mapping rather than hard-coding labels that may be reworded. */
const EXP_A = EXPERIENCE_OPTION_GROUPS[0].options[0];
const EXP_B = EXPERIENCE_OPTION_GROUPS[1].options[0];
const EXP_A_LABEL = EXP_A.label;
const EXP_A_TAG = EXP_A.tags![0];
const EXP_B_LABEL = EXP_B.label;
const EXP_B_TAG = EXP_B.tags![0];

/* The "vocation" question is also mapped, and additionally uses CROSS-facet
   options (a calling that maps into Church Status / Family). Derive an own-facet
   option and a cross-facet option from the live config. */
const allVoc = VOCATION_OPTION_GROUPS.flatMap((g) => g.options);
const VOC_A = allVoc.find((o) => o.tags && o.tags.length)!;
const VOC_A_LABEL = VOC_A.label;
const VOC_A_TAG = VOC_A.tags![0];
const VOC_CROSS = allVoc.find((o) => o.cross && Object.keys(o.cross).length)!;
const VOC_CROSS_LABEL = VOC_CROSS.label;
const VOC_CROSS_FACET = Object.keys(VOC_CROSS.cross!)[0];
const VOC_CROSS_TAG = VOC_CROSS.cross![VOC_CROSS_FACET][0];

/* The "intercession" question is mapped too (the narrowest path — CLAUDE.md §10).
   Derive (label → DB tag) pairs from the live config so the scoring tests submit
   user-facing labels, exactly as the UI does. */
const allInt = INTERCESSION_OPTION_GROUPS.flatMap((g) => g.options);
const INT_A_LABEL = allInt[0].label;
const INT_A_TAG = allInt[0].tags![0];

describe("QUIZ weighting (multi-path discovery — CLAUDE.md §1/§10)", () => {
  it("does not weight the sparse intercession facet highest", () => {
    // The whole point of the reweighting: the relatability paths carry the
    // quiz, not the ~18.6%-covered intercession facet.
    expect(weightOf("experience")).toBeGreaterThan(weightOf("intercession"));
    expect(weightOf("vocation")).toBeGreaterThan(weightOf("intercession"));
  });

  it("keeps intercession a meaningful (non-zero) signal when present", () => {
    expect(weightOf("intercession")).toBeGreaterThan(0);
  });

  it("drops the origin (Region) and tradition questions", () => {
    expect(QUIZ.some((g) => g.key === "origin")).toBe(false);
    expect(QUIZ.some((g) => g.key === "tradition")).toBe(false);
  });
});

describe("mapped 'experience' question (pastoral labels over DB tags)", () => {
  it("matches a saint via the DB tag behind a modern label", () => {
    const s = saint("Mapped", { experience: [EXP_A_TAG] });
    const ranked = quizMatches([s], select({ experience: [EXP_A_LABEL] }));
    expect(ranked).toHaveLength(1);
    expect(ranked[0].score).toBe(weightOf("experience"));
  });

  it("reports the user-facing LABEL as the reason, not the raw DB tag", () => {
    const s = saint("Mapped", { experience: [EXP_A_TAG] });
    const [m] = quizMatches([s], select({ experience: [EXP_A_LABEL] }));
    expect(m.reasons).toContainEqual({
      key: "experience",
      kicker: "Your Story",
      value: EXP_A_LABEL,
    });
  });

  it("does not match a raw DB tag selected directly (labels only)", () => {
    const s = saint("Mapped", { experience: [EXP_A_TAG] });
    // Selecting the raw tag (not a label) should score nothing for this
    // question — the UI only ever submits labels.
    expect(quizMatches([s], select({ experience: [EXP_A_TAG] }))).toHaveLength(
      0,
    );
  });

  it("maps a family/season-of-life option to its Family facet tag", () => {
    const fam = FAMILY_OPTION_GROUPS.flatMap((g) => g.options).find(
      (o) => o.tags && o.tags.length,
    )!;
    const s = saint("Family", { family: [fam.tags![0]] });
    const [m] = quizMatches([s], select({ family: [fam.label] }));
    expect(m.score).toBe(weightOf("family"));
    expect(m.reasons).toContainEqual({
      key: "family",
      kicker: "Your Life",
      value: fam.label,
    });
  });

  it("matches a vocation option via a CROSS-facet tag (e.g. calling → Church Status / Family)", () => {
    // The chosen calling lives in another facet on the saint, not in Vocation.
    const s = saint("Cross", { [VOC_CROSS_FACET]: [VOC_CROSS_TAG] });
    const [m] = quizMatches([s], select({ vocation: [VOC_CROSS_LABEL] }));
    expect(m.score).toBe(weightOf("vocation"));
    expect(m.reasons).toContainEqual({
      key: "vocation",
      kicker: "Your Calling",
      value: VOC_CROSS_LABEL,
    });
  });
});

describe("quizMatches scoring", () => {
  it("ranks a story+calling match above an intercession-only match", () => {
    const storyVocation = saint("Story Vocation", {
      experience: [EXP_A_TAG],
      vocation: [VOC_A_TAG],
    });
    const intercessionOnly = saint("Intercession Only", {
      intercession: [INT_A_TAG],
    });

    const sel = select({
      experience: [EXP_A_LABEL],
      vocation: [VOC_A_LABEL],
      intercession: [INT_A_LABEL],
    });
    const ranked = quizMatches([intercessionOnly, storyVocation], sel);

    expect(ranked[0].s.name).toBe("Story Vocation");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("ranks even a single story match above an intercession-only match", () => {
    const storyOnly = saint("Story Only", { experience: [EXP_A_TAG] });
    const intercessionOnly = saint("Intercession Only", {
      intercession: ["Healing"],
    });
    const sel = select({
      experience: [EXP_A_LABEL],
      intercession: ["Healing"],
    });
    const ranked = quizMatches([intercessionOnly, storyOnly], sel);

    expect(ranked[0].s.name).toBe("Story Only");
  });

  it("normalizes per dimension: stacking many intercession tags cannot dominate a single story match", () => {
    // Intercession-only saint matching FOUR intercession picks. Under the old
    // per-value scoring this would score 4×2 and bury everything; under
    // per-dimension normalization it scores its weight once.
    const fourInt = allInt.slice(0, 4);
    const intercessionHeavy = saint("Intercession Heavy", {
      intercession: fourInt.map((o) => o.tags![0]),
    });
    const storyOnly = saint("Story Only", { experience: [EXP_A_TAG] });
    const sel = select({
      intercession: fourInt.map((o) => o.label),
      experience: [EXP_A_LABEL],
    });
    const ranked = quizMatches([intercessionHeavy, storyOnly], sel);

    expect(ranked[0].s.name).toBe("Story Only");
    expect(ranked[0].score).toBe(weightOf("experience"));
    expect(ranked[1].score).toBe(weightOf("intercession"));
  });

  it("reports matched reasons tagged by question (for transparent results)", () => {
    const s = saint("Tagged", {
      experience: [EXP_A_TAG],
      vocation: [VOC_A_TAG],
    });
    const sel = select({
      experience: [EXP_A_LABEL],
      vocation: [VOC_A_LABEL],
    });
    const [m] = quizMatches([s], sel);
    expect(m.reasons).toContainEqual({
      key: "experience",
      kicker: "Your Story",
      value: EXP_A_LABEL,
    });
    expect(m.reasons).toContainEqual({
      key: "vocation",
      kicker: "Your Calling",
      value: VOC_A_LABEL,
    });
  });

  it("breaks ties by breadth of overlap (more values matched), then name", () => {
    // Same dimension matched (experience), so same weighted score; the saint
    // matching more individual labels should rank first.
    const broad = saint("Broad", { experience: [EXP_A_TAG, EXP_B_TAG] });
    const narrow = saint("Narrow", { experience: [EXP_A_TAG] });
    const sel = select({ experience: [EXP_A_LABEL, EXP_B_LABEL] });
    const ranked = quizMatches([narrow, broad], sel);

    expect(ranked[0].s.name).toBe("Broad");
    expect(ranked[0].score).toBe(ranked[1].score);
  });

  it("omits saints with no overlap at all", () => {
    const unrelated = saint("Unrelated", { virtue: ["Patience"] });
    const sel = select({ experience: [EXP_A_LABEL] });
    expect(quizMatches([unrelated], sel)).toHaveLength(0);
  });
});

/* The result page is tiered (CLAUDE.md §1: no single patron). tierMatches splits
   the already-ranked list into a small lead band and a wider also-like band. */
describe("tierMatches (result tiering)", () => {
  const mm = (name: string, score: number): QuizMatch<{ name: string }> => ({
    s: { name },
    score,
    reasons: [],
  });
  // A descending-score list of n items (scores n..1), as quizMatches returns.
  const ranked = (n: number) =>
    Array.from({ length: n }, (_, i) => mm(`S${i}`, n - i));

  it("leads with at least 3 and caps at 10 more", () => {
    const { especially, alsoLike } = tierMatches(ranked(20));
    expect(especially).toHaveLength(3);
    expect(alsoLike).toHaveLength(10);
    // The bands are contiguous slices of the ranked list, lead first.
    expect(especially[0].s.name).toBe("S0");
    expect(alsoLike[0].s.name).toBe("S3");
  });

  it("does not split a score tie across the lead boundary", () => {
    // Scores: 10, 9, 8, 8, 8, then descending — the tie at the boundary pulls
    // the lead band out to 5 (the cap) rather than cutting it at 3.
    const list = [
      mm("a", 10),
      mm("b", 9),
      mm("c", 8),
      mm("d", 8),
      mm("e", 8),
      mm("f", 7),
      mm("g", 6),
    ];
    const { especially } = tierMatches(list);
    expect(especially).toHaveLength(5);
    expect(especially.map((m) => m.s.name)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("caps the lead band at 5 even when many share the top score", () => {
    const allTied = Array.from({ length: 12 }, (_, i) => mm(`T${i}`, 5));
    const { especially, alsoLike } = tierMatches(allTied);
    expect(especially).toHaveLength(5);
    expect(alsoLike).toHaveLength(7);
  });

  it("handles fewer matches than the minimum, and the empty case", () => {
    expect(tierMatches(ranked(2)).especially).toHaveLength(2);
    expect(tierMatches(ranked(2)).alsoLike).toHaveLength(0);
    expect(tierMatches([])).toEqual({ especially: [], alsoLike: [] });
  });
});

/* exploreLinks powers the "Explore Similar Saints" deep-link chips: one per
   dimension, valued by the most common REAL facet value among the lead matches. */
describe("exploreLinks (explore-tier deep links)", () => {
  it("picks the most common value per dimension, omitting empty facets", () => {
    const saints = [
      saint("A", { vocation: ["Physician"], origin: ["Greece"] }),
      saint("B", { vocation: ["Physician"], origin: ["Syria"] }),
      saint("C", { vocation: ["Soldier"], origin: ["Greece"] }),
    ];
    const links = exploreLinks(saints);
    const voc = links.find((l) => l.facet === "vocation");
    const reg = links.find((l) => l.facet === "origin");
    expect(voc?.value).toBe("Physician"); // 2 vs 1
    expect(reg?.value).toBe("Greece"); // 2 vs 1
    expect(voc?.kind).toBe("Vocation");
    // No experience/era/etc. values present → those facets produce no chip.
    expect(links.some((l) => l.facet === "experience")).toBe(false);
  });

  it("breaks frequency ties alphabetically for stable output", () => {
    const saints = [
      saint("A", { vocation: ["Soldier"] }),
      saint("B", { vocation: ["Physician"] }),
    ];
    expect(
      exploreLinks(saints).find((l) => l.facet === "vocation")?.value,
    ).toBe("Physician");
  });
});
