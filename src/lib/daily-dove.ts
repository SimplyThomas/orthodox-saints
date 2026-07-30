/* THE DAILY DOVE — The Living Archive.

   Not one newspaper but an archive of them: a run of papers kept from Pentecost
   to the present, each sheet reporting its own age as though a paper had been
   there to cover it. Immersive and full of personality, but never satire and
   never fiction — the reporting voice is a device, the history underneath it is
   held to account.

   That accounting is this module's centre of gravity. Every claim in every
   dispatch carries an EVIDENCE level, and every dispatch closes at the
   Historian's Desk, where each strand of the story is set against the level
   that actually supports it. A reader must never have to guess which part of
   what they just enjoyed is documented and which belongs to the living
   tradition of the Church.

   Dispatches — never "articles"; the paper files dispatches — live as one
   validated YAML file each in src/content/daily-dove/*.yaml (the `dailyDove`
   collection), read back via loadPaper(). Only the page furniture (DEPARTMENTS,
   EVIDENCE, ERAS, WONDERS, NEWS_THISDAY) and the small derived helpers
   (ord/regionOf/postRank/centuriesIn/deskOf/eraOf) live here.

   Every dispatch in the collection is a real one. Nothing here is authoritative
   until reviewed against the Church's own discernment (CLAUDE.md §9). */

import { getCollection } from "astro:content";

/* The paper's identity. "The Living Archive" is the standing subtitle: the
   section is not one newspaper frozen at a date but a run of them, kept from
   Pentecost forward, and the nameplate should say so before a word of copy
   does. The old motto ("Reporting from the Church Since Pentecost") explained
   the conceit; this one simply asserts it. */
export const DOVE_SUBTITLE = "The Living Archive";
export const DOVE_STANDFIRST =
  "Two thousand years of the Church’s story, preserved as though a newspaper had been there to report every major moment — eyewitness accounts, chronicles, and traditions from every age.";

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
  /** a closing "Historical Note:" — what the section just said, weighed */
  note?: string;
}

/* A short update from another city, for the "Around the Empire" sidebar. The
   point is to make the world feel inhabited while the main story runs — the
   Church is never only where the council is sitting. */
export interface EmpireNote {
  city: string;
  note: string;
}

/* The "Around the Empire" column. Its heading changes with the story — Around
   the Kingdom in Iberia, Around the Holy Land in Jerusalem — and some despatches
   carry a single paragraph of context rather than a set of city notes. */
export interface AroundTheEmpire {
  heading?: string;
  intro?: string;
  notes?: EmpireNote[];
}

/* A major event is covered the way a paper would cover it: several dispatches
   across several days, not one enormous article. `id` groups them, `part`
   orders them. */
export interface SeriesRef {
  id: string;
  name: string;
  part: number;
}

/* The editorial column — the paper speaking in its own voice about what it has
   just reported. Distinct from "Why This Story Matters", which explains why the
   Church remembers the event; this is the leader-writer's turn. */
export interface EditorsNotebook {
  heading?: string;
  body: string[];
}

/* A feature built as an interview. Some sources are themselves a first-person
   testimony — Motovilov's record of his conversation with St Seraphim is the
   clearest case — and forcing that into breaking-news prose would lose the very
   thing that makes it worth reading. The questions are the paper's device; the
   answers are the source. */
