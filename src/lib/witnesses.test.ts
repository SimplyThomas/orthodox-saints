import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { WITNESSES } from "./witnesses";
import { iconThumbPath, witnessAvatar } from "./icons";

/* The §9 licensing gate for witness photographs.

   Saint portraits are validated by build.py because they live in a CSV;
   witnesses live in TypeScript, so this suite is their gate. It enforces the
   same rules: an open licence, a credit on every CC-BY* file, a verifiable
   source page, and a self-hosted file (plus its avatar thumb) that actually
   exists on disk. */

const OPEN = /^(PD|PD-art|PD-old|CC0|CC-BY(-SA)?(-\d(\.\d)?)?)$/;
const staticPath = (rel: string) =>
  fileURLToPath(new URL(`../../static/${rel}`, import.meta.url));

const withPortrait = WITNESSES.filter((w) => w.portrait);

describe("witness portraits", () => {
  it("has at least one portrait to check", () => {
    expect(withPortrait.length).toBeGreaterThan(0);
  });

  it.each(withPortrait.map((w) => [w.slug, w] as const))(
    "%s carries an open licence, a source, and self-hosted files",
    (_slug, w) => {
      const p = w.portrait!;
      expect(p.license).toMatch(OPEN);
      // CC-BY* is an attribution licence — a credit is mandatory.
      if (p.license.toUpperCase().startsWith("CC-BY")) {
        expect(p.credit?.trim()).toBeTruthy();
      }
      expect(p.source).toMatch(/^https:\/\//);
      // Self-hosted under static/icons/witness/ — never a hotlink.
      expect(p.path).toMatch(/^icons\/witness\/[\w.-]+\.jpg$/);
      expect(existsSync(staticPath(p.path))).toBe(true);
      // The ~200px avatar thumb the cards load.
      expect(existsSync(staticPath(iconThumbPath(p.path)))).toBe(true);
    },
  );
});

describe("witnessAvatar", () => {
  it("renders the photograph, preferring the thumb at avatar sizes", () => {
    const w = WITNESSES.find((x) => x.portrait)!;
    expect(witnessAvatar(w, 84, 104)).toContain(
      iconThumbPath(w.portrait!.path),
    );
    expect(witnessAvatar(w, 286, 358)).toContain(w.portrait!.path);
  });

  it("falls back to the awaiting monogram (no cross) without a portrait", () => {
    const html = witnessAvatar({ name: "Anonymous Witness" }, 84, 104);
    expect(html).toContain("<svg");
    expect(html).not.toContain("<line");
  });
});
