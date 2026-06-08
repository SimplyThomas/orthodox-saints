/* "Saints in the News" — a reverent archive of miracle accounts, glorifications,
   relic discoveries, apparitions and healings.

   NOTE: this is *sample editorial content* ported from the Claude Design mock,
   not a live feed and not part of the saints dataset (data/saints.csv). The tone
   is documentary, never sensational. When a real source/feed is wired up, this
   module is the single place the index and article pages read from — replace the
   arrays below (or back them with a CMS / RSS aggregation) and the pages follow.
   Each account is illustrative until verified against the Church's own
   discernment, in keeping with the project's sourcing guardrails. */

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

/* The lead story — fully written, with body, pull-quote, and a source box. */
export const NEWS_FEATURED: NewsItem = {
  id: "nektarios-child",
  cat: "healings",
  kicker: "Documented Healing",
  headline: "Paralyzed Child Walks Following Prayers to Saint Nektarios",
  saint: { name: "Nektarios", type: "Hierarch", epithet: "of Aegina" },
  date: "June 5, 2026",
  location: "Aegina, Greece",
  dek: "After a year of paralysis in his lower limbs, a seven-year-old boy from Piraeus rose and walked during an all-night vigil at the monastery of the saint — a recovery his attending physicians describe as without medical explanation.",
  summary:
    "The family kept vigil through the night of the saint’s feast, anointing the child with oil from the lamp at the reliquary. By the Divine Liturgy the following morning, witnesses say, the boy stood unaided for the first time in eleven months. The Metropolis of Hydra has opened a quiet inquiry, gathering the testimony of the attending physicians and the parish priest.",
  plate: "PHOTOGRAPH · MONASTERY OF ST NEKTARIOS, AEGINA",
  caption:
    "The katholikon of the Holy Trinity Monastery on Aegina, where the saint’s relics rest. — Photograph to be supplied",
  body: [
    "For eleven months, the boy had not stood. A sudden inflammation of the spine the previous summer had left the seven-year-old from Piraeus without the use of his legs, and a season of treatment had brought his parents no certain hope. On the eve of the saint’s feast, they carried him to Aegina.",
    "They came, his mother said afterward, “not to demand a miracle, but to keep the feast” — to stand the all-night vigil with the other pilgrims, to venerate the relics, and to anoint the child with oil from the lamp that burns before the reliquary of Saint Nektarios. Through the long psalmody of the night they remained, the boy asleep in his father’s arms.",
    "By the Divine Liturgy the following morning, witnesses say, the boy rose and stood unaided at the chanter’s stand. The priest who served, Fr. Athanasios, has declined to characterize the event, saying only that the family’s account agrees in every detail with what he himself observed at the dismissal.",
    "The attending physicians in Piraeus, consulted afterward, confirmed the original diagnosis and the absence of any treatment that would account for so sudden a recovery. “I can tell you what we saw on the imaging,” one said, “and I can tell you that the child is walking. I am not able to join the two.” The Metropolis of Hydra has opened a quiet inquiry and is gathering the medical records, the testimony of the physicians, and the witness of the parish — the careful, unhurried discernment the Church has always brought to such reports.",
    "Saint Nektarios, a bishop unjustly slandered in his lifetime and vindicated by God after his repose, has long been among the most beloved healers of the modern Church. His shrine on Aegina receives pilgrims through every season of the year. The faithful who keep his feast are slow to use the word “miracle,” preferring the older language: that the saint interceded, and that the Lord, “wondrous in His saints,” was merciful.",
  ],
  pullQuote: {
    text: "“We did not see him take the first step. We only saw that he was standing, and that he was not afraid.”",
    attribution: "— The child’s mother, to the parish priest",
  },
  sources: [
    {
      h: "Primary Source",
      items: [
        "Inquiry of the Holy Metropolis of Hydra, Spetses & Aegina (2026, ongoing)",
        "Attending physicians, Tzaneio General Hospital, Piraeus",
      ],
    },
    {
      h: "Church Source",
      items: [
        "Parish testimony of Fr. Athanasios, Holy Trinity Monastery, Aegina",
        "Synodal commission on the discernment of wonders",
      ],
    },
    {
      h: "Book References",
      items: [
        "Sophrony, “Saint Nektarios: The Saint of Our Century” (Athens, 1979)",
        "Service & Akathist to St Nektarios the Wonderworker",
      ],
    },
    {
      h: "Witness Accounts",
      items: [
        "The child’s mother and father (recorded with consent)",
        "Three pilgrims present at the vigil, names withheld",
      ],
    },
  ],
  relatedSaints: [
    {
      name: "Nektarios",
      type: "Hierarch",
      epithet: "of Aegina",
      note: "The wonderworker at whose shrine the vigil was kept.",
    },
    {
      name: "Cosmas & Damian",
      type: "Unmercenary",
      epithet: "the Unmercenaries",
      note: "Physicians who healed “taking no payment.”",
    },
    {
      name: "Panteleimon",
      type: "Great-Martyr",
      epithet: "the Healer",
      note: "Invoked across the Church for bodily healing.",
    },
  ],
};

