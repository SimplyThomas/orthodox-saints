import { describe, it, expect } from "vitest";
import { selectProfiles } from "./profile-select";
import type { SaintProfile } from "./profile-types";

const reviewed: SaintProfile = { id: "OS-0001", overview: ["a"], status: "reviewed" };
const draft: SaintProfile = { id: "OS-0002", overview: ["b"], status: "draft" };
const flagged: SaintProfile = { id: "OS-0003", overview: ["c"], status: "flagged" };
const legacy: SaintProfile = { id: "OS-0004", overview: ["d"] }; // no status

describe("selectProfiles", () => {
  it("in production (showDrafts=false) keeps only reviewed", () => {
    const out = selectProfiles([reviewed, draft, flagged, legacy], false);
    expect(Object.keys(out)).toEqual(["OS-0001"]);
  });

  it("in dev (showDrafts=true) keeps everything, keyed by id", () => {
    const out = selectProfiles([reviewed, draft, flagged, legacy], true);
    expect(Object.keys(out).sort()).toEqual([
      "OS-0001",
      "OS-0002",
      "OS-0003",
      "OS-0004",
    ]);
    expect(out["OS-0002"]).toBe(draft);
  });
});
