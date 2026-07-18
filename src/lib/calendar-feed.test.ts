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
import { saintDayEvents } from "./calendar-feed";

const SAINTS_FIXTURE = [
  { id: "OS-0007", name: "Nicholas the Wonderworker", feast: "Dec 6" },
  { id: "OS-0100", name: "Abramios the Recluse", feast: "Dec 6" },
  { id: "OS-0200", name: "No Feast", feast: "" },
];

describe("saintDayEvents", () => {
  it("aggregates one event per day (New calendar) with count in the summary", () => {
    const evs = saintDayEvents(SAINTS_FIXTURE, "new", "https://x.test/");
    expect(evs).toHaveLength(1);
    const e = evs[0];
    expect(e.start.getMonth()).toBe(11); // December
    expect(e.start.getDate()).toBe(6);
    expect(e.recurYearly).toBe(true);
    expect(e.summary).toMatch(/Nicholas the Wonderworker/);
    expect(e.summary).toMatch(/1 other/);
    expect(e.description).toContain("https://x.test/saint/OS-0007");
    expect(e.uid).toBe("saintday-12-06-new@orthodoxsaintfinder.com");
  });
  it("shifts the day +13 for the Old calendar (Dec 6 -> Dec 19)", () => {
    const evs = saintDayEvents(SAINTS_FIXTURE, "old", "https://x.test/");
    expect(evs[0].start.getDate()).toBe(19);
    expect(evs[0].uid).toBe("saintday-12-19-old@orthodoxsaintfinder.com");
  });
});
