import { describe, expect, it } from "vitest";
import {
  type DateToken,
  type PaschaTable,
  daysUntil,
  groupMonth,
  liturgicalSort,
  nextOccurrence,
  resolveToken,
  tokenDateline,
  tokenLabel,
} from "./feast-dates";

const PASCHA: PaschaTable = {
  "2026": "2026-04-12",
  "2027": "2027-05-02",
};

const fixed = (month: number, day: number): DateToken => ({
  type: "fixed",
  month,
  day,
});
const paschal = (offset: number): DateToken => ({ type: "paschal", offset });

describe("resolveToken", () => {
  it("resolves fixed dates", () => {
    const d = resolveToken(fixed(12, 25), 2026, PASCHA)!;
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([
      2026, 12, 25,
    ]);
  });

  it("resolves paschal offsets from the table (Pentecost 2026 = May 31)", () => {
    const d = resolveToken(paschal(49), 2026, PASCHA)!;
    expect([d.getMonth() + 1, d.getDate()]).toEqual([5, 31]);
  });

  it("resolves negative offsets (Clean Monday 2026 = Feb 23)", () => {
    const d = resolveToken(paschal(-48), 2026, PASCHA)!;
    expect([d.getMonth() + 1, d.getDate()]).toEqual([2, 23]);
  });

  it("returns null for a year outside the Pascha table", () => {
    expect(resolveToken(paschal(0), 2099, PASCHA)).toBeNull();
  });

  it("resolves anchored tokens strictly within the window", () => {
    // Sunday before Dec 25, 2026: Dec 25 is a Friday → Sun Dec 20.
    const tok: DateToken = {
      type: "anchored",
      dow: 0,
      rel: "before",
      month: 12,
      day: 25,
    };
    const d = resolveToken(tok, 2026, PASCHA)!;
    expect([d.getMonth() + 1, d.getDate(), d.getDay()]).toEqual([12, 20, 0]);
    // Sunday after Jan 6, 2026: Jan 6 is a Tuesday → Sun Jan 11.
    const after: DateToken = {
      type: "anchored",
      dow: 0,
      rel: "after",
      month: 1,
      day: 6,
    };
    const a = resolveToken(after, 2026, PASCHA)!;
    expect([a.getMonth() + 1, a.getDate(), a.getDay()]).toEqual([1, 11, 0]);
  });

  it("anchored is strict: anchor day itself never matches", () => {
    // Dec 20, 2026 IS a Sunday; Sun before Dec 20 must be Dec 13.
    const tok: DateToken = {
      type: "anchored",
      dow: 0,
      rel: "before",
      month: 12,
      day: 20,
    };
    const d = resolveToken(tok, 2026, PASCHA)!;
    expect(d.getDate()).toBe(13);
  });
});

describe("nextOccurrence / daysUntil", () => {
  it("rolls into next year when this year's date has passed", () => {
    const from = new Date(2026, 11, 26); // Dec 26, 2026
    const d = nextOccurrence(fixed(12, 25), from, PASCHA)!;
    expect(d.getFullYear()).toBe(2027);
  });

  it("keeps today when the feast is today", () => {
    const from = new Date(2026, 11, 25, 14, 30); // afternoon of the feast
    const d = nextOccurrence(fixed(12, 25), from, PASCHA)!;
    expect([d.getFullYear(), d.getDate()]).toEqual([2026, 25]);
    expect(daysUntil(d, from)).toBe(0);
  });

  it("counts whole days", () => {
    const from = new Date(2026, 6, 5); // Jul 5
    const d = nextOccurrence(fixed(8, 1), from, PASCHA)!;
    expect(daysUntil(d, from)).toBe(27);
  });
});

describe("labels & ordering", () => {
  it("labels tokens", () => {
    expect(tokenLabel(fixed(12, 25))).toBe("Dec 25");
    expect(tokenLabel(paschal(0))).toBe("Pascha");
    expect(tokenLabel(paschal(49))).toBe("P+49");
    expect(tokenLabel(paschal(-48))).toBe("P−48");
    expect(
      tokenLabel({
        type: "anchored",
        dow: 6,
        rel: "before",
        month: 10,
        day: 26,
      }),
    ).toBe("Sat before Oct 26");
  });

  it("datelines mark the cycle", () => {
    expect(tokenDateline(fixed(9, 8))).toBe("Sep 8 · Fixed");
    expect(tokenDateline(paschal(39))).toBe("P+39 · Movable");
  });

  it("liturgical sort runs Sep→Aug with paschal grouped apart", () => {
    const sep = liturgicalSort(fixed(9, 1));
    const jan = liturgicalSort(fixed(1, 6));
    const aug = liturgicalSort(fixed(8, 15));
    const pas = liturgicalSort(paschal(-70));
    expect(sep).toBeLessThan(jan);
    expect(jan).toBeLessThan(aug);
    expect(pas).toBeGreaterThan(aug);
    expect(groupMonth(paschal(0))).toBeNull();
    expect(groupMonth(fixed(10, 1))).toBe(10);
  });
});
