import { describe, it, expect } from "vitest";
import { selectProfiles } from "./profile-select";

const reviewed = { id: "OS-0001", status: "reviewed" as const };
const draft = { id: "OS-0002", status: "draft" as const };
const flagged = { id: "OS-0003", status: "flagged" as const };

describe("selectProfiles", () => {
  it("in production (showDrafts=false) keeps only reviewed", () => {
    const out = selectProfiles([reviewed, draft, flagged], false);
    expect(Object.keys(out)).toEqual(["OS-0001"]);
  });

  it("in dev (showDrafts=true) keeps all, keyed by id", () => {
    const out = selectProfiles([reviewed, draft, flagged], true);
    expect(Object.keys(out).sort()).toEqual(["OS-0001", "OS-0002", "OS-0003"]);
    expect(out["OS-0002"]).toBe(draft);
  });
});
