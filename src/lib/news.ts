/* "Saints in the News" — a reverent archive of miracle accounts, glorifications,
   relic discoveries, apparitions and healings.

   NOTE: this is *sample editorial content* ported from the Claude Design mock,
   not a live feed and not part of the saints dataset (data/saints.csv). The tone
   is documentary, never sensational. The articles themselves live as one
   validated YAML file per article in src/content/news/*.yaml (the `news` content
   collection), read back via loadNews(); only the page furniture (NEWS_CATS,
   NEWS_VERIFY, NEWS_THISDAY, NEWS_MOSTREAD) and the small derived helpers
   (ord/regionOf/postRank/centuriesIn) remain in this module.
   When a real source/feed is wired up, replace those YAML files (or back the
   collection with a CMS / RSS aggregation) and the pages follow. Each account is
   illustrative until verified against the Church's own discernment, in keeping
   with the project's sourcing guardrails. */

import { getCollection } from "astro:content";

export interface NewsCat {
  id: string;
  name: string;
  /** short label for the filter chips, where the full desk name is too wide */
  short: string;
  blurb: string;
  ink: string;
  bg: string;
  count: number;
}

/** Level of evidence behind an account, strongest (A) to weakest (D). */
export type VerifyLevel = "A" | "B" | "C" | "D";

export interface NewsVerify {
  letter: VerifyLevel;
  /** short name for chips and facet rows */
  name: string;
  /** the full standard, spelled out in the legend and the article notice */
  full: string;
  ink: string;
  bg: string;
  line: string;
  dot: string;
  /** D is drawn with a dashed border — it rests on oral tradition alone */
  dashed?: boolean;
}

export interface NewsSaintRef {
  name: string;
  type: string;
  epithet?: string;
  note?: string;
}

export interface NewsSourceGroup {
  h: string;
  items: string[];
}

export interface NewsItem {
  /** slug — used for /news/[slug] */
  id: string;
  cat: string;
  /** the century the account belongs to (badge, filter, archive facet) */
  century: number;
  /** the level of evidence behind it — see NEWS_VERIFY */
  verify: VerifyLevel;
  saint: NewsSaintRef;
  headline: string;
  date: string;
  location: string;
  summary: string;
  /** names a body rather than a person in the article metadata bar */
  saintLabel?: string;
  /** lead-story extras */
  kicker?: string;
  dek?: string;
  plate?: string;
  /** full article body paragraphs ([0] takes the drop-cap) */
  body?: string[];
  pullQuote?: { text: string; attribution: string };
  caption?: string;
  sources?: NewsSourceGroup[];
  relatedSaints?: NewsSaintRef[];
}

/* Category desks — muted Byzantine tones, one per subject. */
export const NEWS_CATS: NewsCat[] = [
  {
    id: "healings",
    name: "Healings",
    short: "Healings",
    blurb: "Medical recoveries and physical healings.",
    ink: "#3d6157",
    bg: "rgba(61,97,87,.12)",
    count: 64,
  },
  {
    id: "apparitions",
    name: "Apparitions",
    short: "Apparitions",
    blurb: "Appearances of the saints and the holy angels.",
    ink: "#4A6F96",
    bg: "rgba(74,111,150,.14)",
    count: 38,
  },
  {
    id: "icons",
    name: "Wonderworking Icons",
    short: "Icons",
    blurb: "Myrrh-streaming, weeping, and miracle-working icons.",
    ink: "#a9852a",
    bg: "rgba(212,175,55,.16)",
    count: 51,
  },
  {
    id: "relics",
    name: "Relics",
    short: "Relics",
    blurb: "Discoveries, incorrupt relics, healings, and pilgrimages.",
    ink: "#8d3a2f",
    bg: "rgba(141,58,47,.10)",
    count: 47,
  },
  {
    id: "modern",
    name: "Modern Saints",
    short: "Modern Saints",
    blurb: "Miracles involving contemporary saints.",
    ink: "#234C7A",
    bg: "rgba(35,76,122,.10)",
    count: 73,
  },
  {
    id: "america",
    name: "Orthodox America",
    short: "America",
    blurb: "Miracles and events of Orthodoxy in North America.",
    ink: "#1f5e54",
    bg: "rgba(31,94,84,.12)",
    count: 29,
  },
  {
    id: "historical",
    name: "Historical Reports",
    short: "Historical",
    blurb: "Ancient accounts presented as archived dispatches.",
    ink: "#6b5326",
    bg: "rgba(107,83,38,.12)",
    count: 112,
  },
];

export const NEWS_CAT: Record<string, NewsCat> = Object.fromEntries(
  NEWS_CATS.map((c) => [c.id, c]),
);

/* The editorial standard of evidence. Every account carries one of these, shown
   as a boxed letter beside it and spelled out in the legend on /news. A is a
   primary historical source; D rests on living oral tradition alone and is drawn
   with a dashed border so the difference is visible at a glance. */
