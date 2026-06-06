/* Saints of America — a curated web feature, NOT part of the canonical saints
   dataset (data/saints.csv). Orthodox saints who planted and tended the faith in
   North America, plus reposed servants widely venerated but not yet formally
   glorified. Bios are short and factual; ported from the Cloud of Witnesses
   design handoff. This roster awaits clergy/source review before it is treated
   as authoritative (see CLAUDE.md §9). The "awaiting glorification" figures are
   deliberately set apart and are NOT presented as canonized saints.

   NOTE: folding this roster into the data pipeline (data/saints.csv) is a
   candidate follow-up PR — it needs its own validation + canonization-caution
   design for the "awaiting glorification" set. */

import type { Saint } from "./types";

export interface AmericaSaint {
  name: string;
  epithet: string;
  cat: string;
  years: string;
  feast: string;
  glorified: string;
  contribution: string;
  badge?: string;
}

export interface AwaitingSaint {
  name: string;
  epithet: string;
  role: string;
  years: string;
  place: string;
  contribution: string;
  reposedYear?: string;
}

// Movement I — They Came from Across the Sea
export const AMERICA_MOVEMENT_I: AmericaSaint[] = [
  {
    name: "Herman",
    epithet: "of Alaska",
    cat: "Monastic",
    years: "c. 1756 – 1837",
    feast: "Dec 13",
    glorified: "1970",
    badge: "First-glorified Saint of North America",
    contribution:
      "Came with the 1794 Valaam mission to Kodiak; a humble monk who defended the Alaska Natives from exploitation and lived as a hermit on Spruce Island, the spiritual father of all American Orthodoxy.",
  },
  {
    name: "Innocent",
    epithet: "of Alaska",
    cat: "Enlightener",
    years: "1797 – 1879",
    feast: "Mar 31",
    glorified: "1977",
    contribution:
      "Apostle to America — created written alphabets for the Aleut and Yupik, translated the Scriptures, and later became Metropolitan of Moscow.",
  },
  {
    name: "Tikhon",
    epithet: "of Moscow",
    cat: "Hierarch",
    years: "1865 – 1925",
    feast: "Oct 9",
    glorified: "1989",
    contribution:
      "As Bishop of the Aleutians & North America he organized the young American Church, blessed dozens of parishes, and later became Patriarch of Moscow and a confessor.",
  },
  {
    name: "Raphael",
    epithet: "of Brooklyn",
    cat: "Hierarch",
    years: "1860 – 1915",
    feast: "Feb 27",
    glorified: "2000",
    contribution:
      "The first Orthodox bishop consecrated on American soil — “Good Shepherd of the Lost Sheep,” who gathered the scattered Arab and Syrian Orthodox across the continent.",
  },
  {
    name: "John",
    epithet: "of San Francisco",
    cat: "Hierarch",
    years: "1896 – 1966",
    feast: "Jul 2",
    glorified: "1994",
    contribution:
      "Archbishop and wonderworker who shepherded refugees across continents and raised up the cathedral of the Mother of God “Joy of All Who Sorrow” in San Francisco.",
  },
  {
    name: "Alexis",
    epithet: "of Wilkes-Barre",
    cat: "Confessor",
    years: "1854 – 1909",
    feast: "May 7",
    glorified: "1994",
    contribution:
      "A parish priest who guided tens of thousands of Carpatho-Russian immigrants home to Orthodoxy across the mining towns of the American Northeast.",
  },
  {
    name: "Nikolai",
    epithet: "of Žiča",
    cat: "Hierarch",
    years: "1880 – 1956",
    feast: "Mar 18",
    glorified: "2003",
    contribution:
      "Serbian bishop, theologian and “New Chrysostom” who taught in America and reposed at St Tikhon’s Monastery in South Canaan, Pennsylvania.",
  },
];