export interface InterviewTurn {
  q: string;
  a: string[];
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
  /** the department that files it — keys into DEPARTMENT */
  desk: string;
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
  /** the OS-#### saints this dispatch is about — the join to their pages */
  subjects?: string[];
  /** the FF-#### feasts it belongs to — the join to the feast and the calendar */
  feasts?: string[];
  /** lead-story extras */
  kicker?: string;
  dek?: string;
  plate?: string;
  /** full article body paragraphs ([0] takes the drop-cap) */
  body?: string[];
  pullQuote?: { text: string; attribution: string };
  /** the edition line beneath the nameplate, e.g. "Nicaea Edition" */
  edition?: string;
  /** who filed it — "By the Staff of The Daily Dove" */
  byline?: string;
  /** the paper's trailer: what runs in the next edition */
  comingUp?: { kicker?: string; title: string }[];
  /** short updates from elsewhere — the "Around the Empire" column */
  aroundTheEmpire?: AroundTheEmpire;
  /** what the account reports the saint helping with — see WONDERS */
  miracles?: string[];
  /** a Q&A feature, where the source is itself a first-person testimony */
  interview?: InterviewTurn[];
  /** the standing "Why This Story Matters" note */
  whyThisMatters?: string;
  /** the paper's own editorial on the story */
  editorsNotebook?: EditorsNotebook;
  /** the standing disclosure that the reporting voice is a literary device */
  literaryFraming?: string;
  /** the series this dispatch belongs to, if it covers an ongoing event */
  series?: SeriesRef;
  /** the standing departments this article runs */
  departments?: DepartmentRun[];
  /** the closing accounting — what is documented and what is tradition */
  historiansNotes?: { intro?: string; entries: HistoriansNote[] };
  sources?: NewsSourceGroup[];
  relatedSaints?: NewsSaintRef[];
}

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
    name: "Eyewitness account",
    full: "Contemporary eyewitness account",
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
   The wonders — what to look for when you are the one in need.

   A reader does not always arrive wanting the fourth century. Often they arrive
   carrying something: a sickness, a frightened child, work that will not come,
   a night they cannot see the end of. This is the axis that lets them refine
   the paper by that rather than by date — to find the accounts of saints the
   Church has asked for help in exactly their trouble.

   The terms name the NEED, not a guarantee. The Church asks the saints to pray;
   it does not trade in outcomes, and the paper's wording should never suggest
   otherwise. An article is tagged only where the account itself reports that
   kind of help — never to fill the list out.
   ============================================================ */

export interface Wonder {
  id: string;
  /** the facet label — short enough for a chip */
  name: string;
  /** what a reader carrying this would be looking for */
  blurb: string;
}

export const WONDERS: Wonder[] = [
  {
    id: "healing",
    name: "Healing of body",
    blurb: "Sickness, injury, and recoveries no one could account for.",
  },
  {
    id: "suffering",
    name: "Endurance in suffering",
    blurb: "Long illness and pain borne without bitterness.",
  },
  {
    id: "protection",
    name: "Protection from harm",
    blurb: "Danger on the road, at sea, and under threat.",
  },
  {
    id: "assault",
    name: "Deliverance from assault",
    blurb: "Those preserved from violence and from those who meant them harm.",
  },
  {
    id: "purity",
    name: "Purity and chastity",
    blurb: "Vows kept, and advances refused at cost.",
  },
  {
    id: "provision",
    name: "Provision in need",
    blurb: "Water, food, shelter, and work when there was none.",
  },
  {
    id: "courage",
    name: "Courage to confess",
    blurb: "Standing firm when it costs position, safety, or life.",
  },
  {
    id: "family",
    name: "Family and children",
    blurb: "Households holding to the faith together.",
  },
  {
    id: "enemies",
    name: "Mercy toward enemies",
    blurb: "Kindness shown to those who came to do harm.",
  },
  {
    id: "prayer",
    name: "The life of prayer",
    blurb: "Stillness, the Jesus Prayer, and the vision of God.",
  },
  {
    id: "relics",
    name: "Wonders at the relics",
    blurb: "Help sought and reported at a saint\u2019s tomb.",
  },
];

export const WONDER: Record<string, Wonder> = Object.fromEntries(
  WONDERS.map((w) => [w.id, w]),
);

/* ============================================================
   The eras — the paper's colour system.

   The desks (Healings, Relics, …) were drawn for a paper covering many
   subjects. This one is organised by history, so the dispatch plates take
   their colour from WHEN a story happened rather than what kind of story it
   is: a reader learns six colours once and can then date a dispatch across
   the room. Bands are the conventional divisions of Church history, and every
   century from the 1st to the 21st falls in exactly one.
   ============================================================ */

export interface Era {
  id: string;
  /** first and last century in the band, inclusive */
  from: number;
  to: number;
  /** short label for the plate pill */
  name: string;
  /** the fuller name, for the archive facet and tooltips */
  full: string;
  ink: string;
  bg: string;
  /* ---- the era's own edition ----
     The archive is a run of papers, not one paper, so each age is allowed to
     look like a sheet preserved from that age. These stay deliberately small:
     a motif in the headpiece, a warmth in the stock, a house line under the
     nameplate. Anything louder would read as costume. */
  /** which ornament the headpiece draws for this era — see Headpiece.astro */
  motif:
    "chi-rho" | "council-cross" | "vine" | "knot" | "crescent-star" | "rose";
  /** the run's own name, for the edition line and the era index */
  edition: string;
  /** one line on what a paper of this age would have been reporting */
  strap: string;
  /** the stock this era's sheets are printed on — a subtle warm/cool shift */
  stock: string;
}

