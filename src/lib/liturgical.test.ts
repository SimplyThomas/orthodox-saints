import { describe, it, expect } from "vitest";
import type { LitFeast } from "./liturgical";
import {
  activeObservances,
  dayLiturgics,
  resolveTokenCivil,
} from "./liturgical";

/* Hermetic fixtures mirroring the real data/feasts.csv rows (same FF ids and
   tokens), so the unit suite doesn't depend on the generated feasts.json.
   Pascha 2026 falls on April 12 (New Calendar civil date — shared by both
   reckonings). */
const PASCHA = { "2025": "2025-04-20", "2026": "2026-04-12" };

const F: LitFeast[] = [
  {
    id: "FF-0005",
    name: "Nativity of Christ",
    category: "Great Feast",
    dedication: "Lord",
    fasting: "Fast-Free",
    begins: { type: "fixed", month: 12, day: 25 },
    forefeast: { type: "fixed", month: 12, day: 20 },
    apodosis: { type: "fixed", month: 12, day: 31 },
  },
  {
    id: "FF-0006",
    name: "Theophany",
    category: "Great Feast",
    dedication: "Lord",
    fasting: "Fast-Free",
    begins: { type: "fixed", month: 1, day: 6 },
    forefeast: { type: "fixed", month: 1, day: 2 },
    apodosis: { type: "fixed", month: 1, day: 14 },
  },
  {
    id: "FF-0007",
    name: "Meeting of the Lord in the Temple",
    category: "Great Feast",
    dedication: "Lord",
    begins: { type: "fixed", month: 2, day: 2 },
    forefeast: { type: "fixed", month: 2, day: 1 },
    apodosis: { type: "fixed", month: 2, day: 9 },
  },
  {
    id: "FF-0008",
    name: "Annunciation of the Theotokos",
    category: "Great Feast",
    dedication: "Theotokos",
    fasting: "Fish Allowed",
    begins: { type: "fixed", month: 3, day: 25 },
    forefeast: { type: "fixed", month: 3, day: 24 },
    apodosis: { type: "fixed", month: 3, day: 26 },
  },
  {
    id: "FF-0012",
    name: "Transfiguration of the Lord",
    category: "Great Feast",
    dedication: "Lord",
    fasting: "Fish Allowed",
    begins: { type: "fixed", month: 8, day: 6 },
    forefeast: { type: "fixed", month: 8, day: 5 },
    apodosis: { type: "fixed", month: 8, day: 13 },
  },
  {
    id: "FF-0013",
    name: "Dormition of the Theotokos",
    category: "Great Feast",
    dedication: "Theotokos",
    fasting: "Fish Allowed",
    begins: { type: "fixed", month: 8, day: 15 },
    forefeast: { type: "fixed", month: 8, day: 14 },
    apodosis: { type: "fixed", month: 8, day: 23 },
  },
  {
    id: "FF-0017",
    name: "Dormition Fast",
    category: "Fast Season",
    fasting: "Strict Fast",
    begins: { type: "fixed", month: 8, day: 1 },
    ends: { type: "fixed", month: 8, day: 14 },
  },
  {
    id: "FF-0020",
    name: "Beheading of St John the Baptist",
    category: "Fast Day",
    dedication: "Forerunner",
    fasting: "Strict Fast",
    begins: { type: "fixed", month: 8, day: 29 },
  },
  {
    id: "FF-0003",
    name: "Exaltation of the Holy Cross",
    category: "Great Feast",
    dedication: "Cross",
    fasting: "Strict Fast",
    begins: { type: "fixed", month: 9, day: 14 },
    forefeast: { type: "fixed", month: 9, day: 13 },
    apodosis: { type: "fixed", month: 9, day: 21 },
  },
  {
    id: "FF-0014",
    name: "Great Lent",
    category: "Fast Season",
    fasting: "Varies",
    begins: { type: "paschal", offset: -48 },
    ends: { type: "paschal", offset: -9 },
  },
  {
    id: "FF-0038",
    name: "Sunday of the Veneration of the Cross",
    category: "Observance",
    begins: { type: "paschal", offset: -28 },
  },
  {
    id: "FF-0043",
    name: "Lazarus Saturday",
    category: "Observance",
    dedication: "Lord",
    begins: { type: "paschal", offset: -8 },
  },
  {
    id: "FF-0009",
    name: "Entry of the Lord into Jerusalem",
    category: "Great Feast",
    dedication: "Lord",
    fasting: "Fish Allowed",
    begins: { type: "paschal", offset: -7 },
  },
  {
    id: "FF-0015",
    name: "Holy Week Fast",
    category: "Fast Season",
    fasting: "Strict Fast",
    begins: { type: "paschal", offset: -6 },
    ends: { type: "paschal", offset: -1 },
  },
  {
    id: "FF-0047",
    name: "Great and Holy Thursday",
    category: "Observance",
    dedication: "Lord",
    begins: { type: "paschal", offset: -3 },
  },
  {
    id: "FF-0048",
    name: "Great and Holy Friday",
    category: "Observance",
    dedication: "Lord",
    fasting: "Strict Fast",
    begins: { type: "paschal", offset: -2 },
  },
  {
    id: "FF-0049",
    name: "Great and Holy Saturday",
    category: "Observance",
    dedication: "Lord",
    begins: { type: "paschal", offset: -1 },
  },
  {
    id: "FF-0001",
    name: "Pascha",
    category: "Feast of Feasts",
    dedication: "Lord",
    fasting: "Fast-Free",
    begins: { type: "paschal", offset: 0 },
    apodosis: { type: "paschal", offset: 38 },
  },
  {
    id: "FF-0050",
    name: "Bright Week",
    category: "Fast-Free Week",
    dedication: "Lord",
    fasting: "Fast-Free",
    begins: { type: "paschal", offset: 1 },
    ends: { type: "paschal", offset: 6 },
  },
  {
    id: "FF-0010",
    name: "Ascension of the Lord",
    category: "Great Feast",
    dedication: "Lord",
    begins: { type: "paschal", offset: 39 },
    apodosis: { type: "paschal", offset: 47 },
  },
  {
    id: "FF-0011",
    name: "Pentecost",
    category: "Great Feast",
    dedication: "Lord",
    fasting: "Fast-Free",
    begins: { type: "paschal", offset: 49 },
    apodosis: { type: "paschal", offset: 55 },
  },
  {
    id: "FF-0062",
    name: "Monday of the Holy Spirit",
    category: "Observance",
    begins: { type: "paschal", offset: 50 },
  },
  {
    id: "FF-0032",
    name: "Clean Monday",
    category: "Observance",
    begins: { type: "paschal", offset: -48 },
  },
  {
    id: "FF-0021",
    name: "Nativity-to-Theophany Fast-Free Period",
    category: "Fast-Free Week",
    fasting: "Fast-Free",
    begins: { type: "fixed", month: 12, day: 25 },
    ends: { type: "fixed", month: 1, day: 4 },
  },
  {
    id: "FF-0074",
    name: "Sunday of the Holy Forefathers",
    category: "Observance",
    dedication: "Saints",
    begins: { type: "anchored", dow: 0, rel: "before", month: 12, day: 18 },
  },
];

