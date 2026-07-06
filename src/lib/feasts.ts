/* Build-time loader for public/feasts.json (emitted by feastlib.py via
   build.py) — same fs-read pattern and caveats as lib/data.ts: the Python
   build MUST run before `astro build`, and the dev server does not watch the
   file. Server-only (fs); the /feasts island gets a trimmed inline payload
   and imports only the pure lib/feast-dates helpers. */

import { readFileSync } from "node:fs";
import type { DateToken, PaschaTable } from "./feast-dates";
import { liturgicalSort } from "./feast-dates";

export interface Feast {
  id: string;
  name: string;
  aka?: string[];
  category: string;
  dedication?: string;
  fasting?: string;
  fastingNotes?: string;
  brief: string;
  customs?: string;
  observance?: string[];
  relatedSaints?: string[];
  relatedFeasts?: string[];
  icon: string;
  notes?: string;
  sources: string[];
  begins: DateToken;
  ends?: DateToken;
  forefeast?: DateToken;
  apodosis?: DateToken;
  cycle: "fixed" | "paschal" | "hybrid";
}

const raw = JSON.parse(readFileSync("public/feasts.json", "utf8")) as {
  feasts: Feast[];
  pascha: PaschaTable;
};

/** All feasts in liturgical-year order (Sep→Aug; the paschal cycle last —
    the page renders it as its own group). */
export const FEASTS: Feast[] = [...raw.feasts].sort(
  (a, b) => liturgicalSort(a.begins) - liturgicalSort(b.begins),
);

export const PASCHA: PaschaTable = raw.pascha;

/* ---- category → display kind (the design's four legend dots) ---- */
export type FeastKind = "great" | "feast" | "fast" | "observance";

export function feastKind(f: Feast): FeastKind {
  switch (f.category) {
    case "Feast of Feasts":
    case "Great Feast":
      return "great";
    case "Feast":
      return "feast";
    case "Fast Season":
    case "Fast Day":
      return "fast";
    default: // Observance, Fast-Free Week
      return "observance";
  }
}

export const KIND_LABEL: Record<FeastKind, string> = {
  great: "Great Feast",
  feast: "Feast",
  fast: "Fast",
  observance: "Observance",
};

/* ---- fasting-discipline vocab → badge tone + glyph key ---- */
export type FastTone = "free" | "strict" | "fish" | "dairy" | "wine" | "varies";

export function fastTone(discipline: string): FastTone {
  switch (discipline) {
    case "Fast-Free":
      return "free";
    case "Strict Fast":
      return "strict";
    case "Fish Allowed":
      return "fish";
    case "Dairy Allowed":
      return "dairy";
    case "Wine & Oil":
      return "wine";
    default: // Varies
      return "varies";
  }
}

/* ---- dedication → badge class (the design styles lord/theotokos/cross;
        the remaining vocab terms share a quiet neutral tone) ---- */
export function dedicationClass(dedication: string): string {
  const d = dedication.toLowerCase();
  return ["lord", "theotokos", "cross"].includes(d) ? d : "other";
}

/** The island's payload: only what today/upcoming need, kept small enough to
    inline (≈20 KB for 83 feasts — not worth a hashed-payload endpoint). */
export interface IslandFeast {
  id: string;
  name: string;
  kind: FeastKind;
  category: string;
  dedication?: string;
  fasting?: string;
  fastingNotes?: string;
  brief: string;
  begins: DateToken;
  ends?: DateToken;
}

export function islandFeasts(): IslandFeast[] {
  return FEASTS.map((f) => ({
    id: f.id,
    name: f.name,
    kind: feastKind(f),
    category: f.category,
    ...(f.dedication ? { dedication: f.dedication } : {}),
    ...(f.fasting ? { fasting: f.fasting } : {}),
    ...(f.fastingNotes ? { fastingNotes: f.fastingNotes } : {}),
    brief: f.brief,
    begins: f.begins,
    ...(f.ends ? { ends: f.ends } : {}),
  }));
}