export const ERAS: Era[] = [
  {
    id: "martyrs",
    from: 1,
    to: 3,
    name: "Age of Martyrs",
    full: "The Age of the Martyrs · 1st–3rd century",
    ink: "#8d3a2f",
    bg: "rgba(141,58,47,.12)",
    motif: "chi-rho",
    edition: "The Catacomb Editions",
    strap: "Filed in secret, under a power that meant to end the Church.",
    stock: "#2a1517",
  },
  {
    id: "councils",
    from: 4,
    to: 5,
    name: "Age of Councils",
    full: "The Age of the Councils · 4th–5th century",
    ink: "#234C7A",
    bg: "rgba(35,76,122,.12)",
    motif: "council-cross",
    edition: "The Conciliar Editions",
    strap:
      "The age when the Church said aloud, and in writing, what she had always believed.",
    stock: "#101f33",
  },
  {
    id: "byzantium",
    from: 6,
    to: 10,
    name: "Byzantine Centuries",
    full: "The Byzantine Centuries · 6th–10th century",
    ink: "#3d6157",
    bg: "rgba(61,97,87,.14)",
    motif: "vine",
    edition: "The Imperial Editions",
    strap:
      "A Christian empire, its capital, its monasteries, and the icons it fought over.",
    stock: "#0f2420",
  },
  {
    id: "east",
    from: 11,
    to: 15,
    name: "The Christian East",
    full: "Hesychasts, Rus’ and the Christian East · 11th–15th century",
    ink: "#4d3258",
    bg: "rgba(77,50,88,.14)",
    motif: "knot",
    edition: "The Northern & Athonite Editions",
    strap:
      "The faith carried north to Rus’, and the stillness kept on the Holy Mountain.",
    stock: "#1a1224",
  },
  {
    id: "ottoman",
    from: 16,
    to: 18,
    name: "Ottoman Centuries",
    full: "Under the Ottomans, and the missions · 16th–18th century",
    ink: "#6b5326",
    bg: "rgba(107,83,38,.14)",
    motif: "crescent-star",
    edition: "The Captivity Editions",
    strap:
      "A Church under another sovereign, keeping the faith at cost and sending out missions.",
    stock: "#241d10",
  },
  {
    id: "modern",
    from: 19,
    to: 21,
    name: "The Modern Age",
    full: "New martyrs and the modern age · 19th–21st century",
    ink: "#1f5e54",
    bg: "rgba(31,94,84,.13)",
    motif: "rose",
    edition: "The Modern Editions",
    strap:
      "New martyrs, new continents, and elders whose witnesses are still alive.",
    stock: "#0d211d",
  },
];

export const ERA: Record<string, Era> = Object.fromEntries(
  ERAS.map((e) => [e.id, e]),
);

/** The era a century falls in. Falls back to the last band, never undefined. */
export function eraOf(century: number): Era {
  return (
    ERAS.find((e) => century >= e.from && century <= e.to) ??
    ERAS[ERAS.length - 1]
  );
}

/* ============================================================
   The departments — the newsroom desks.

   A newspaper is not a stream of posts under generic categories; it is a set of
   standing desks, each with a beat, a house voice, and an editor who would
   fight you for the column inches. These replace the old subject categories
   ("Healings", "Modern Saints") that read as blog tags and gave the front page
   its dashboard feeling.

   Two kinds sit in one list on purpose, because a real paper's desks do both:

   - `files` — the desk a dispatch is filed under. Exactly one per dispatch.
   - `column` — the desk also runs a box INSIDE other desks' dispatches
     (a DepartmentRun, keyed by the same id).

   Imperial and Marketplace do both: the palace desk files the council reports
   and also contributes the edict box partway down someone else's story.
   Historian's Desk is a column only, and never optional — every dispatch closes
   with it (see historiansNotes on the article schema), which is why it carries
   no run of its own in DEPARTMENT_ORDER.
   ============================================================ */

export interface Department {
  id: string;
  name: string;
  /** short label for chips and facet rows, where the full name is too wide */
  short: string;
  /** the standing strapline under the department head */
  blurb: string;
  /** what this department is for, in the paper's own voice */
  rule: string;
  ink: string;
  /** tinted ground for the desk's pill */
  bg: string;
  /** dispatches are filed under this desk */
  files?: boolean;
  /** this desk also runs a box inside other dispatches */
  column?: boolean;
}

