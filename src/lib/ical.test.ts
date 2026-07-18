// src/lib/ical.test.ts
import { describe, it, expect } from "vitest";
import {
  escapeText,
  foldLine,
  formatDate,
  eventToVevent,
  buildCalendar,
} from "./ical";

describe("escapeText", () => {
  it("escapes backslash, comma, semicolon and newline", () => {
    expect(escapeText("a,b; c\\d\ne")).toBe("a\\,b\\; c\\\\d\\ne");
  });
});

describe("foldLine", () => {
  it("leaves short lines untouched", () => {
    expect(foldLine("SUMMARY:Pascha")).toBe("SUMMARY:Pascha");
  });
  it("folds lines longer than 75 octets with CRLF + space", () => {
    const long = "DESCRIPTION:" + "x".repeat(200);
    const folded = foldLine(long);
    expect(folded).toContain("\r\n ");
    // every physical line is <= 75 octets
    for (const seg of folded.split("\r\n"))
      expect(new TextEncoder().encode(seg).length).toBeLessThanOrEqual(75);
  });
  it("folds on OCTET boundaries for multi-byte text (em dash, ☦)", () => {
    // 3-byte codepoints: a naive 75-char fold would emit 77-octet lines.
    const long = "SUMMARY:☦ " + "trial — crucifixion — ".repeat(10);
    const folded = foldLine(long);
    for (const seg of folded.split("\r\n"))
      expect(new TextEncoder().encode(seg).length).toBeLessThanOrEqual(75);
    // Round-trips to the original once unfolded (CRLF + leading space removed).
    expect(folded.split("\r\n ").join("")).toBe(long);
  });
});

describe("formatDate", () => {
  it("formats a local date as YYYYMMDD", () => {
    expect(formatDate(new Date(2027, 0, 7))).toBe("20270107"); // Jan 7 2027
  });
});

describe("eventToVevent", () => {
  it("emits an all-day VEVENT with a yearly RRULE and escaped summary", () => {
    const v = eventToVevent({
      uid: "saintday-12-06-new@orthodoxsaintfinder.com",
      start: new Date(2020, 11, 6),
      allDay: true,
      recurYearly: true,
      summary: "St Nicholas, a, b",
      description: "line1\nline2",
      url: "https://orthodoxsaintfinder.com/saint/OS-0007",
    });
    expect(v).toContain("BEGIN:VEVENT");
    expect(v).toContain("UID:saintday-12-06-new@orthodoxsaintfinder.com");
    expect(v).toContain("DTSTAMP:20200101T000000Z"); // required by RFC 5545 §3.6.1
    expect(v).toContain("DTSTART;VALUE=DATE:20201206");
    expect(v).toContain("DTEND;VALUE=DATE:20201207"); // exclusive end = start + 1 day
    expect(v).toContain("RRULE:FREQ=YEARLY");
    expect(v).toContain("SUMMARY:St Nicholas\\, a\\, b");
    expect(v).toContain("URL:https://orthodoxsaintfinder.com/saint/OS-0007");
    expect(v).toContain("END:VEVENT");
  });
});

describe("buildCalendar", () => {
  it("wraps events with VCALENDAR headers and the calendar name", () => {
    const cal = buildCalendar({ name: "Test Cal", events: [] });
    expect(cal.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(cal).toContain("VERSION:2.0");
    expect(cal).toContain("NAME:Test Cal"); // RFC 7986
    expect(cal).toContain("X-WR-CALNAME:Test Cal"); // older extension
    expect(cal.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(cal.includes("\n") && cal.includes("\r\n")).toBe(true); // CRLF line endings
  });
  it("emits DESCRIPTION + X-WR-CALDESC only when a description is given", () => {
    const withDesc = buildCalendar({
      name: "T",
      description: "A feed",
      events: [],
    });
    expect(withDesc).toContain("DESCRIPTION:A feed");
    expect(withDesc).toContain("X-WR-CALDESC:A feed");
    const without = buildCalendar({ name: "T", events: [] });
    expect(without).not.toContain("X-WR-CALDESC:");
  });
});
