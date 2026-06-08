/* Structured, sourced data for the comprehensive profile of Elder Ephraim of
   Arizona (rendered by src/components/EphraimProfile.astro for the witness slug
   "ephraim-of-arizona"). Every factual claim here was verified against the
   sources listed in EPHRAIM_SOURCES; where sources disagree (birth year, a few
   founding years, the total monastery count) the profile says so rather than
   choosing silently. Elder Ephraim is NOT formally glorified — this is a
   historical memorial profile, not a record of canonical veneration (CLAUDE.md
   §9), and remains subject to clergy/source review. */

export interface SourcedRow {
  source?: string; // URL, when the row carries its own citation
}

export interface Monastery extends SourcedRow {
  name: string;
  location: string;
  founded: string; // year, or "c. 1998" / "1998 (per Wikipedia)" when uncertain
  kind: string; // "Men's" | "Women's" | "" (unverified)
  note?: string;
}

export interface Work extends SourcedRow {
  title: string;
  type: string;
  publisher: string;
  year: string;
  desc: string;
}

export interface BookAbout extends SourcedRow {
  title: string;
  author: string;
  type: string;
  detail: string;
  desc: string;
}

export interface Quote {
  theme: string;
  text: string;
  work: string;
}

export interface TimelineEntry {
  when: string;
  title: string;
  body: string;
  figures?: { name: string; href?: string }[];
  source?: string;
}

export interface RelatedFigure {
  name: string;
  note: string;
  href?: string; // internal /saint/OS-#### when a canonical page exists
  external?: string; // external reference when no internal page exists yet
}

/* ---- The monastic network (St Anthony's own count: 17 — 10 women's, 7 men's;
   15 in the US, 2 in Canada. The eight the brief named are verified to their own
   sites; the remaining rows' founding years are single-sourced and approximate). */
