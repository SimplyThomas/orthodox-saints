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

   Bios are short and factual; each carries verified sources (authoritative
   Orthodox bodies — monasteries, St Vladimir's Seminary, the OCA — plus
   OrthodoxWiki/Wikipedia). A record without a `sources` entry still shows a
   "sources being gathered" caveat and should not be treated as authoritative. */

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
  /** verifiable sources (label + URL), shown as links on the memorial page */
  sources?: { label: string; url: string }[];
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
      "A disciple of St Joseph the Hesychast who, coming from Mount Athos, founded seventeen Orthodox monasteries across the United States and Canada — reviving traditional monastic life on the continent.",
    ],
    sources: [
      {
        label: "Wikipedia: Ephraim of Arizona",
        url: "https://en.wikipedia.org/wiki/Ephraim_of_Arizona",
      },
      {
        label: "OrthodoxWiki: Ephraim of Philotheou",
        url: "https://orthodoxwiki.org/Ephraim_of_Philotheou",
      },
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
    sources: [
      {
        label: "OrthodoxWiki: Seraphim (Rose)",
        url: "https://orthodoxwiki.org/Seraphim_(Rose)",
      },
      {
        label: "Wikipedia: Seraphim Rose",
        url: "https://en.wikipedia.org/wiki/Seraphim_Rose",
      },
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
    sources: [
      {
        label: "OCA — In Memoriam: Archimandrite Roman Braga",
        url: "https://www.oca.org/in-memoriam/archimandrite-roman-braga",
      },
      {
        label: "OCA Diocese of the Midwest — 10th Anniversary of the Repose",
        url: "https://domoca.org/10th-anniversary-of-the-repose-of-archimandrite-roman-braga-commemorated-in-michigan/",
      },
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
    sources: [
      {
        label: "OCA — In Memoriam: His Eminence, Archbishop Dmitri",
        url: "https://www.oca.org/in-memoriam/his-eminence-archbishop-dmitri",
      },
      {
        label: "OrthodoxWiki: Dmitri (Royster) of Dallas",
        url: "https://orthodoxwiki.org/Dmitri_(Royster)_of_Dallas",
      },
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
    sources: [
      {
        label: "Orthodox Monastery of the Transfiguration — Foundress",
        url: "https://www.orthodoxmonasteryellwoodcity.org/about/foundress",
      },
      {
        label: "OCA — Remembering Mother Alexandra",
        url: "https://www.oca.org/news/headline-news/remembering-mother-alexandra",
      },
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
    sources: [
      {
        label: "St Vladimir's Seminary — Protopresbyter Thomas Hopko",
        url: "https://www.svots.edu/people/protopresbyter-thomas-hopko",
      },
      {
        label: "OrthodoxWiki: Thomas Hopko",
        url: "https://orthodoxwiki.org/Thomas_Hopko",
      },
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
    sources: [
      {
        label: "OCA — In Memoriam: Archpriest Michael Oleksa",
        url: "https://www.oca.org/in-memoriam/archpriest-michael-oleksa",
      },
      {
        label: "Wikipedia: Michael Oleksa",
        url: "https://en.wikipedia.org/wiki/Michael_Oleksa",
      },
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
    sources: [
      {
        label: "St Vladimir's Seminary — Protopresbyter Alexander Schmemann",
        url: "https://www.svots.edu/content/protopresbyter-alexander-schmemann",
      },
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
    sources: [
      {
        label: "OrthodoxWiki: Georges Florovsky",
        url: "https://orthodoxwiki.org/Georges_Florovsky",
      },
      {
        label: "Wikipedia: Georges Florovsky",
        url: "https://en.wikipedia.org/wiki/Georges_Florovsky",
      },
      {
        label: "St Vladimir's Seminary Library — Fr. Georges Florovsky Papers",
        url: "https://library.svots.edu/index.php/archival-collections/fr-georges-florovsky-papers",
      },
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
    sources: [
      {
        label:
          "St Vladimir's Seminary — Remembering Protopresbyter John Meyendorff",
        url: "https://www.svots.edu/headlines/remembering-protopresbyter-john-meyendorff-february-17-1926-july-22-1992",
      },
      {
        label: "OrthodoxWiki: John Meyendorff",
        url: "https://orthodoxwiki.org/John_Meyendorff",
      },
      {
        label: "Wikipedia: John Meyendorff",
        url: "https://en.wikipedia.org/wiki/John_Meyendorff",
      },
    ],
  },
];

export const witnessBySlug: Map<string, Witness> = new Map(
  WITNESSES.map((w) => [w.slug, w]),
);
