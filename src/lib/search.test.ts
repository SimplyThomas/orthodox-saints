import { describe, it, expect } from "vitest";
import { buildSearchIndex } from "./search";
import type { FinderSaint } from "./types";

/* Minimal FinderSaint fixtures. The ranking contract here carries over from
   the old hand-rolled scoreMatch (filter.ts): a name hit outranks an aka hit,
   which outranks a variant hit, which outranks a haystack-only hit — now
   enforced through MiniSearch field boosts (lib/search). */
let seq = 0;
const mk = (name: string, extra: Partial<FinderSaint> = {}): FinderSaint => ({
  id: `OS-${String(++seq).padStart(4, "0")}`,
  name,
  aka: [],
  rank: [],
  church: [],
  family: [],
  vocation: [],
  experience: [],
  virtue: [],
  intercession: [],
  origin: [],
  tradition: [],
  gender: "",
  era: "",
  century: "",
  feast: "",
  feastSort: 9999,
  brief: "",
  notes: "",
  // Default haystack contains the name (as build.py does).
  search: name.toLowerCase(),
  themes: [],
  ...extra,
});

const names = (list: FinderSaint[]) => list.map((s) => s.name);

describe("buildSearchIndex ranking", () => {
  it("puts the named saint first even when others mention the word", () => {
    const idx = buildSearchIndex([
      mk("John the Theologian", { search: "john ... the theotokos" }),
      mk("Most Holy Theotokos (Virgin Mary)"),
      mk("Pulcheria", { search: "pulcheria churches to the theotokos" }),
    ]);
    expect(names(idx.search("theotokos"))[0]).toBe(
      "Most Holy Theotokos (Virgin Mary)",
    );
  });

  it("ranks a name hit above an Also-Known-As hit", () => {
    const idx = buildSearchIndex([
      mk("Some Other Saint", {
        aka: ["John"],
        search: "some other saint john",
      }),
      mk("John the Theologian"),
    ]);
    expect(names(idx.search("john"))[0]).toBe("John the Theologian");
  });

  it("ranks an aka hit above a variant-only hit", () => {
    const idx = buildSearchIndex([
      mk("Lucia of Syracuse", {
        variants: ["Lucy"],
        search: "lucia of syracuse lucy",
      }),
      mk("Foo", { aka: ["Lucy"], search: "foo lucy" }),
    ]);
    expect(names(idx.search("lucy"))[0]).toBe("Foo");
  });

  it("includes haystack-only matches, ranked last", () => {
    const idx = buildSearchIndex([
      mk("Bravo", { search: "bravo intercessor for healing" }),
      mk("Healing Spring of the Theotokos"),
    ]);
    const out = names(idx.search("healing"));
    expect(out[0]).toBe("Healing Spring of the Theotokos");
    expect(out).toContain("Bravo");
  });
});

describe("buildSearchIndex matching", () => {
  it("tolerates a misspelling (fuzzy)", () => {
    const idx = buildSearchIndex([
      mk("Nicholas the Wonderworker"),
      mk("Basil the Great"),
    ]);
    expect(names(idx.search("Nicholaus"))).toContain(
      "Nicholas the Wonderworker",
    );
  });

  it("matches on a typed prefix", () => {
    const idx = buildSearchIndex([mk("Nicholas the Wonderworker")]);
    expect(names(idx.search("nich"))).toContain("Nicholas the Wonderworker");
  });

  it("requires every word of a multi-word query (AND)", () => {
    const idx = buildSearchIndex([
      mk("Basil the Great"),
      mk("Basil of Ostrog"),
    ]);
    const out = names(idx.search("basil great"));
    expect(out).toContain("Basil the Great");
    expect(out).not.toContain("Basil of Ostrog");
  });

  it("keeps the legacy substring floor (mid-word fragments still match)", () => {
    const idx = buildSearchIndex([mk("Nicholas the Wonderworker")]);
    expect(names(idx.search("cholas"))).toContain("Nicholas the Wonderworker");
  });

  it("returns nothing for an empty query", () => {
    const idx = buildSearchIndex([mk("Anyone")]);
    expect(idx.search("  ")).toEqual([]);
  });
});
