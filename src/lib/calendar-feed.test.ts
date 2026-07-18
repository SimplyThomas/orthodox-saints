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
// append to src/lib/calendar-feed.test.ts
import { feastEvents } from "./calendar-feed";
import type { PaschaTable } from "./feast-dates";
import type { Feast } from "./feasts";

const PASCHA: PaschaTable = { "2027": "2027-05-02" }; // Orthodox Pascha 2027

// Minimal Feast-shaped fixtures (only the fields feastEvents reads).
const NATIVITY = {
  id: "FF-0013",
  name: "Nativity of Christ",
  brief: "",
  begins: { type: "fixed", month: 12, day: 25 },
} as unknown as Feast;
const PASCHA_FEAST = {
  id: "FF-0001",
  name: "Pascha",
  brief: "",
  begins: { type: "paschal", offset: 0 },
} as unknown as Feast;

describe("feastEvents", () => {
  it("fixed feast → one yearly-recurring event; Old shifts +13", () => {
    const [nvNew] = feastEvents([NATIVITY], "new", PASCHA, [2027]);
    expect(nvNew.recurYearly).toBe(true);
    expect(nvNew.start.getMonth()).toBe(11); // Dec
    expect(nvNew.start.getDate()).toBe(25);

    const [nvOld] = feastEvents([NATIVITY], "old", PASCHA, [2027]);
    expect(nvOld.start.getMonth()).toBe(0); // Jan
    expect(nvOld.start.getDate()).toBe(7); // Old Nativity civil day
  });
  it("movable feast → one dated (non-recurring) event per year, same civil date both styles", () => {
    const evNew = feastEvents([PASCHA_FEAST], "new", PASCHA, [2027]);
    const evOld = feastEvents([PASCHA_FEAST], "old", PASCHA, [2027]);
    expect(evNew).toHaveLength(1);
    expect(evNew[0].recurYearly).toBe(false);
    expect(evNew[0].start).toEqual(new Date(2027, 4, 2)); // May 2 2027
    expect(evOld[0].start).toEqual(evNew[0].start); // Pascha shared
    expect(evNew[0].uid).toBe("feast-FF-0001-2027-new@orthodoxsaintfinder.com");
  });
});
