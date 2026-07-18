import { describe, it, expect } from "vitest";
import { buildSearchIndex, buildNameSearch } from "./search";
import { prominence } from "./prominence";
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

  it("is word-aware: an exact term hit outranks a mid-word prefix hit", () => {
    // The regression that motivated the shared engine: "Chrysostom" is a whole
    // word in "John Chrysostom" but only a prefix of "Chrysostomos".
    const idx = buildSearchIndex([
      mk("Chrysostomos of Smyrna"),
      mk("John Chrysostom"),
    ]);
    expect(names(idx.search("chrysostom"))[0]).toBe("John Chrysostom");
  });

  it("breaks a tie toward the more prominent saint", () => {
    // Same name shape, same relevance — prominence decides.
    const idx = buildSearchIndex([
      mk("Nicholas Alpha", { prom: 1 }),
      mk("Nicholas Beta", { prom: 12 }),
    ]);
    expect(names(idx.search("nicholas"))[0]).toBe("Nicholas Beta");
  });
});

describe("prominence", () => {
  it("scores a broadly-venerated, portrayed, patron saint above a bare stub", () => {
    const major = mk("Nicholas the Wonderworker", {
      feast: "Dec 6; Translation May 9",
      tradition: ["Pan-Orthodox", "Greek"],
      image: "icons/nicholas.jpg",
      intercession: ["Travelers", "Children", "Sailors", "The falsely accused"],
    });
    const stub = mk("Obscure Local Saint", { feast: "Jan 1" });
    expect(prominence(major)).toBeGreaterThan(prominence(stub));
  });

  it("caps the intercession contribution so one facet cannot dominate", () => {
    const many = mk("A", { intercession: Array(20).fill("x") });
    const five = mk("B", { intercession: Array(5).fill("x") });
    expect(prominence(many)).toBe(prominence(five));
  });
});

describe("buildNameSearch (typeahead) shares the finder's ranking", () => {
  it("puts the marquee saint first for a bare first-name query", () => {
    const idx = buildNameSearch([
      mk("Nicholas Cabasilas", { prom: 6 }),
      mk("Nicholas the Wonderworker", { prom: 12 }),
    ]);
    expect(names(idx.search("nicholas"))[0]).toBe("Nicholas the Wonderworker");
  });

  it("is word-aware like the finder (exact term over prefix)", () => {
    const idx = buildNameSearch([
      mk("Chrysostomos of Smyrna"),
      mk("John Chrysostom"),
    ]);
    expect(names(idx.search("chrysostom"))[0]).toBe("John Chrysostom");
  });

  it("keeps the substring recall floor over name/aka/variants", () => {
    const idx = buildNameSearch([mk("Nicholas the Wonderworker")]);
    expect(names(idx.search("cholas"))).toContain("Nicholas the Wonderworker");
  });

  it("returns nothing for an empty query", () => {
    const idx = buildNameSearch([mk("Anyone")]);
    expect(idx.search("  ")).toEqual([]);
  });
});
