/* "Saints in the News" — a reverent archive of miracle accounts, glorifications,
   relic discoveries, apparitions and healings.

   NOTE: this is *sample editorial content* ported from the Claude Design mock,
   not a live feed and not part of the saints dataset (data/saints.csv). The tone
   is documentary, never sensational. When a real source/feed is wired up, this
   module is the single place the index and article pages read from — replace the
   arrays below (or back them with a CMS / RSS aggregation) and the pages follow.
   Each account is illustrative until verified against the Church's own
   discernment, in keeping with the project's sourcing guardrails. */

import { getCollection } from "astro:content";

export interface NewsCat {
  id: string;
  name: string;
  blurb: string;
  ink: string;
  bg: string;
  count: number;
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
  saint: NewsSaintRef;
  headline: string;
  date: string;
  location: string;
  summary: string;
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
    blurb: "Medical recoveries and physical healings.",
    ink: "#3d6157",
    bg: "rgba(61,97,87,.12)",
    count: 64,
  },
  {
    id: "apparitions",
    name: "Apparitions",
    blurb: "Appearances of the saints and the holy angels.",
    ink: "#4A6F96",
    bg: "rgba(74,111,150,.14)",
    count: 38,
  },
  {
    id: "icons",
    name: "Wonderworking Icons",
    blurb: "Myrrh-streaming, weeping, and miracle-working icons.",
    ink: "#a9852a",
    bg: "rgba(212,175,55,.16)",
    count: 51,
  },
  {
    id: "relics",
    name: "Relics",
    blurb: "Discoveries, incorrupt relics, healings, and pilgrimages.",
    ink: "#8d3a2f",
    bg: "rgba(141,58,47,.10)",
    count: 47,
  },
  {
    id: "modern",
    name: "Modern Saints",
    blurb: "Miracles involving contemporary saints.",
    ink: "#234C7A",
    bg: "rgba(35,76,122,.10)",
    count: 73,
  },
  {
    id: "america",
    name: "Orthodox America",
    blurb: "Miracles and events of Orthodoxy in North America.",
    ink: "#1f5e54",
    bg: "rgba(31,94,84,.12)",
    count: 29,
  },
  {
    id: "historical",
    name: "Historical Reports",
    blurb: "Ancient accounts presented as archived dispatches.",
    ink: "#6b5326",
    bg: "rgba(107,83,38,.12)",
    count: 112,
  },
];

export const NEWS_CAT: Record<string, NewsCat> = Object.fromEntries(
  NEWS_CATS.map((c) => [c.id, c]),
);

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

export const NEWS_CENTURIES: { label: string; note: string }[] = [
  { label: "1st – 5th Century", note: "The age of the martyrs & councils" },
  {
    label: "6th – 10th Century",
    note: "Desert fathers & the great hymnographers",
  },
  { label: "11th – 15th Century", note: "Hesychasts, missionaries & Rus’" },
  {
    label: "16th – 20th Century",
    note: "New martyrs & the spread of the faith",
  },
  { label: "The Modern Era", note: "Contemporary saints & living witnesses" },
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
  const featured = entries.find((e) => e.featured)!;
  const items = entries.filter((e) => !e.featured);
  const all = [featured, ...items];
  return {
    featured,
    items,
    all,
    byId: Object.fromEntries(all.map((n) => [n.id, n])),
  };
}
