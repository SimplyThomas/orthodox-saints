import { describe, it, expect } from "vitest";
import {
  FACETS,
  emptySelected,
  activeCount,
  matches,
  facetCounts,
} from "./filter";

/* Minimal facet-bearing saint stub: matches() reads `search`/`name` for the
   text path and the facet arrays/singles keyed by FACETS keys. */
const nicholas = {
  name: "Nicholas of Myra",
  search: "nicholas of myra wonderworker bishop travelers",
  intercession: ["Travel", "Children"],
  rank: ["Hierarch"],
  era: "Byzantine",
};

/* Helper: an empty selection with one facet's values chosen. */
function select(picks: Record<string, string[]>) {
  const sel = emptySelected();
  for (const [k, vals] of Object.entries(picks)) sel[k] = new Set(vals);
  return sel;
}

describe("emptySelected / activeCount", () => {
  it("starts with an empty set per facet and zero active", () => {
    const sel = emptySelected();
    expect(Object.keys(sel).sort()).toEqual(FACETS.map((f) => f.key).sort());
    for (const f of FACETS) expect(sel[f.key].size).toBe(0);
    expect(activeCount(sel)).toBe(0);
  });

  it("counts selections across facets", () => {
    const sel = select({
      era: ["Byzantine"],
      intercession: ["Travel", "Children"],
    });
    expect(activeCount(sel)).toBe(3);
  });
});

describe("matches", () => {
  it("passes every saint when no query and no facets are selected", () => {
    expect(matches(nicholas, "", emptySelected())).toBe(true);
  });

  it("passes when a selected facet value matches (array facet)", () => {
    expect(matches(nicholas, "", select({ intercession: ["Travel"] }))).toBe(
      true,
    );
  });

  it("passes when a selected facet value matches (single-value facet)", () => {
    expect(matches(nicholas, "", select({ era: ["Byzantine"] }))).toBe(true);
  });

  it("fails when the selected facet value is absent", () => {
    expect(matches(nicholas, "", select({ intercession: ["Healing"] }))).toBe(
      false,
    );
  });

  it("ORs values within a facet, ANDs across facets", () => {
    // Within one facet: any chosen value matching is enough.
    expect(
      matches(nicholas, "", select({ intercession: ["Healing", "Travel"] })),
    ).toBe(true);
    // Across facets: every selected facet must match.
    expect(
      matches(
        nicholas,
        "",
        select({ intercession: ["Travel"], era: ["Modern"] }),
      ),
    ).toBe(false);
  });

  it("requires every query token in the search haystack (case-insensitive)", () => {
    expect(matches(nicholas, "MYRA bishop", emptySelected())).toBe(true);
    expect(matches(nicholas, "myra dragon", emptySelected())).toBe(false);
  });

  it("combines query and facets", () => {
    expect(matches(nicholas, "myra", select({ era: ["Byzantine"] }))).toBe(
      true,
    );
    expect(matches(nicholas, "myra", select({ era: ["Modern"] }))).toBe(false);
  });

  it("falls back to name when there is no search haystack", () => {
    expect(matches({ name: "Paisios" }, "pais", emptySelected())).toBe(true);
    expect(matches({ name: "Paisios" }, "nich", emptySelected())).toBe(false);
  });
});

describe("facetCounts", () => {
  const saints = [
    { intercession: ["Healing", "Travel"] },
    { intercession: ["Healing"] },
    { intercession: ["Children"] },
    { intercession: [] },
  ];

  it("counts each value across the list", () => {
    expect(new Map(facetCounts(saints, "intercession"))).toEqual(
      new Map([
        ["Healing", 2],
        ["Travel", 1],
        ["Children", 1],
      ]),
    );
  });

  it("sorts by count descending, then label ascending", () => {
    expect(facetCounts(saints, "intercession")).toEqual([
      ["Healing", 2],
      ["Children", 1],
      ["Travel", 1],
    ]);
  });

  it("counts single-value fields as one-element arrays", () => {
    const byEra = facetCounts(
      [{ era: "Byzantine" }, { era: "Byzantine" }, { era: "Modern" }, {}],
      "era",
    );
    expect(byEra).toEqual([
      ["Byzantine", 2],
      ["Modern", 1],
    ]);
  });
});