export const DEPARTMENTS: Department[] = [
  {
    id: "imperial",
    name: "Imperial Dispatch",
    short: "Imperial",
    blurb: "From the palace and the praetorium",
    rule: "Edicts, emperors, and councils — the acts of the powers of this world where they touch the Church.",
    ink: "#234C7A",
    bg: "rgba(35,76,122,.12)",
    files: true,
    column: true,
  },
  {
    id: "church-life",
    name: "Church Life",
    short: "Church Life",
    blurb: "Foundations, missions and the ordinary week",
    rule: "Monasteries founded, churches dedicated, missionary journeys, ordinations, and the translation of relics.",
    ink: "#3d6157",
    bg: "rgba(61,97,87,.14)",
    files: true,
  },
  {
    id: "miracle-watch",
    name: "Miracle Watch",
    short: "Miracles",
    blurb: "What cannot be accounted for",
    rule: "Healings, wonderworking icons, incorrupt relics, and interventions no one present could explain.",
    ink: "#a9852a",
    bg: "rgba(212,175,55,.16)",
    files: true,
  },
  {
    id: "persecution",
    name: "Persecution Report",
    short: "Persecution",
    blurb: "Trials, prisons and the witness of blood",
    rule: "Tribunals, martyrdoms, confessors under interrogation, exiles, and what was said before the magistrate.",
    ink: "#8d3a2f",
    bg: "rgba(141,58,47,.12)",
    files: true,
  },
  {
    id: "pilgrim",
    name: "Pilgrim’s Journal",
    short: "Pilgrimage",
    blurb: "Filed from the road",
    rule: "Shrines, holy places, the roads that reach them, and what a traveller finds on arriving.",
    ink: "#4d3258",
    bg: "rgba(77,50,88,.14)",
    files: true,
  },
  {
    id: "marketplace",
    name: "Marketplace Buzz",
    short: "Marketplace",
    blurb: "Talk among the stalls",
    rule: "Trade, ships, food, taxes, and the small human detail the chroniclers left out.",
    ink: "#6b5326",
    bg: "rgba(107,83,38,.14)",
    files: true,
    column: true,
  },
  {
    id: "forum",
    name: "Voices from the Forum",
    short: "Forum",
    blurb: "How ordinary Christians received the news",
    rule: "Illustrative voices — composites of how the faithful may have reacted, never words put in a real person’s mouth.",
    ink: "#1f5e54",
    bg: "rgba(31,94,84,.13)",
    column: true,
  },
  {
    id: "whispers",
    name: "Whispers Around the Council",
    short: "Whispers",
    blurb: "The stories that circulated",
    rule: "Famous accounts and later Orthodox traditions, always named as such rather than reported as fact.",
    ink: "#b06a30",
    bg: "rgba(176,106,48,.14)",
    column: true,
  },
  {
    id: "fact-check",
    name: "Fact Check",
    short: "Fact Check",
    blurb: "Setting one claim straight",
    rule: "A single popular claim weighed against what the sources actually say.",
    ink: "#7a5a14",
    bg: "rgba(122,90,20,.14)",
    column: true,
  },
  {
    id: "historians-desk",
    name: "Historian’s Desk",
    short: "Historian’s Desk",
    blurb: "What is documented, and what is not",
    rule: "Runs at the foot of every dispatch: what contemporary sources say, what Orthodox tradition adds, what is medieval, and what is frankly legend.",
    ink: "#4A6F96",
    bg: "rgba(74,111,150,.14)",
    column: true,
  },
];

/** The desks a dispatch can be filed under, in the paper's running order. */
export const FILING_DESKS: Department[] = DEPARTMENTS.filter((d) => d.files);

/* The order the article template runs its departments in, whatever order the
   YAML happens to list them. Voices come before the Imperial Dispatch and the
   Whispers last, so a reader meets the people, then the palace, then the
   stories that grew up afterwards. */
export const DEPARTMENT_ORDER = [
  "forum",
  "imperial",
  "marketplace",
  "whispers",
  "fact-check",
];

export const DEPARTMENT: Record<string, Department> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.id, d]),
);

/** The desk a dispatch is filed under. Falls back to Church Life — the paper's
    general desk — rather than throwing on an unknown id. */