const day = (y: number, m: number, d: number, style: "new" | "old" = "new") => {
  const date = new Date(y, m - 1, d);
  return dayLiturgics(activeObservances(F, PASCHA, date, style), date);
};

describe("resolveTokenCivil", () => {
  it("keeps fixed dates put in New style and shifts them +13 in Old style", () => {
    const t = { type: "fixed", month: 12, day: 25 } as const;
    expect(resolveTokenCivil(t, 2026, PASCHA, "new")).toEqual(
      new Date(2026, 11, 25),
    );
    expect(resolveTokenCivil(t, 2026, PASCHA, "old")).toEqual(
      new Date(2027, 0, 7),
    );
  });
  it("never shifts paschal tokens", () => {
    const t = { type: "paschal", offset: 49 } as const;
    expect(resolveTokenCivil(t, 2026, PASCHA, "new")).toEqual(
      new Date(2026, 4, 31),
    );
    expect(resolveTokenCivil(t, 2026, PASCHA, "old")).toEqual(
      new Date(2026, 4, 31),
    );
  });
  it("resolves weekday anchors against the shifted anchor in Old style", () => {
    const t = {
      type: "anchored",
      dow: 0,
      rel: "before",
      month: 12,
      day: 18,
    } as const;
    const oldStyle = resolveTokenCivil(t, 2026, PASCHA, "old")!;
    expect(oldStyle.getDay()).toBe(0); // still a real Sunday
    // strictly before the shifted anchor (Dec 18 + 13 = Dec 31)
    expect(oldStyle.getTime()).toBeLessThan(new Date(2026, 11, 31).getTime());
    expect(oldStyle.getTime()).toBeGreaterThan(
      new Date(2026, 11, 23).getTime(),
    );
  });
});