// Movement II — Those Born of This Land
export const AMERICA_MOVEMENT_II: AmericaSaint[] = [
  {
    name: "Peter",
    epithet: "the Aleut",
    cat: "Martyr",
    years: "d. 1815",
    feast: "Sep 24",
    glorified: "1980",
    contribution:
      "A young Aleut from Kodiak martyred in California for refusing to renounce the Orthodox faith — the proto-martyr of America.",
  },
  {
    name: "Jacob",
    epithet: "Netsvetov",
    cat: "Enlightener",
    years: "1802 – 1864",
    feast: "Jul 26",
    glorified: "1994",
    contribution:
      "The first Alaska Native ordained to the priesthood, who carried the Gospel and the translated services to his own peoples of the Yukon delta.",
  },
  {
    name: "Olga",
    epithet: "of Alaska",
    cat: "Righteous",
    years: "1916 – 1979",
    feast: "Nov 8",
    glorified: "2023",
    contribution:
      "A Yup’ik matushka of Kwethluk, a midwife and mother known for her quiet care of the abused and the grieving — recently glorified by the Church in America.",
  },
  {
    name: "Sebastian",
    epithet: "Dabovich",
    cat: "Missionary",
    years: "1863 – 1940",
    feast: "Nov 30",
    glorified: "2015",
    contribution:
      "The first Orthodox priest born in the United States; a tireless missionary across the Americas called the “Apostle to the Americas.”",
  },
];

export const AMERICA_AWAITING: AwaitingSaint[] = [
  {
    name: "Elder Ephraim",
    epithet: "of Arizona",
    role: "Athonite Elder",
    years: "1928 – 2019",
    place: "St Anthony’s Monastery, Florence, Arizona",
    contribution:
      "A disciple of St Joseph the Hesychast who, coming from Mount Athos, founded some twenty Orthodox monasteries across the United States and Canada — reviving traditional monastic life on the continent.",
  },
  {
    name: "Hieromonk Seraphim",
    epithet: "Rose, of Platina",
    role: "Monk & Writer",
    years: "1934 – 1982",
    place: "St Herman Monastery, Platina, California",
    contribution:
      "An American convert and co-founder of the St Herman of Alaska Monastery in California whose writings opened the door of Orthodoxy to a whole generation of English-speaking seekers.",
  },
  {
    name: "Archbishop Dmitri",
    epithet: "Royster",
    role: "Missionary Hierarch",
    years: "1923 – 2011",
    place: "Dallas, Texas",
    contribution:
      "A Texan convert from a Baptist family who became founding bishop of the Diocese of the South, planting and nurturing scores of mission parishes across the American South.",
  },
  {
    name: "Fr. Thomas Hopko",
    epithet: "of St Vladimir’s",
    role: "Priest & Theologian",
    years: "1939 – 2015",
    place: "Ellwood City, Pennsylvania",
    contribution:
      "A beloved teacher, preacher and dean of St Vladimir’s Seminary whose lectures, books and “55 maxims” formed generations of English-speaking Orthodox Christians.",
  },
  {
    name: "Archimandrite Roman",
    epithet: "Braga",
    role: "Confessor & Elder",
    years: "1922 – 2015",
    place: "Holy Dormition Monastery, Rives Junction, Michigan",
    contribution:
      "A Romanian priest imprisoned and tortured under communism who, having found inner freedom in his cell, carried that joy to America and shaped monastic life in Michigan.",
  },
  {
    name: "Fr. Michael",
    epithet: "Gelsinger",
    role: "Priest",
    years: "",
    reposedYear: "2019",
    place: "the American South",
    contribution:
      "A pastor remembered with deep affection by many of the faithful across the American South, who held him in living memory long after his repose.",
  },
  {
    name: "Mother Alexandra",
    epithet: "Princess Ileana",
    role: "Monastic Foundress",
    years: "1909 – 1991",
    place: "Monastery of the Transfiguration, Ellwood City, Pennsylvania",
    contribution:
      "Born Princess Ileana of Romania, she embraced monastic life in America and founded the Monastery of the Transfiguration in Pennsylvania — a haven of prayer for Orthodox women.",
  },
];

/* Resolve a curated America entry to a canonical saint row (by first name +
   a 4+ letter epithet token), so the feature can link to the real /saint page.
   Ported from app.js findAmerican(); now runs at build time against SAINTS. */
export function findAmerican(
  saints: Saint[],
  name: string,
  epithet: string,
): Saint | undefined {
  const fn = name
    .toLowerCase()
    .replace(
      /^(elder|hieromonk|archimandrite|archbishop|mother|fr\.?\s+)/,
      "",
    )
    .split(" ")[0];
  const epMatch = (epithet || "").toLowerCase().match(/[a-z]{4,}/);
  const ep = epMatch ? epMatch[0] : "";
  return saints.find((s) => {
    const hay = (
      s.name +
      " " +
      (s.aka || []).join(" ") +
      " " +
      (s.search || "")
    ).toLowerCase();
    return hay.includes(fn) && (!ep || hay.includes(ep));
  });
}
