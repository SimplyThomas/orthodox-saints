import { describe, it, expect } from "vitest";
import { THEME_ALIASES, matchThemeAlias } from "./theme-aliases";

describe("matchThemeAlias", () => {
  it("matches a phrase contained anywhere in the query", () => {
    expect(matchThemeAlias("saints who were soldiers")).toBe("soldiers");
  });

  it("is case-insensitive", () => {
    expect(matchThemeAlias("SOLDIER saints")).toBe("soldiers");
  });

  it("returns null when nothing matches", () => {
    expect(matchThemeAlias("stylite")).toBeNull();
    expect(matchThemeAlias("")).toBeNull();
  });

  it("first matching fragment wins (more specific phrases listed first)", () => {
    // "defended icons" is listed before the bare "convert"/"martyr" fragments;
    // a query containing both resolves to the earlier, more specific alias.
    expect(matchThemeAlias("martyrs who defended icons")).toBe(
      "icon-defenders",
    );
  });

  it("matches substrings by design (persecut covers persecution/persecuted)", () => {
    expect(matchThemeAlias("persecuted for the faith")).toBe("persecution");
  });

  it("every alias phrase is lowercased and maps to a non-empty slug", () => {
    for (const a of THEME_ALIASES) {
      expect(a.phrase).toBe(a.phrase.toLowerCase());
      expect(a.slug.length).toBeGreaterThan(0);
    }
  });
});
