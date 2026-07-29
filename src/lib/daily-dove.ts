/* THE DAILY DOVE — "Reporting from the Church Since Pentecost."

   A historical newspaper: moments from two thousand years of Church history
   written as though a paper had existed to report them at the time. Immersive
   and full of personality, but never satire and never fiction — the reporting
   voice is a device, the history underneath it is held to account.

   That accounting is this module's centre of gravity. Every claim in every
   article carries an EVIDENCE level, and every article closes with the
   Historian's Notes, where each strand of the story is set against the level
   that actually supports it. A reader must never have to guess which part of
   what they just enjoyed is documented and which belongs to the living
   tradition of the Church.

   Articles live as one validated YAML file per article in
   src/content/daily-dove/*.yaml (the `dailyDove` collection), read back via
   loadPaper(). Only the page furniture (NEWS_CATS, EVIDENCE, DEPARTMENTS,
   NEWS_THISDAY, NEWS_MOSTREAD) and the small derived helpers
   (ord/regionOf/postRank/centuriesIn) live here.

   NOTE: the 16 articles presently in the collection are placeholder editorial
   copy carried over from the design mock — contemporary miracle reports, not
   yet Daily Dove pieces. They render so the pages have something to show and
   are to be replaced. Nothing here is authoritative until reviewed against the
   Church's own discernment (CLAUDE.md §9). */

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

/* ============================================================
   The evidence scale — the paper's defining commitment.
   ============================================================ */

export type EvidenceLevel =
  | "contemporary-source"
  | "contemporary-witness"
  | "orthodox-tradition"
  | "medieval-tradition"
  | "legend";

export interface Evidence {
  id: EvidenceLevel;
  /** the dot colour readers learn to read at a glance */
  dot: string;
  /** short name for chips, facet rows and Historian's Notes entries */
  name: string;
  /** the standard spelled out, for the key and the article's closing note */
  full: string;
  ink: string;
  bg: string;
  line: string;
  /** the weakest two are drawn dashed — they rest on tradition or report alone */
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

/* One department's run in an article — e.g. the Rumor Mill box partway down a
   council report. `kind` keys into DEPARTMENT for the head and the colour;
   `title` overrides the standing department name when the story wants its own. */
export interface DepartmentRun {
  kind: string;
  title?: string;
  body?: string[];
  /** for Voices from the Forum / Marketplace Buzz — attributed snatches */
  voices?: { text: string; attribution?: string }[];
}

/* One strand of the story set against the evidence that carries it. Every
   article closes with a run of these — the paper's whole reason for existing in
   this form. `claim` is what the article said; `note` is what actually stands
   behind it. */
export interface HistoriansNote {
  level: EvidenceLevel;
  claim: string;
  note?: string;
  sources?: string[];
}

export interface NewsItem {
  /** slug — used for /daily-dove/<slug> */
  id: string;
  cat: string;
  /** the century the account belongs to (badge, filter, archive facet) */
  century: number;
  /** the strongest level the story as a whole rests on — see EVIDENCE */
  evidence: EvidenceLevel;
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
  /** the standing departments this article runs, in order */
  departments?: DepartmentRun[];
  /** the closing accounting — what is documented and what is tradition */
  historiansNotes?: { intro?: string; entries: HistoriansNote[] };
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

/* The evidence scale. Every claim the paper makes is pinned to one of these,
   and the Historian's Notes at the foot of each article says which. The order
   is strongest first — a contemporary document, then a contemporary witness,
   then the two traditions, then what is frankly legend. The last two are drawn
   dashed: they are worth telling and worth loving, but they are not evidence,
   and the page should say so without a reader having to read the caption. */
export const EVIDENCE: Record<EvidenceLevel, Evidence> = {
  "contemporary-source": {
    id: "contemporary-source",
    dot: "#3d6157",
    name: "Verified",
    full: "Verified by contemporary sources",
    ink: "#2f4f45",
    bg: "rgba(61,97,87,.14)",
    line: "rgba(61,97,87,.45)",
  },
  "contemporary-witness": {
    id: "contemporary-witness",
    dot: "#234C7A",
    name: "Contemporary witness",
    full: "Reported by a witness of the time",
    ink: "#234C7A",
    bg: "rgba(35,76,122,.12)",
    line: "rgba(35,76,122,.42)",
  },
  "orthodox-tradition": {
    id: "orthodox-tradition",
    dot: "#a9852a",
    name: "Orthodox tradition",
    full: "Later Orthodox tradition",
    ink: "#7a5a14",
    bg: "rgba(212,175,55,.18)",
    line: "rgba(168,133,42,.55)",
  },
  "medieval-tradition": {
    id: "medieval-tradition",
    dot: "#b06a30",
    name: "Medieval tradition",
    full: "Medieval tradition",
    ink: "#8a4e20",
    bg: "rgba(176,106,48,.14)",
    line: "rgba(176,106,48,.5)",
    dashed: true,
  },
  legend: {
    id: "legend",
    dot: "#8d3a2f",
    name: "Popular legend",
    full: "Popular legend or unverified account",
    ink: "#8d3a2f",
    bg: "transparent",
    line: "rgba(141,58,47,.5)",
    dashed: true,
  },
};

export const EVIDENCE_LIST: EvidenceLevel[] = [
  "contemporary-source",
  "contemporary-witness",
  "orthodox-tradition",
  "medieval-tradition",
  "legend",
];

/* ============================================================
   The departments — the paper's standing sections. Every article may carry any
   of these, in whatever order suits the story; Historian's Notes is not among
   them because it is not optional and always runs last (see historiansNotes on
   the article schema).
   ============================================================ */

export interface Department {
  id: string;
  name: string;
  /** the standing strapline under the department head */
  blurb: string;
  /** what this department is for, in the paper's own voice */
  rule: string;
  ink: string;
}

export const DEPARTMENTS: Department[] = [
  {
    id: "breaking",
    name: "Breaking News",
    blurb: "The event itself, as it reached us",
    rule: "What happened, who was there, and how word travelled.",
    ink: "#8d3a2f",
  },
  {
    id: "imperial",
    name: "Imperial Dispatch",
    blurb: "From the palace and the praetorium",
    rule: "Edicts, appointments, and what the powers of the age had to say.",
    ink: "#234C7A",
  },
  {
    id: "forum",
    name: "Voices from the Forum",
    blurb: "What the faithful are saying",
    rule: "Overheard among the people — the argument as ordinary folk had it.",
    ink: "#3d6157",
  },
  {
    id: "marketplace",
    name: "Marketplace Buzz",
    blurb: "Talk among the stalls",
    rule: "Trade, travel, and the small human detail the chroniclers left out.",
    ink: "#a9852a",
  },
  {
    id: "rumor",
    name: "Rumor Mill",
    blurb: "Unconfirmed, and clearly marked so",
    rule: "What was being said but never established. Flagged, never asserted.",
    ink: "#b06a30",
  },
  {
    id: "fact-check",
    name: "Fact Check",
    blurb: "Setting one claim straight",
    rule: "A single popular claim weighed against what the sources actually say.",
    ink: "#6b5326",
  },
];

export const DEPARTMENT: Record<string, Department> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.id, d]),
);

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
export async function loadPaper(): Promise<{
  featured: NewsItem;
  items: NewsItem[]; // non-featured, in `order` order
  all: NewsItem[]; // featured first, then items
  byId: Record<string, NewsItem>;
}> {
  const entries = (await getCollection("dailyDove")).map(
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