/* The main feed — documentary dispatches across the seven desks. */
export const NEWS: NewsItem[] = [
  {
    id: "john-sf-recovery",
    cat: "healings",
    saint: { name: "John", type: "Hierarch" },
    headline:
      "Doctors Document Unexplained Recovery at the Shrine of Saint John of San Francisco",
    date: "June 3, 2026",
    location: "San Francisco, California",
    summary:
      "A woman given weeks to live returned to her physicians in full remission after a night beside the incorrupt relics in the Holy Virgin Cathedral.",
  },
  {
    id: "paisios-myrrh",
    cat: "icons",
    saint: { name: "Paisios", type: "Monastic" },
    headline:
      "Icon of Saint Paisios Continues to Stream Myrrh in Thessaloniki Parish",
    date: "June 2, 2026",
    location: "Thessaloniki, Greece",
    summary:
      "Faithful have kept watch for three weeks as fragrant myrrh gathers on the glass of a printed icon; the metropolis has appointed a commission to observe.",
  },
  {
    id: "porphyrios-fragrance",
    cat: "modern",
    saint: { name: "Porphyrios", type: "Monastic" },
    headline:
      "Pilgrims Report a Sweet Fragrance at the Grave of Saint Porphyrios",
    date: "May 30, 2026",
    location: "Milesi, Attica",
    summary:
      "On the anniversary of his repose, visitors to the Holy Convent describe an unaccountable fragrance lingering over the elder’s resting place.",
  },
  {
    id: "herman-pilgrimage",
    cat: "america",
    saint: { name: "Herman", type: "Monastic" },
    headline:
      "Spruce Island Pilgrimage Draws Record Faithful to Saint Herman of Alaska",
    date: "May 28, 2026",
    location: "Spruce Island, Alaska",
    summary:
      "More than four hundred pilgrims crossed by boat to the hermitage of North America’s first canonized saint, the largest gathering in the pilgrimage’s history.",
  },
  {
    id: "spyridon-procession",
    cat: "relics",
    saint: { name: "Spyridon", type: "Hierarch" },
    headline:
      "Incorrupt Relics of Saint Spyridon Carried in Procession Through Corfu",
    date: "May 26, 2026",
    location: "Corfu, Greece",
    summary:
      "The shepherd-bishop’s relics, whose slippers are renewed each year, were borne through the old town before tens of thousands in the spring litany.",
  },
  {
    id: "xenia-petersburg",
    cat: "modern",
    saint: { name: "Xenia", type: "Fool-for-Christ" },
    headline:
      "Petersburg Faithful Credit Saint Xenia in a Season of Reconciled Marriages",
    date: "May 24, 2026",
    location: "St Petersburg, Russia",
    summary:
      "At the chapel over her grave at Smolensky Cemetery, a steady stream of petitioners leaves accounts of restored homes and answered prayers.",
  },
  {
    id: "raphael-brooklyn",
    cat: "america",
    saint: { name: "Raphael", type: "Hierarch" },
    headline:
      "Saint Raphael of Brooklyn Honored as Antiochian Faithful Mark His Repose",
    date: "May 22, 2026",
    location: "Brooklyn, New York",
    summary:
      "Clergy and faithful of the Antiochian Archdiocese gathered to commemorate the “Good Shepherd of the Lost Sheep in America,” the first bishop consecrated on American soil.",
  },
  {
    id: "paraskevi-sight",
    cat: "healings",
    saint: { name: "Paraskevi", type: "Martyr" },
    headline: "Pilgrim Reports Restored Sight at the Shrine of Saint Paraskevi",
    date: "May 20, 2026",
    location: "Tempe, Thessaly",
    summary:
      "A man blind in one eye for a decade describes the gradual return of his vision after washing at the holy spring, attested by his parish priest.",
  },
  {
    id: "spyridon-nicaea",
    cat: "historical",
    saint: { name: "Spyridon", type: "Hierarch" },
    headline:
      "From the Archive: Saint Spyridon Confounds the Philosophers at Nicaea",
    date: "A.D. 325 · Filed from Nicaea",
    location: "Nicaea, Bithynia",
    summary:
      "An account of how an unlettered shepherd-bishop silenced a learned orator with a single brick — pressed in his hand, it became fire, water, and clay.",
  },
  {
    id: "cappadocia-reliquary",
    cat: "relics",
    saint: { name: "Unknown", type: "Martyr" },
    headline: "Ancient Reliquary Unearthed Beneath a Cappadocian Chapel",
    date: "May 17, 2026",
    location: "Göreme, Cappadocia",
    summary:
      "Restorers stabilizing a rock-cut church uncovered a sealed silver reliquary; an inscription names martyrs venerated locally since the fourth century.",
  },
  {
    id: "nicholas-storm",
    cat: "apparitions",
    saint: { name: "Nicholas", type: "Hierarch" },
    headline:
      "Aegean Mariners Describe a Luminous Figure of Saint Nicholas in the Storm",
    date: "May 15, 2026",
    location: "The Aegean Sea",
    summary:
      "The crew of a fishing vessel caught in a sudden gale recount a calm light at the bow and a safe passage they ascribe to the protector of sailors.",
  },
  {
    id: "theotokos-weeping",
    cat: "icons",
    saint: { name: "Theotokos", type: "Righteous" },
    headline: "Diocesan Commission Verifies a Weeping Icon of the Theotokos",
    date: "May 13, 2026",
    location: "Sydney, Australia",
    summary:
      "After months of careful observation, a commission has reported that it can find no natural cause for the tears gathering on a parish icon of the Mother of God.",
  },
  {
    id: "george-walls",
    cat: "apparitions",
    saint: { name: "George", type: "Great-Martyr" },
    headline:
      "From the Archive: Defenders Recount a Horseman Before the City Walls",
    date: "c. A.D. 1200 · Filed from the East",
    location: "The Eastern Marches",
    summary:
      "Chroniclers preserve the testimony of a besieged garrison who saw a radiant soldier on a white horse — the Great-Martyr George, riding at the head of their defense.",
  },
  {
    id: "paisios-athos",
    cat: "modern",
    saint: { name: "Paisios", type: "Monastic" },
    headline:
      "Counsels of Saint Paisios Draw a New Generation of Pilgrims to Mount Athos",
    date: "May 10, 2026",
    location: "Mount Athos, Greece",
    summary:
      "A decade after his glorification, the elder’s recorded counsels are guiding record numbers of young pilgrims to his cell at Panagouda.",
  },
  {
    id: "seraphim-sarov",
    cat: "modern",
    saint: { name: "Seraphim", type: "Monastic" },
    headline:
      "Diveyevo Marks the Uncovering of the Relics of Saint Seraphim of Sarov",
    date: "May 8, 2026",
    location: "Diveyevo, Russia",
    summary:
      "Pilgrims processed along the holy canal as the convent commemorated the wonderworker who greeted every soul with “My joy, Christ is risen!”",
  },
];

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

/* All articles by slug (featured + feed), for the /news/[slug] route. */
export const NEWS_ALL: NewsItem[] = [NEWS_FEATURED, ...NEWS];
export const NEWS_BY_ID: Record<string, NewsItem> = Object.fromEntries(
  NEWS_ALL.map((n) => [n.id, n]),
);
