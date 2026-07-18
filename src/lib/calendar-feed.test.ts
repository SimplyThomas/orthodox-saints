// src/lib/calendar-feed.test.ts
import { describe, it, expect } from "vitest";
import { parseFeastDays } from "./calendar-feed";

describe("parseFeastDays", () => {
  it("parses a multi-date feast string to {month, day}", () => {
    expect(parseFeastDays("Sep 4; Dec 10")).toEqual([
      { month: 9, day: 4 },
      { month: 12, day: 10 },
    ]);
  });
  it("returns [] for blank or unparseable input", () => {
    expect(parseFeastDays("")).toEqual([]);
    expect(parseFeastDays("Movable")).toEqual([]);
  });
  it("ignores tokens it cannot parse but keeps the good ones", () => {
    expect(parseFeastDays("Jan 1; ???")).toEqual([{ month: 1, day: 1 }]);
  });
});
