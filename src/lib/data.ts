/* Build-time data source. public/data.json (emitted by the Python pipeline,
   build.py) is read from disk when server code first imports this module — it
   is NOT fetched at runtime. The Python build MUST run before `astro build`
   (or `astro dev`), or this read fails. A plain fs read — not an ES-module
   import — keeps Vite from parsing the multi-MB JSON into a JS literal and
   embedding it in every prerender chunk, which is the dominant build
   memory/time cost as the dataset grows. The path is resolved from the
   project root (astro always runs there); import.meta.url would break once
   Vite relocates this code into a build chunk. Note: unlike the old import,
   the dev server does not watch data.json — restart `make serve` after a
   data rebuild. */

import { readFileSync } from "node:fs";
import type { Saint, FinderSaint, CardSaint } from "./types";
import { archangelFinderSaints } from "./host-finder";

const raw = JSON.parse(readFileSync("public/data.json", "utf8")) as unknown;

export const SAINTS = raw as Saint[];

export const byId: Map<string, Saint> = new Map(SAINTS.map((s) => [s.id, s]));

/* Trim a saint to the fields the finder/rows need. Drops heavy detail fields
   (prayer, sources, works, about, vendors, hymn/icon/video, customs) so the
   finder payload stays light. Full detail comes from the /saint/[id] page. */
export function toFinderSaint(s: Saint): FinderSaint {
  return {
    id: s.id,
    name: s.name,
    aka: s.aka,
    rank: s.rank,
    church: s.church,
    family: s.family,
    vocation: s.vocation,
    experience: s.experience,
    virtue: s.virtue,
    intercession: s.intercession,
    origin: s.origin,
    tradition: s.tradition,
    gender: s.gender,
    era: s.era,
    century: s.century,
    feast: s.feast,
    feastSort: s.feastSort,
    brief: s.brief,
    notes: s.notes,
    search: s.search,
    themes: s.themes || [],
    ...(s.profile_type ? { profile_type: s.profile_type } : {}),
    ...(s.groupNames && s.groupNames.length
      ? { groupNames: s.groupNames }
      : {}),
    ...(s.variants ? { variants: s.variants } : {}),
    ...(s.image ? { image: s.image } : {}),
    ...(s.imageThumb ? { imageThumb: s.imageThumb } : {}),
  };
}

// The finder (browse / search / quiz) also lists the archangels, cross-listed
// from the Heavenly Hosts DB with their traditional patronages. They route to
// /host/HH-#### (recordHref). The saint route, home, and calendar use SAINTS
// directly, so they are unaffected.
export const FINDER_SAINTS: FinderSaint[] = [
  ...SAINTS.map(toFinderSaint),
  ...archangelFinderSaints(),
];

/* Lighter still: the card projection for the home landing page (saint of the
   day + "From the Cloud" shuffle). Searching happens on /search, so the
   landing page does not need the search haystack or the full facet lists. */
export function toCardSaint(s: Saint): CardSaint {
  return {
    id: s.id,
    name: s.name,
    aka: s.aka,
    rank: s.rank,
    intercession: s.intercession,
    era: s.era,
    century: s.century,
    feast: s.feast,
    brief: s.brief,
    notes: s.notes,
    ...(s.image ? { image: s.image } : {}),
    ...(s.imageThumb ? { imageThumb: s.imageThumb } : {}),
  };
}

export const CARD_SAINTS: CardSaint[] = SAINTS.map(toCardSaint);
