import { describe, it, expect } from "vitest";
import { daysInMonth, firstWeekday, monthMatrix } from "./calendar-grid";

describe("daysInMonth", () => {
  it("handles 31-, 30-, and 28-day months", () => {
    expect(daysInMonth(2026, 10)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2025, 2)).toBe(28);
  });
  it("handles leap February", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });
  it("handles December (month = 12) without rolling the year", () => {
    expect(daysInMonth(2025, 12)).toBe(31);
  });
});

describe("firstWeekday", () => {
  it("returns 0=Sunday .. 6=Saturday for the 1st of the month", () => {
    expect(firstWeekday(2026, 10)).toBe(4); // Oct 1 2026 is Thursday
    expect(firstWeekday(2026, 2)).toBe(0); // Feb 1 2026 is Sunday
    expect(firstWeekday(2025, 2)).toBe(6); // Feb 1 2025 is Saturday
  });
});

describe("monthMatrix", () => {
  it("describes October 2026: 4 leading blanks, 31 days", () => {
    const mm = monthMatrix(2026, 10);
    expect(mm.leadingBlanks).toBe(4);
    expect(mm.days).toHaveLength(31);
    expect(mm.days[0]).toBe(1);
    expect(mm.days[30]).toBe(31);
  });
  it("describes a Sunday-start month with 0 leading blanks", () => {
    const mm = monthMatrix(2026, 2);
    expect(mm.leadingBlanks).toBe(0);
    expect(mm.days).toHaveLength(28);
  });
  it("describes leap February 2024: 4 leading blanks, 29 days", () => {
    const mm = monthMatrix(2024, 2);
    expect(mm.leadingBlanks).toBe(4); // Feb 1 2024 is Thursday
    expect(mm.days).toHaveLength(29);
  });
});