export function deskOf(n: NewsItem): Department {
  return DEPARTMENT[n.desk] ?? DEPARTMENT["church-life"];
}

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
  if (/iberia|mtskheta|georgia|tbilisi/.test(s))
    return "Georgia & the Caucasus";
  if (
    /greece|aegina|corfu|thessal|attica|evia|milesi|makri|tempe|lykovrysi|piraeus/.test(
      s,
    )
  )
    return "Greece";
  if (
    /constantinople|nicaea|nicomedia|chalcedon|ephesus|bithynia|smyrna|phrygia|colossae|chonae|blachernae|galatia|ancyra|gangra|cilicia|cappadocia/.test(
      s,
    )
  )
    return "Asia Minor & Byzantium";
  if (/jerusalem|judean|holy land|bethlehem/.test(s)) return "The Holy Land";
  if (/egypt|thebaid|desert|syria|cyrrhus|antioch|edessa|göreme|goreme/.test(s))
    return "Egypt & the East";
  if (/italy|bari|rome/.test(s)) return "Italy & the West";
  if (/england|essex|tolleshunt|knights/.test(s)) return "Britain & the West";
  if (/aegean|sea/.test(s)) return "At sea";
  return "Elsewhere";
}

/* Sort key for "in the order received". A real calendar date ("June 5, 2026")
   ranks above a historical dispatch, which uses the year in its dateline
   ("A.D. 325", "c. A.D. 1200").

   Plenty of datelines carry no numeral at all — "During the Reign of Emperor
   Hadrian", "Fourth Century" — and those used to fall to year zero and sink to
   the bottom of the feed in a heap. Fall back to the middle of the article's
   own century instead, which is the information we actually have. */
export function postRank(n: NewsItem): number {
  const t = Date.parse(n.date);
  if (!isNaN(t)) return t;
  const m = n.date.match(/(\d{3,4})/);
  if (m) return Date.UTC(+m[1], 0, 1);
  return Date.UTC((n.century - 1) * 100 + 50, 0, 1);
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

/* Group an article's Historian's Notes by level, strongest first, so the
   closing section reads as a set of findings rather than a flat list. Levels
   with nothing under them are dropped. */
export function notesByLevel(
  entries: HistoriansNote[],
): { level: EvidenceLevel; entries: HistoriansNote[] }[] {
  return EVIDENCE_LIST.map((level) => ({
    level,
    entries: entries.filter((e) => e.level === level),
  })).filter((g) => g.entries.length > 0);
}

/* Every series in the paper, each with its dispatches in `part` order. Used to
   show a reader where the article they are on sits in the run. */
export function seriesIn(items: NewsItem[]): Map<string, NewsItem[]> {
  const map = new Map<string, NewsItem[]>();
  for (const n of items) {
    if (!n.series) continue;
    const run = map.get(n.series.id) ?? [];
    run.push(n);
    map.set(n.series.id, run);
  }
  for (const run of map.values())
    run.sort((a, b) => (a.series!.part ?? 0) - (b.series!.part ?? 0));
  return map;
}

/* Which dispatches concern which saint, keyed by OS-#### id. A saint page uses
   this to offer the reader the paper's account of them; without it the two
   halves of the site would sit side by side and never point at each other.

   Keyed on the id and not the name on purpose. The article subjects include a
   Callinicus, a Barlaam and a Parthenios who each share a name with several
   other saints in the data, and a name match would cheerfully link the wrong
   man's page to the wrong man's martyrdom. */
export async function articlesBySaint(): Promise<Map<string, NewsItem[]>> {
  const { all } = await loadPaper();
  const map = new Map<string, NewsItem[]>();
  for (const n of all)
    for (const id of n.subjects ?? []) map.set(id, [...(map.get(id) ?? []), n]);
  // Newest dispatch first within each saint, so a run reads top-down.
  for (const run of map.values()) run.sort((a, b) => postRank(b) - postRank(a));
  return map;
}

/* Which dispatches belong to which feast, keyed by FF-#### id. The Church keeps
   the memory of these events in her calendar — the Fathers of the First Council
   on the Sunday after Ascension, the Triumph of Orthodoxy on the first Sunday
   of Lent — so the feast page is the other place a reader will come looking for
   the story, and the calendar the place they will stumble on it. */
export async function articlesByFeast(): Promise<Map<string, NewsItem[]>> {
  const { all } = await loadPaper();
  const map = new Map<string, NewsItem[]>();
  for (const n of all)
    for (const id of n.feasts ?? []) map.set(id, [...(map.get(id) ?? []), n]);
  for (const run of map.values()) run.sort((a, b) => postRank(a) - postRank(b));
  return map;
}
