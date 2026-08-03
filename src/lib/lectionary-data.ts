/* Build-time loader for public/lectionary/ (emitted by lectionarylib.py via
   build.py) — same fs-read pattern and caveats as lib/feasts.ts: the Python
   build MUST run before `astro build`, and the dev server does not watch the
   files. Server-only (fs); the calendar island imports only the pure helpers
   in lib/lectionary and fetches a shard at runtime. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { LectionaryYear } from "./lectionary";

const DIR = join(process.cwd(), "public", "lectionary");

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(join(DIR, file), "utf-8")) as T;
  } catch {
    // A checkout that has never run scripts/harvest_lectionary.py builds fine;
    // the calendar simply shows no readings. build.py warns about it there.
    return null;
  }
}

let cachedYears: number[] | undefined;

/** The harvested years, ascending. Empty when no lectionary data is present. */
export function lectionaryYears(): number[] {
  if (cachedYears) return cachedYears;
  const index = readJson<{ years: number[] }>("index.json");
  cachedYears = index?.years ?? [];
  return cachedYears;
}

export function lectionaryShard(year: number): LectionaryYear | null {
  return readJson<LectionaryYear>(`${year}.json`);
}

/** Site-relative path of a year's shard (pass through withBase() for hrefs).

   Unlike the finder payload this is NOT content-hashed: the island has to
   derive the URL from whichever year the reader navigated to, so the filename
   must be predictable. That is safe here because a harvested year is
   effectively immutable — the readings appointed for 2027 do not change
   between deploys — so a stale cached shard says the same thing as a fresh
   one. If the harvest ever gains a correction pass, revisit this. */
export function lectionaryDataPath(year: number | "{year}"): string {
  return `lectionary-data/${year}.json`;
}

/** The same path with `{year}` left unsubstituted, for the island to fill in.
    The page ships one template rather than twenty URLs. */
export function lectionaryDataTemplate(): string {
  return lectionaryDataPath("{year}");
}
