/* The archangels are cross-listed from the Heavenly Hosts DB into the saints
   finder (host-finder.ts). Two things have to stay true for them to be
   *findable* there, and only the first is obvious:

     1. they are in FINDER_SAINTS at all, and
     2. every browse surface derives its facet options from FINDER_SAINTS —
        not from SAINTS. FacetSidebar counted SAINTS once, which never offered
        "Archangel" as a Rank and silently dropped all eight the moment any
        facet was ticked. That is invisible from the components' own tests, so
        the invariant is pinned on the data instead. */
import { describe, it, expect } from "vitest";
import { FINDER_SAINTS } from "./data";
import { archangelFinderSaints } from "./host-finder";
import { facetCounts, matches, emptySelected } from "./filter";

const ARCHANGELS = [
  "Michael",
  "Gabriel",
  "Raphael",
  "Uriel",
  "Selaphiel",
  "Jegudiel",
  "Barachiel",
  "Jeremiel",
];

function withFacet(key: string, value: string) {
  const selected = emptySelected();
  selected[key].add(value);
  return FINDER_SAINTS.filter((s) => matches(s, "", selected));
}

describe("archangels in the finder", () => {
  it("cross-lists all eight, keyed by HH-#### and ranked Archangel", () => {
    const angels = archangelFinderSaints();
    expect(angels.map((a) => a.name.replace("Archangel ", "")).sort()).toEqual(
      [...ARCHANGELS].sort(),
    );
    for (const a of angels) {
      expect(a.id).toMatch(/^HH-\d{4}$/);
      expect(a.rank).toEqual(["Archangel"]);
    }
  });

  it("appears in FINDER_SAINTS, the set every browse surface reads", () => {
    const ids = new Set(FINDER_SAINTS.map((s) => s.id));
    for (const a of archangelFinderSaints()) expect(ids.has(a.id)).toBe(true);
  });

  it("offers Archangel as a Rank facet option", () => {
    const ranks = facetCounts(FINDER_SAINTS, "rank");
    expect(ranks).toContainEqual(["Archangel", ARCHANGELS.length]);
  });

  it("survives a facet selection instead of being filtered away", () => {
    expect(withFacet("rank", "Archangel")).toHaveLength(ARCHANGELS.length);
    // And each patronage in host-finder's PATRONAGE map is a real vocab term,
    // so the archangel actually turns up under the facet it was mapped to.
    const byFacet = withFacet("intercession", "Protection from Danger");
    expect(byFacet.some((s) => s.id === "HH-0010")).toBe(true);
    expect(
      withFacet("vocation", "Physician").some((s) => s.id === "HH-0012"),
    ).toBe(true);
  });
});
