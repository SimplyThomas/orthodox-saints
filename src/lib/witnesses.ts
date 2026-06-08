/* Witnesses of Our Time — a SEPARATE, non-canonical database of the departed who
   are held in living memory by the faithful but are NOT (or not yet) formally
   glorified by the Church. This is deliberately kept apart from the canonical
   saints dataset (data/saints.csv / public/data.json): these people must never
   surface in the finder, the patron quiz, or the home shuffle, and are never
   given a liturgical address, feast, or intercession (CLAUDE.md §9, canonization
   caution). They appear only on the Saints of America page and on their own
   memorial pages (/witness/<slug>).

   If and when any of these is formally glorified, they should be MOVED into the
   canonical dataset at that time and removed from here.

   Bios are short and factual, ported from the design-handoff roster; sources are
   still to be gathered. Until reviewed, each page carries that standing caveat. */

export interface Witness {
  /** permanent URL slug — /witness/<slug> */
  slug: string;
  name: string;
  epithet: string;
  /** how they served (shown as the card/role tag) */
  role: string;
  /** life span "1934 – 1982", or "" when only a repose year is known */
  years: string;
  reposedYear?: string;
  /** where they reposed / are remembered */
  place: string;
  /** memorial biography, one entry per paragraph */
  bio: string[];
  /** verifiable sources — to be filled before this is treated as authoritative */
  sources?: string[];
}

export const WITNESSES: Witness[] = [
  {
    slug: "ephraim-of-arizona",
    name: "Elder Ephraim",
    epithet: "of Arizona",
    role: "Athonite Elder",
    years: "1928 – 2019",
    place: "St Anthony's Monastery, Florence, Arizona",
    bio: [
      "A disciple of St Joseph the Hesychast who, coming from Mount Athos, founded some twenty Orthodox monasteries across the United States and Canada — reviving traditional monastic life on the continent.",
    ],
  },
  {
    slug: "seraphim-rose",
    name: "Hieromonk Seraphim",
    epithet: "Rose, of Platina",
    role: "Monk & Writer",
    years: "1934 – 1982",
    place: "St Herman Monastery, Platina, California",
    bio: [
      "An American convert and co-founder of the St Herman of Alaska Monastery in California whose writings opened the door of Orthodoxy to a whole generation of English-speaking seekers.",
    ],
  },
  {
    slug: "roman-braga",
    name: "Archimandrite Roman",
    epithet: "Braga",
    role: "Confessor & Elder",
    years: "1922 – 2015",
    place: "Holy Dormition Monastery, Rives Junction, Michigan",
    bio: [
      "A Romanian priest imprisoned and tortured under communism who, having found inner freedom in his cell, carried that joy to America and shaped monastic life in Michigan.",
    ],
  },
  {
    slug: "dmitri-royster",
    name: "Archbishop Dmitri",
    epithet: "Royster",
    role: "Missionary Hierarch",
    years: "1923 – 2011",
    place: "Dallas, Texas",
    bio: [
      "A Texan convert from a Baptist family who became founding bishop of the Diocese of the South, planting and nurturing scores of mission parishes across the American South.",
    ],
  },
  {
    slug: "mother-alexandra",
    name: "Mother Alexandra",
    epithet: "Princess Ileana",
    role: "Monastic Foundress",
    years: "1909 – 1991",
    place: "Monastery of the Transfiguration, Ellwood City, Pennsylvania",
    bio: [
      "Born Princess Ileana of Romania, she embraced monastic life in America and founded the Monastery of the Transfiguration in Pennsylvania — a haven of prayer for Orthodox women.",
    ],
  },
  {
    slug: "thomas-hopko",
    name: "Fr. Thomas Hopko",
    epithet: "of St Vladimir's",
    role: "Priest & Theologian",
    years: "1939 – 2015",
    place: "Ellwood City, Pennsylvania",
    bio: [
      "A beloved teacher, preacher and dean of St Vladimir's Seminary whose lectures, books and “55 maxims” formed generations of English-speaking Orthodox Christians.",
    ],
  },
  {
    slug: "michael-oleksa",
    name: "Fr. Michael Oleksa",
    epithet: "",
    role: "Priest & Educator",
    years: "1947 – 2023",
    place: "Alaska",
    bio: [
      "A missionary priest, teacher and storyteller who spent decades among the peoples of Alaska — a leading interpreter of Alaska Native cultures and of the deep Orthodox history rooted in that land.",
    ],
  },
  {
    slug: "michael-gelsinger",
    name: "Fr. Michael",
    epithet: "Gelsinger",
    role: "Priest",
    years: "",
    reposedYear: "2019",
    place: "the American South",
    bio: [
      "A pastor remembered with deep affection by many of the faithful across the American South, who held him in living memory long after his repose.",
    ],
  },
  {
    slug: "alexander-schmemann",
    name: "Fr. Alexander Schmemann",
    epithet: "",
    role: "Priest & Theologian",
    years: "1921 – 1983",
    place: "St Vladimir's Seminary, Crestwood, New York",
    bio: [
      "Dean of St Vladimir's Seminary and author of “For the Life of the World,” whose liturgical theology renewed the Eucharistic life of Orthodox Christians across America and far beyond.",
    ],
  },
  {
    slug: "georges-florovsky",
    name: "Fr. Georges Florovsky",
    epithet: "",
    role: "Priest & Theologian",
    years: "1893 – 1979",
    place: "Princeton, New Jersey",
    bio: [
      "A Russian émigré priest, church historian and theologian who called the Church to a “neo-patristic synthesis” — a return to the Fathers — while teaching at St Vladimir's, Harvard and Princeton.",
    ],
  },
  {
    slug: "john-meyendorff",
    name: "Fr. John Meyendorff",
    epithet: "",
    role: "Priest & Theologian",
    years: "1926 – 1992",
    place: "St Vladimir's Seminary, Crestwood, New York",
    bio: [
      "A patristic scholar of St Gregory Palamas and dean of St Vladimir's Seminary, whose learning and witness helped a self-governing Orthodox Church take root in America.",
    ],
  },
];

export const witnessBySlug: Map<string, Witness> = new Map(
  WITNESSES.map((w) => [w.slug, w]),
);