describe("great feasts control the day color in both calendar styles", () => {
  it("Dormition is blue on civil Aug 15 (new) and civil Aug 28 (old)", () => {
    expect(day(2026, 8, 15, "new").color).toBe("blue");
    expect(day(2026, 8, 28, "old").color).toBe("blue");
    // civil Aug 15 in old style sits inside the SHIFTED Dormition Fast — the
    // color assignment moved with the feast, not with the Gregorian date
    const oldAug15 = day(2026, 8, 15, "old");
    expect(oldAug15.reason).toMatch(/Dormition Fast/);
    expect(oldAug15.reason).not.toMatch(/Dormition of the Theotokos/);
  });
  it("Nativity is white on civil Dec 25 (new) and civil Jan 7 (old)", () => {
    expect(day(2026, 12, 25, "new").color).toBe("white");
    expect(day(2027, 1, 7, "old").color).toBe("white");
  });
  it("Theophany, Meeting, Annunciation, Transfiguration carry their colors when shifted", () => {
    expect(day(2026, 1, 6, "new").color).toBe("white");
    expect(day(2026, 1, 19, "old").color).toBe("white");
    expect(day(2026, 2, 2, "new").color).toBe("white");
    expect(day(2026, 2, 15, "old").color).toBe("white");
    expect(day(2026, 3, 25, "new").color).toBe("blue");
    expect(day(2026, 4, 7, "old").color).toBe("blue");
    expect(day(2026, 8, 6, "new").color).toBe("gold");
    expect(day(2026, 8, 19, "old").color).toBe("gold");
  });
  it("Exaltation of the Cross is red with a local-custom note", () => {
    const d = day(2026, 9, 14);
    expect(d.color).toBe("red");
    expect(d.confidence).toBe("local-custom");
    expect(d.notes.join(" ")).toMatch(/green instead/);
    expect(day(2026, 9, 27, "old").color).toBe("red");
  });
  it("Beheading of the Forerunner is red with a strict-fast badge", () => {
    const d = day(2026, 8, 29);
    expect(d.color).toBe("red");
    expect(d.fasting?.key).toBe("strict");
    expect(day(2026, 9, 11, "old").color).toBe("red");
  });
});

describe("the paschal cycle (identical in both styles)", () => {
  it("Great Lent weekdays are purple; Clean Monday 2026 is Feb 23", () => {
    const d = day(2026, 2, 23);
    expect(d.color).toBe("purple");
    expect(day(2026, 2, 23, "old").color).toBe("purple");
  });
  it("'Varies' fasting shows the strictest traditional rule with a priest note", () => {
    const d = day(2026, 2, 23); // inside Great Lent (fasting: Varies)
    expect(d.fasting?.key).toBe("varies");
    expect(d.fasting?.label).toBe("Strict Fast (traditional rule)");
    expect(d.fasting?.note).toMatch(/parish priest/);
  });
  it("a Lenten Sunday stays purple but carries the brighter-practice note", () => {
    const d = day(2026, 3, 8); // a Sunday inside Great Lent
    expect(d.color).toBe("purple");
    expect(d.notes.join(" ")).toMatch(/brighter/);
  });
  it("Sunday of the Cross is red within the purple season", () => {
    expect(day(2026, 3, 15).color).toBe("red"); // P-28
    expect(day(2026, 3, 15, "old").color).toBe("red");
  });
  it("Lazarus Saturday gold, Palm Sunday gold", () => {
    expect(day(2026, 4, 4).color).toBe("gold");
    expect(day(2026, 4, 5).color).toBe("gold");
  });
  it("Great Thursday is purple with a red service exception", () => {
    const d = day(2026, 4, 9);
    expect(d.color).toBe("purple");
    expect(d.serviceColors[0]?.color).toBe("red");
  });
  it("Great Friday and Great Saturday are dark; Saturday turns white at the Vesperal Liturgy", () => {
    expect(day(2026, 4, 10).color).toBe("dark");
    const sat = day(2026, 4, 11);
    expect(sat.color).toBe("dark");
    expect(sat.serviceColors[0]?.color).toBe("white");
  });
  it("Pascha and Bright Week are white; the paschal afterfeast inherits white", () => {
    expect(day(2026, 4, 12).color).toBe("white");
    expect(day(2026, 4, 15).color).toBe("white"); // Bright Wednesday
    expect(day(2026, 4, 30).color).toBe("white"); // within P+1..P+38
  });
  it("Ascension white; Pentecost and Holy Spirit Monday green", () => {
    expect(day(2026, 5, 21).color).toBe("white");
    expect(day(2026, 5, 31).color).toBe("green");
    expect(day(2026, 6, 1).color).toBe("green");
    expect(day(2026, 6, 1, "old").color).toBe("green");
  });
});