export const NEWS_VERIFY: Record<VerifyLevel, NewsVerify> = {
  A: {
    letter: "A",
    name: "Primary Source",
    full: "Primary historical source",
    ink: "#7a5a14",
    bg: "rgba(212,175,55,.20)",
    line: "rgba(168,133,42,.6)",
    dot: "#D4AF37",
  },
  B: {
    letter: "B",
    name: "Church-Attested",
    full: "Church-attested source",
    ink: "#234C7A",
    bg: "rgba(35,76,122,.12)",
    line: "rgba(35,76,122,.4)",
    dot: "#234C7A",
  },
  C: {
    letter: "C",
    name: "Published Testimony",
    full: "Published testimony",
    ink: "#3d6157",
    bg: "rgba(61,97,87,.14)",
    line: "rgba(61,97,87,.4)",
    dot: "#3d6157",
  },
  D: {
    letter: "D",
    name: "Oral Tradition",
    full: "Oral tradition",
    ink: "#8a6a2f",
    bg: "transparent",
    line: "rgba(168,133,42,.55)",
    dot: "#a9852a",
    dashed: true,
  },
};

export const NEWS_VERIFY_LIST: VerifyLevel[] = ["A", "B", "C", "D"];

/** 1 → "1st", 4 → "4th", 21 → "21st". */
export function ord(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* Coarse region of an account, derived from its location string — the archive's
   "Place" facet. Ordered most-specific first: Mount Athos is in Greece, and
   Alaska in North America, so those tests must come before the broader ones. */
export function regionOf(location: string): string {
  const s = (location || "").toLowerCase();
  if (/alaska|york|brooklyn|francisco|america|kwethluk|spruce|kodiak/.test(s))
    return "North America";
  if (/athos/.test(s)) return "Mount Athos";
  if (/russia|petersburg|kiev|sarov|kursk|diveyevo|radonezh|crimea/.test(s))
    return "Russia & the Slavs";
  if (
    /greece|aegina|corfu|thessal|attica|evia|milesi|makri|tempe|lykovrysi|piraeus/.test(
      s,
    )
  )
    return "Greece";
  if (
    /constantinople|nicaea|ephesus|bithynia|smyrna|phrygia|colossae|chonae|blachernae/.test(
      s,
    )
  )
    return "Asia Minor & Byzantium";
  if (/egypt|thebaid|desert|syria|cyrrhus|cappadocia|göreme|goreme/.test(s))
    return "Egypt & the East";
  if (/italy|bari|rome/.test(s)) return "Italy & the West";
  if (/england|essex|tolleshunt|knights/.test(s)) return "Britain & the West";
  if (/aegean|sea/.test(s)) return "At sea";
  return "Elsewhere";
}

/* Sort key for "in the order received": a real calendar date ("June 5, 2026")
   ranks above a historical dispatch ("A.D. 325", "c. A.D. 1200"), which falls
   back to the year in its label. */
export function postRank(n: NewsItem): number {
  const t = Date.parse(n.date);
  if (!isNaN(t)) return t;
  const m = n.date.match(/(\d{3,4})/);
  return Date.UTC(m ? +m[1] : 0, 0, 1);
}

/** The centuries actually present in a set of accounts, ascending. */
export function centuriesIn(items: NewsItem[]): number[] {
  return [...new Set(items.map((n) => n.century))].sort((a, b) => a - b);
}

/* Right-rail modules. */
export const NEWS_THISDAY = {
  date: "June 7",
  year: "431",
  title: "The Third Ecumenical Council opens at Ephesus",
  body: "Two hundred fathers gathered in the Church of the Virgin Mary to confess the Mother of God as Theotokos — “she who gives birth to God” — against the teaching of Nestorius.",
};

export const NEWS_MOSTREAD: { cat: string; title: string }[] = [
  {
    cat: "modern",
    title:
      "The night the lamp would not go out: a vigil for Saint Ephraim of Nea Makri",
  },
  {
    cat: "relics",
    title: "How the relics of Saint Nicholas came to rest — and to travel",
  },
  {
    cat: "healings",
    title: "A surgeon’s notes: three recoveries he could not account for",
  },
  {
    cat: "icons",
    title:
      "What the commissions look for: discerning a true wonder from a wish",
  },
  {
    cat: "america",
    title: "The Aleut who would not betray the faith: Saint Peter the Martyr",
  },
];

/* Article accessor over the `news` Content Collection (src/content/news/
   <slug>.yaml). The editorial articles now live as validated YAML — this reads
   them back in the current NEWS array order (featured first, then the feed).
   Pages are pre-rendered, so `await`-ing this in `.astro` frontmatter is fine. */
export async function loadNews(): Promise<{
  featured: NewsItem;
  items: NewsItem[]; // non-featured, in `order` order
  all: NewsItem[]; // featured first, then items
  byId: Record<string, NewsItem>;
}> {
  const entries = (await getCollection("news")).map(
    (e) => e.data as NewsItem & { featured?: boolean; order: number },
  );
  entries.sort((a, b) => a.order - b.order);
  const featuredEntries = entries.filter((e) => e.featured);
  if (featuredEntries.length !== 1) {
    throw new Error(
      `news collection: expected exactly one featured article, found ${featuredEntries.length}`,
    );
  }
  const featured = featuredEntries[0];
  const items = entries.filter((e) => !e.featured);
  const all = [featured, ...items];
  return {
    featured,
    items,
    all,
    byId: Object.fromEntries(all.map((n) => [n.id, n])),
  };
}
