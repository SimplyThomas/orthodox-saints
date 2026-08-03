import { describe, expect, it } from "vitest";
import {
  dayKey,
  hasReadings,
  normalizeRef,
  passageNote,
  passageUrl,
  readingGroups,
  readingsFor,
  traditionFor,
  type DayReadings,
  type LectionaryYear,
} from "./lectionary";

const shard: LectionaryYear = {
  year: 2026,
  days: {
    "11-16": {
      greek: {
        title: "Monday of the 25th week after Pentecost",
        epistle: [
          { ref: "2 Thessalonians 1.1-10" },
          { ref: "1 Corinthians 4.9-16", for: "St Matthew" },
        ],
        gospel: [{ ref: "Luke 14.12-15" }],
        matins: [{ ref: "John 21.15-25" }],
      },
      slavic: {
        title: "Monday of the 25th week after Pentecost",
        epistle: [{ ref: "2 Thessalonians 1.1-10" }],
        gospel: [{ ref: "Luke 14.12-15" }],
      },
    },
    // A Lenten weekday: no Liturgy at all, so nothing but Vespers and the Hours.
    "03-04": {
      greek: {
        title: "Wednesday of the Second Week of Lent",
        vespers: [{ ref: "Genesis 4.16-26" }, { ref: "Proverbs 5.15-6.3" }],
        other: [{ service: "6th Hour", ref: "Isaiah 5.16-25" }],
      },
    },
  },
};

describe("traditionFor", () => {
  it("maps the calendar toggle to a usage", () => {
    expect(traditionFor("new")).toBe("greek");
    expect(traditionFor("old")).toBe("slavic");
  });
});

describe("readingsFor", () => {
  it("reads the tradition the style selects", () => {
    const nov16 = new Date(2026, 10, 16);
    expect(readingsFor(shard, nov16, "new")?.epistle).toHaveLength(2);
    expect(readingsFor(shard, nov16, "old")?.epistle).toHaveLength(1);
  });

  it("returns null for a day the shard does not carry", () => {
    expect(readingsFor(shard, new Date(2026, 5, 1), "new")).toBeNull();
  });

  it("refuses a shard from the wrong year rather than reading across it", () => {
    expect(readingsFor(shard, new Date(2027, 10, 16), "new")).toBeNull();
  });

  it("survives a missing shard", () => {
    expect(readingsFor(null, new Date(2026, 10, 16))).toBeNull();
    expect(hasReadings(null)).toBe(false);
  });

  it("keys on the civil month and day", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("01-05");
    expect(dayKey(new Date(2026, 10, 16))).toBe("11-16");
  });
});

describe("readingGroups", () => {
  it("leads with Epistle and Gospel and folds the rest away", () => {
    const groups = readingGroups(
      readingsFor(shard, new Date(2026, 10, 16), "new"),
    );
    expect(groups.map((g) => [g.label, g.primary])).toEqual([
      ["Epistle", true],
      ["Gospel", true],
      ["At Matins", false],
    ]);
  });

  it("promotes Vespers on a day with no Liturgy", () => {
    // A Lenten weekday has no Liturgy, so its Vespers Old-Testament readings
    // are not a supplement — they are the whole of what is read that day.
    const groups = readingGroups(
      readingsFor(shard, new Date(2026, 2, 4), "new"),
    );
    expect(groups.find((g) => g.label === "At Vespers")?.primary).toBe(true);
  });

  it("prints one pericope once, however many labels the source gives it", () => {
    // 16 Nov 2026 lists Matt 9.9-13 under both "St Matthew" and "Matthew the
    // Apostle" — one saint, two names in the source.
    const groups = readingGroups({
      gospel: [
        { ref: "Luke 14.12-15" },
        { ref: "Matthew 9.9-13", for: "St Matthew" },
        { ref: "Matthew 9.9-13", for: "Matthew the Apostle" },
      ],
    });
    expect(groups[0].readings).toEqual([
      { ref: "Luke 14.12-15" },
      { ref: "Matthew 9.9-13", for: "St Matthew" },
    ]);
  });

  it("is empty for a day with nothing appointed", () => {
    expect(readingGroups(null)).toEqual([]);
    expect(readingGroups({} as DayReadings)).toEqual([]);
  });
});

describe("normalizeRef", () => {
  it("converts the books' chapter.verse to a Bible site's chapter:verse", () => {
    expect(normalizeRef("Colossians 2.8-12")).toBe("Colossians 2:8-12");
    expect(normalizeRef("Luke 2.20-21, 40-52")).toBe("Luke 2:20-21, 40-52");
  });

  it("reduces the Septuagint's dual numbering to the name a Bible indexes", () => {
    expect(normalizeRef("4[2] Kings 2.6-14")).toBe("2 Kings 2:6-14");
    expect(normalizeRef("3 [1] Kings 7:51-8:1")).toBe("1 Kings 7:51-8:1");
  });

  it("leaves a single-chapter book's bare verse range alone", () => {
    expect(normalizeRef("Jude 1-10")).toBe("Jude 1-10");
  });
});

describe("passageUrl", () => {
  it("builds a lookup link", () => {
    const url = passageUrl("Colossians 2.8-12");
    expect(url).toContain("biblegateway.com");
    expect(url).toContain(encodeURIComponent("Colossians 2:8-12"));
  });

  it("refuses to link a composite, which would resolve to the wrong passage", () => {
    expect(passageUrl("Composite 1 - Genesis 17.1-2, 4")).toBeNull();
    expect(passageNote("Composite 1 - Genesis 17.1-2, 4")).toMatch(
      /service book/,
    );
  });

  it("warns where the Septuagint and an English Bible will not line up", () => {
    expect(passageNote("Wisdom of Solomon 4.7-15")).toMatch(/Septuagint/);
    expect(passageNote("Luke 14.12-15")).toBeNull();
  });
});