describe("precedence, fallbacks, and honesty", () => {
  it("a plain weekday is neutral — never green, never 'Ordinary Time'", () => {
    const d = day(2026, 7, 15); // ordinary Wednesday, no observance
    expect(d.color).toBe("neutral");
    expect(d.reason).not.toMatch(/ordinary time/i);
    expect(d.fasting).toBeNull(); // weekly Wed/Fri rule is not in the data
  });
  it("an ordinary Sunday outside any season is gold", () => {
    expect(day(2026, 7, 19).color).toBe("gold");
  });
  it("the Dormition Fast is blue (local custom) but the feast day outranks it", () => {
    const inFast = day(2026, 8, 3);
    expect(inFast.color).toBe("blue");
    expect(inFast.confidence).toBe("local-custom");
    expect(inFast.fasting?.key).toBe("strict");
    // Transfiguration (Aug 6, inside the fast) wins the day: gold + fish
    const feast = day(2026, 8, 6);
    expect(feast.color).toBe("gold");
    expect(feast.fasting?.key).toBe("fish");
  });
  it("fasting stays separate from color: Fast-Free on white Nativity", () => {
    const d = day(2026, 12, 25);
    expect(d.color).toBe("white");
    expect(d.fasting?.key).toBe("free");
    expect(d.badges).toContain("Great Feast");
    expect(d.badges).toContain("Feast of the Lord");
  });
  it("afterfeasts inherit the principal color; leavetaking is badged", () => {
    const after = day(2026, 8, 18); // Dormition afterfeast
    expect(after.color).toBe("blue");
    expect(after.badges).toContain("Afterfeast");
    const leave = day(2026, 8, 23);
    expect(leave.color).toBe("blue");
    expect(leave.badges).toContain("Leavetaking");
  });
  it("afterfeasts inherit the color but NOT the feast day's fasting rule", () => {
    // Dormition afterfeast (Aug 18): blue, but no Fish badge — the fast ended
    expect(day(2026, 8, 18).fasting).toBeNull();
    // Pascha's long apodosis (Apr 30): white, but not marked Fast-Free
    expect(day(2026, 4, 30).fasting).toBeNull();
    // while Bright Wednesday IS fast-free via the Bright Week span itself
    expect(day(2026, 4, 15).fasting?.key).toBe("free");
  });
  it("forefeasts never color the day", () => {
    const d = day(2026, 12, 22); // Nativity forefeast, a Tuesday
    expect(d.color).toBe("neutral");
    expect(d.badges).toContain("Forefeast");
  });
  it("badges name the feast category rather than relying on color alone", () => {
    const d = day(2026, 8, 15);
    expect(d.badges).toContain("Great Feast");
    expect(d.badges).toContain("Feast of the Theotokos");
  });
  it("a fixed span wraps the civil New Year (fast-free days after Nativity)", () => {
    expect(day(2027, 1, 2).fasting?.key).toBe("free");
  });
});
