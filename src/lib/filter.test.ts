import { describe, it, expect } from "vitest";
import { scoreMatch, sortByRelevance } from "./filter";

/* Minimal saint shapes for ranking. Only the fields scoreMatch reads. */
const mk = (
  name: string,
  extra: Partial<{
    aka: string[];
    variants: string[];
    search: string;
    feastSort: number;
  }> = {},
) => ({
  name,
  aka: extra.aka ?? [],
  variants: extra.variants,
  // Default haystack contains the name (as build.py does).
  search: extra.search ?? name.toLowerCase(),
  feastSort: extra.feastSort ?? 9999,
});

describe("scoreMatch", () => {
  it("scores an exact name match highest", () => {
    const exact = scoreMatch(mk("Nicholas"), "nicholas");
    const prefix = scoreMatch(mk("Nicholas the Wonderworker"), "nicholas");
    expect(exact).toBeGreaterThan(prefix);
  });

  it("ranks a name hit above an Also-Known-As hit", () => {
    const inName = scoreMatch(mk("John the Theologian"), "john");
    const inAka = scoreMatch(mk("Some Other Saint", { aka: ["John"] }), "john");
    expect(inName).toBeGreaterThan(inAka);
  });

  it("ranks an Also-Known-As hit above a variant-only hit", () => {
    const inAka = scoreMatch(mk("Foo", { aka: ["Lucy"] }), "lucy");
    const inVariant = scoreMatch(
      mk("Foo", { variants: ["Lucy"], search: "foo lucy" }),
      "lucy",
    );
    expect(inAka).toBeGreaterThan(inVariant);
  });

  it("ranks any name/aka hit above a haystack-only hit", () => {
    // Saint whose name does NOT contain the query, but a facet/notes does.
    const haystackOnly = scoreMatch(
      mk("Joachim", { search: "joachim father of the theotokos" }),
      "theotokos",
    );
    const inName = scoreMatch(
      mk("Most Holy Theotokos (Virgin Mary)"),
      "theotokos",
    );
    expect(inName).toBeGreaterThan(haystackOnly);
    expect(haystackOnly).toBeGreaterThan(0);
  });

  it("scores a whole-word name hit above a mere substring", () => {
    // "mary" as a standalone word, vs buried inside "rosemary" (a substring only).
    const wholeWord = scoreMatch(mk("Joseph and Mary"), "mary");
    const substring = scoreMatch(mk("Rosemary Gardens"), "mary");
    expect(wholeWord).toBeGreaterThan(substring);
  });

  it("matches a multi-word query as a phrase in the name", () => {
    const phraseInName = scoreMatch(
      mk("Most Holy Theotokos (Virgin Mary)"),
      "virgin mary",
    );
    // Another saint where the tokens are scattered across the haystack only.
    const scattered = scoreMatch(
      mk("Mary the Virgin-Martyr", {
        search: "agatha virgin martyr named mary somewhere",
        // name does not contain the phrase "virgin mary"
      }),
      "virgin mary",
    );
    expect(phraseInName).toBeGreaterThan(scattered);
  });
});

describe("sortByRelevance", () => {
  it("puts the named saint first even when its feast is later", () => {
    const list = [
      mk("John the Theologian", {
        search: "john ... the theotokos",
        feastSort: 100,
      }),
      mk("Most Holy Theotokos (Virgin Mary)", { feastSort: 900 }),
      mk("Pulcheria", {
        search: "pulcheria churches to the theotokos",
        feastSort: 200,
      }),
    ];
    const out = sortByRelevance(list, "theotokos", "feast");
    expect(out[0].name).toBe("Most Holy Theotokos (Virgin Mary)");
  });

  it("breaks ties with the chosen sort mode (feast)", () => {
    // Two equally-relevant haystack-only matches; earlier feast wins the tie.
    const list = [
      mk("Bravo", { search: "bravo healing", feastSort: 300 }),
      mk("Alpha", { search: "alpha healing", feastSort: 100 }),
    ];
    const out = sortByRelevance(list, "healing", "feast");
    expect(out.map((s) => s.name)).toEqual(["Alpha", "Bravo"]);
  });
});