export const EPHRAIM_MONASTERIES: Monastery[] = [
  {
    name: "Nativity of the Theotokos Monastery",
    location: "Saxonburg, Pennsylvania",
    founded: "1989",
    kind: "Women's",
    note: "His first foundation in the Americas.",
    source: "https://www.nativityofthetheotokosmonastery.org/history",
  },
  {
    name: "Life-Giving Spring Monastery (Zoodochos Peghe)",
    location: "Dunlap, California",
    founded: "1993",
    kind: "Women's",
    source: "https://www.holytrinitysf.org/monasteries",
  },
  {
    name: "St John the Forerunner Monastery",
    location: "Goldendale, Washington",
    founded: "1995",
    kind: "Women's",
    source: "https://stjohnmonastery.org/",
  },
  {
    name: "St Anthony's Greek Orthodox Monastery",
    location: "Florence, Arizona",
    founded: "1995",
    kind: "Men's",
    note: "Elder Ephraim's own residence from 1995 until his repose.",
    source: "https://stanthonysmonastery.org/",
  },
  {
    name: "Holy Archangels Monastery",
    location: "Kendalia, Texas",
    founded: "1996",
    kind: "Men's",
    source: "https://holyarchangels.com/home/our-monastery/",
  },
  {
    name: "Panagia Vlahernon Monastery",
    location: "Williston, Florida",
    founded: "1998",
    kind: "Men's",
    note: "Founding year given as 1998 (OrthodoxWiki); the monastery's own site dates its operation to 1999.",
    source:
      "https://orthodoxwiki.org/Panagia_Vlahernon_Greek_Orthodox_Monastery_(Williston,_Florida)",
  },
  {
    name: "Holy Trinity Monastery",
    location: "Smiths Creek, Michigan",
    founded: "1998–99",
    kind: "Men's",
    note: "Sources give 1998 (Wikipedia) or 1999.",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    name: "St Nektarios Monastery",
    location: "Roscoe, New York",
    founded: "1999",
    kind: "Men's",
    source: "https://www.stnektariosmonastery.org/en/aboutus.html",
  },
  {
    name: "St Kosmas Aitolos Monastery",
    location: "Bolton, Ontario, Canada",
    founded: "1993",
    kind: "Women's",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    name: "Panagia Parigoritissa Monastery",
    location: "Brownsburg-Chatham, Quebec, Canada",
    founded: "1993",
    kind: "Women's",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    name: "St John Chrysostomos Monastery",
    location: "Pleasant Prairie, Wisconsin",
    founded: "1993",
    kind: "Women's",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    name: "Holy Protection of the Theotokos Monastery",
    location: "White Haven, Pennsylvania",
    founded: "1993",
    kind: "Women's",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    name: "Annunciation of the Theotokos Monastery",
    location: "Reddick, Florida",
    founded: "1998",
    kind: "Women's",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    name: "Panagia Prousiotissa Monastery",
    location: "Troy, North Carolina",
    founded: "1998",
    kind: "Women's",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    name: "Panagia Pammakaristos Monastery",
    location: "Lawsonville, North Carolina",
    founded: "1998",
    kind: "Men's",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    name: "Holy Transfiguration Monastery",
    location: "Harvard, Illinois",
    founded: "1998",
    kind: "",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    name: "St Paraskevi Monastery",
    location: "Washington, Texas",
    founded: "2004",
    kind: "Women's",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
];

export const EPHRAIM_WORKS: Work[] = [
  {
    title: "Counsels from the Holy Mountain",
    type: "Letters & homilies",
    publisher:
      "St Anthony's Greek Orthodox Monastery (SAGOM Press), Florence, AZ",
    year: "1999",
    desc: "A large compilation of his letters and homilies on the path to sanctification, addressed to clergy, monastics, and laypeople.",
    source:
      "https://stanthonysmonastery.org/products/counsels-from-the-holy-mountain",
  },
  {
    title: "The Art of Salvation",
    type: "Homilies (33)",
    publisher: "St Nektarios Monastery, Roscoe, NY",
    year: "not stated",
    desc: "Thirty-three homilies — twenty-three to laypeople and ten to the monks of Philotheou — outlining the means that lead to salvation.",
    source: "https://saintnektariosmonastery.com/The-Art-of-Salvation",
  },
  {
    title: "A Call from the Holy Mountain",
    type: "Teachings",
    publisher: "New Sarov Press, Blanco, TX",
    year: "1991",
    desc: "An early, short collection of his teachings on Orthodox monasticism and the spiritual life; long out of print.",
    source: "https://gotruthreform.org/a-call-from-the-holy-mountain",
  },
  {
    title: "My Elder Joseph the Hesychast",
    type: "Memoir",
    publisher: "St Anthony's Greek Orthodox Monastery (Greek original 2008)",
    year: "Eng. c. 2013",
    desc: "Elder Ephraim's firsthand account of the life, struggles, and counsels of his own elder, St Joseph the Hesychast.",
    source: "https://www.holycross.org/products/my-elder-joseph-the-hesychast",
  },
];

export const EPHRAIM_BOOKS_ABOUT: BookAbout[] = [
  {
    title: "Sent By God: The Life of Geronda Ephraim",
    author: "St Anthony's Monastery (compiled)",
    type: "Biography (multi-volume)",
    detail: "St Anthony's Greek Orthodox Monastery, announced c. 2022",
    desc: "A multi-volume life drawing largely on his own words and on the testimony of his spiritual children; the principal book-length work about him. (Confirm current availability with the monastery.)",
    source:
      "https://www.saintsophiadc.org/sent-by-god-the-life-of-geronda-ephraim/",
  },
];

/* Quotations verified to a published work of Elder Ephraim. Widely-circulated
   aphorisms that no source ties to a specific work were deliberately omitted. */
export const EPHRAIM_QUOTES: Quote[] = [
  {
    theme: "Prayer",
    text: "If you truly desire to expel every anti-Christian thought and to purify your nous, you will achieve this only through prayer, for nothing is able to regulate our thoughts as well as prayer.",
    work: "Counsels from the Holy Mountain",
  },
  {
    theme: "Prayer",
    text: "When guided by prayer, the moral powers within us become stronger than all our temptations and conquer them.",
    work: "Counsels from the Holy Mountain",
  },
  {
    theme: "The Jesus Prayer",
    text: "The more humility you mix with your unceasing prayer, the more intensely you will feel Jesus, and your heart will feel like another burning bush.",
    work: "Counsels from the Holy Mountain",
  },
  {
    theme: "The Jesus Prayer",
    text: "Let us compel ourselves, children, in the prayer of our sweetest Jesus, so that He may grant us His mercy, so that we may be united with His grace.",
    work: "Counsels from the Holy Mountain",
  },
  {
    theme: "Repentance",
    text: "Even one tear of repentance is equivalent to a spiritual bath.",
    work: "The Art of Salvation",
  },
  {
    theme: "Repentance",
    text: "The tears of a repentant soul purify the heart, purify the mind, purify the body, purify life, purify speech, and purify a person's every action.",
    work: "The Art of Salvation",
  },
  {
    theme: "Spiritual Warfare",
    text: "God does not want those whom He will save, who seek His mercy, to be ignoramuses, unmanly, cowardly, or spiritually untested.",
    work: "Counsels from the Holy Mountain",
  },
];

/* Elder Ephraim's own life-and-foundation timeline (distinct from the broader
   Orthodoxy-in-America timeline below). */
export const EPHRAIM_LIFE_TIMELINE: TimelineEntry[] = [
  {
    when: "1979",
    title: "First visits to North America",
    body: "Travelling to Canada for medical care, Elder Ephraim visited Orthodox communities in Toronto, Montreal, and Vancouver, where the faithful sought his counsel and confession.",
    source: "https://stanthonysmonastery.org/pages/elder-ephraim",
  },
  {
    when: "1989",
    title: "Nativity of the Theotokos Monastery established (Pennsylvania)",
    body: "His first monastic foundation in the Americas — a women's monastery at Saxonburg, Pennsylvania.",
    source: "https://www.nativityofthetheotokosmonastery.org/history",
  },
  {
    when: "1995",
    title: "St Anthony's Monastery established (Arizona)",
    body: "He settled with a small brotherhood in the Sonoran Desert at Florence, Arizona, which became his residence and the best-known of the monasteries.",
    source: "https://en.wikipedia.org/wiki/Ephraim_of_Arizona",
  },
  {
    when: "1990s–2000s",
    title: "A network of monasteries founded across North America",
    body: "By the count of St Anthony's Monastery, seventeen monastic communities were established through his work — ten for women and seven for men, fifteen in the United States and two in Canada.",
    source: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    when: "2019",
    title: "Repose in the Lord",
    body: "Elder Ephraim reposed on December 7, 2019, at St Anthony's Monastery, Florence, Arizona.",
    source: "https://orthodoxwiki.org/Ephraim_(Moraitis)_of_Philotheou",
  },
];

export const AMERICA_TIMELINE: TimelineEntry[] = [
  {
    when: "1794",
    title: "The Valaam mission arrives in Alaska",
    body: "Ten monks from Valaam and neighbouring monasteries, having departed Russia in 1793, arrived at Kodiak on September 24, 1794 — the beginning of organized Orthodox mission in North America.",
    figures: [
      { name: "St Herman of Alaska", href: "saint/OS-0044" },
      { name: "St Juvenaly of Alaska", href: "saint/OS-1895" },
    ],
    source:
      "https://www.oca.org/orthodoxy/the-orthodox-faith/church-history/eighteenth-century/mission-to-alaska",
  },
  {
    when: "to 1837",
    title: "St Herman among the native Alaskans",
    body: "St Herman settled on Spruce Island, which he named “New Valaam,” living as a hermit and protector of the Alutiiq people until his repose on December 13, 1837.",
    figures: [{ name: "St Herman of Alaska", href: "saint/OS-0044" }],
    source:
      "https://www.oca.org/saints/lives/2018/12/13/103568-saint-herman-of-alaska-wonderworker-of-all-america",
  },
  {
    when: "1824–1867",
    title: "St Innocent's missionary expansion",
    body: "Arriving at Unalaska in 1824, St Innocent (Veniaminov) devised a Cyrillic Aleut alphabet, translated the Gospel of Matthew and other texts, and built schools across Alaska before being elevated Metropolitan of Moscow.",
    figures: [{ name: "St Innocent of Alaska", href: "saint/OS-0054" }],
    source: "https://orthodoxwiki.org/Innocent_of_Alaska",
  },
  {
    when: "1898–1907",
    title: "St Tikhon's North American episcopacy",
    body: "As bishop (from 1898) and then archbishop, the future Patriarch St Tikhon organized the diocese, renamed it “Aleutians and North America,” built up parishes and St Tikhon's Monastery, and envisioned a self-governing American Orthodox Church before returning to Russia in 1907.",
    figures: [{ name: "St Tikhon of Moscow", href: "saint/OS-0053" }],
    source: "https://www.oca.org/holy-synod/past-primates/tikhon-bellavin",
  },
  {
    when: "1904",
    title: "St Raphael of Brooklyn — first bishop consecrated in America",
    body: "Consecrated in New York City in 1904 — the first Orthodox episcopal consecration on American soil — St Raphael gathered the scattered Arabic-speaking faithful and founded some thirty parishes before his repose in 1915.",
    figures: [{ name: "St Raphael of Brooklyn", href: "saint/OS-0055" }],
    source: "https://orthodoxwiki.org/Raphael_of_Brooklyn",
  },
  {
    when: "1900s–1930s",
    title: "Growth through immigration; the seminaries",
    body: "Orthodoxy spread through Greek, Russian, Serbian, Romanian, and Syrian/Lebanese immigration, with parishes multiplying in the great cities and the founding of Holy Cross (1937) and St Vladimir's (1938) seminaries.",
    source: "https://www.svots.edu/about/our-history",
  },
  {
    when: "1979",
    title: "Elder Ephraim begins visiting North America",
    body: "Into this maturing but still young Church — rich in parishes yet with few traditional Athonite-style monastic communities — Elder Ephraim came in 1979, and over the next decades planted a monastic network across the continent.",
    figures: [{ name: "Elder Ephraim of Arizona" }],
    source: "https://stanthonysmonastery.org/pages/elder-ephraim",
  },
];

export const EPHRAIM_RELATED: RelatedFigure[] = [
  {
    name: "St Joseph the Hesychast",
    note: "His own elder and spiritual father on Mount Athos, from whom he received the hesychast tradition.",
    external: "https://orthodoxwiki.org/Joseph_the_Hesychast",
  },
  {
    name: "St Paisios the Athonite",
    note: "A fellow twentieth-century Athonite elder who renewed contemplative monasticism in his generation.",
    href: "saint/OS-0051",
  },
  {
    name: "St Porphyrios of Kavsokalivia",
    note: "A contemporary Athonite elder widely sought across the Orthodox world for spiritual counsel.",
    href: "saint/OS-2291",
  },
  {
    name: "Elder Aimilianos of Simonopetra",
    note: "Abbot of Simonopetra and a leading figure in the twentieth-century Athonite monastic renewal.",
  },
  {
    name: "Elder Haralambos Dionysiatis",
    note: "A fellow disciple of St Joseph the Hesychast who became abbot of the Monastery of Dionysiou.",
  },
];

export const EPHRAIM_GALLERY: { subject: string; caption: string }[] = [
  {
    subject: "Elder Ephraim portrait",
    caption: "Elder Ephraim of Arizona (1927/28 – 2019).",
  },
  {
    subject: "St Joseph the Hesychast portrait",
    caption:
      "St Joseph the Hesychast, Elder Ephraim's spiritual father on Mount Athos.",
  },
  {
    subject: "St Anthony's Monastery",
    caption:
      "St Anthony's Greek Orthodox Monastery, Florence, Arizona (founded 1995).",
  },
  {
    subject: "Mount Athos / Philotheou",
    caption:
      "Philotheou Monastery, Mount Athos, where Elder Ephraim was abbot (1973–1991).",
  },
  {
    subject: "Monastery map of North America",
    caption:
      "The network of monastic communities established across the United States and Canada.",
  },
];

export const EPHRAIM_SOURCES: { label: string; url: string }[] = [
  {
    label:
      "St Anthony's Greek Orthodox Monastery — Elder Ephraim (official biography)",
    url: "https://stanthonysmonastery.org/pages/elder-ephraim",
  },
  {
    label: "St Anthony's Greek Orthodox Monastery — Affiliated Monasteries",
    url: "https://stanthonysmonastery.org/pages/affiliated-monasteries",
  },
  {
    label: "OrthodoxWiki — Ephraim (Moraitis) of Philotheou",
    url: "https://orthodoxwiki.org/Ephraim_(Moraitis)_of_Philotheou",
  },
  {
    label: "Wikipedia — Ephraim of Arizona",
    url: "https://en.wikipedia.org/wiki/Ephraim_of_Arizona",
  },
  {
    label: "Mystagogy (John Sanidopoulos) — repose of Elder Ephraim",
    url: "https://www.johnsanidopoulos.com/2019/12/elder-ephraim-of-philotheou-and-arizona.html",
  },
  {
    label: "Nativity of the Theotokos Monastery — History",
    url: "https://www.nativityofthetheotokosmonastery.org/history",
  },
  {
    label: "OCA — Mission to Alaska (the Valaam mission, 1794)",
    url: "https://www.oca.org/orthodoxy/the-orthodox-faith/church-history/eighteenth-century/mission-to-alaska",
  },
  {
    label: "OCA — St Herman of Alaska",
    url: "https://www.oca.org/saints/lives/2018/12/13/103568-saint-herman-of-alaska-wonderworker-of-all-america",
  },
  {
    label: "OrthodoxWiki — Innocent of Alaska",
    url: "https://orthodoxwiki.org/Innocent_of_Alaska",
  },
  {
    label: "OCA — St Tikhon (Bellavin), past primate",
    url: "https://www.oca.org/holy-synod/past-primates/tikhon-bellavin",
  },
  {
    label: "OrthodoxWiki — Raphael of Brooklyn",
    url: "https://orthodoxwiki.org/Raphael_of_Brooklyn",
  },
];
