/* Build-time data source. Astro/Vite inlines public/data.json (emitted by the
   Python pipeline, build.py) at build time — it is NOT fetched at runtime. The
   Python build MUST run before `astro build`, or this import fails. */

import type { Saint, FinderSaint, CardSaint } from "./types";
import raw from "../../public/data.json";

export const SAINTS = raw as unknown as Saint[];

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
    ...(s.variants ? { variants: s.variants } : {}),
    ...(s.image ? { image: s.image } : {}),
  };
}

export const FINDER_SAINTS: FinderSaint[] = SAINTS.map(toFinderSaint);

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
  };
}

export const CARD_SAINTS: CardSaint[] = SAINTS.map(toCardSaint);
