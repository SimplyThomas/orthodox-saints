import { describe, it, expect } from "vitest";
import type { SaintProfile } from "./profile-types";

// Glob the raw files WITH their paths so we can check filename ↔ id agreement.
const modules = import.meta.glob<{ default: SaintProfile }>("./profiles/*.ts", {
  eager: true,
});
const entries = Object.entries(modules).map(([path, m]) => ({
  path,
  profile: m.default,
}));

const ID_RE = /^OS-\d{4,}$/;
const STATUSES = new Set(["draft", "reviewed", "flagged"]);

describe("per-saint profile files", () => {
  it("has at least the migrated profiles", () => {
    expect(entries.length).toBeGreaterThanOrEqual(23);
  });

  it("each filename matches its profile id and the OS-#### shape", () => {
    for (const { path, profile } of entries) {
      const stem = path.split("/").pop()!.replace(/\.ts$/, "");
      expect(profile.id, `${path}: id must equal filename`).toBe(stem);
      expect(ID_RE.test(profile.id), `${path}: bad id ${profile.id}`).toBe(
        true,
      );
    }
  });

  it("each profile has a valid status and a non-empty overview", () => {
    for (const { path, profile } of entries) {
      expect(profile.status, `${path}: missing status`).toBeDefined();
      expect(STATUSES.has(profile.status!), `${path}: bad status`).toBe(true);
      expect(
        profile.overview.length,
        `${path}: empty overview`,
      ).toBeGreaterThan(0);
    }
  });

  it("draft/flagged profiles cite at least one source (spec §6)", () => {
    for (const { path, profile } of entries) {
      if (profile.status !== "reviewed") {
        expect(
          (profile.sources ?? []).length,
          `${path}: ${profile.status} profile needs sources`,
        ).toBeGreaterThan(0);
      }
    }
  });
});
