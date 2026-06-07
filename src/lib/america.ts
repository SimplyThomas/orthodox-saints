/* Saints of America — a curated web feature, NOT part of the canonical saints
   dataset (data/saints.csv). Orthodox saints who planted and tended the faith in
   North America, plus reposed servants widely venerated but not yet formally
   glorified. Bios are short and factual; ported from the Cloud of Witnesses
   design handoff. This roster awaits clergy/source review before it is treated
   as authoritative (see CLAUDE.md §9). The "awaiting glorification" figures are
   deliberately set apart and are NOT presented as canonized saints, and are
   kept here permanently rather than in data/saints.csv — if and when any are
   glorified they should be added to the canonical dataset at that time. */

export interface AmericaSaint {
  id: string; // canonical OS-#### from data/saints.csv — permanent link to the saint page
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
    id: "OS-0044",
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
    id: "OS-1895",
    name: "Juvenal",
    epithet: "of Alaska",
    cat: "Hieromartyr",
    years: "d. 1796",
    feast: "Sep 24",
    glorified: "1980",
    contribution:
      "A hieromonk from the 1794 Valaam mission who journeyed into the Alaskan interior to bring the Gospel to native peoples; martyred around 1796 — the first of the Alaska missionaries to lay down his life for the faith.",
  },
  {
    id: "OS-0054",
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
    id: "OS-0053",
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
    id: "OS-0055",
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
    id: "OS-0050",
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
    id: "OS-1125",
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
    id: "OS-0846",
    name: "Nikolai",
    epithet: "of Žiča",
    cat: "Hierarch",
    years: "1880 – 1956",
    feast: "Mar 18",
    glorified: "2003",
    contribution:
      "Serbian bishop, theologian and “New Chrysostom” who taught in America and reposed at St Tikhon's Monastery in South Canaan, Pennsylvania.",
  },
  {
    id: "OS-2338",
    name: "Mardarije",
    epithet: "of Libertyville",
    cat: "Hierarch",
    years: "1889 – 1935",
    feast: "Dec 12",
    glorified: "1961",
    contribution:
      "A Serbian missionary bishop who organized the early Serbian Orthodox Diocese of America and built the Monastery of St. Sava in Libertyville, Illinois — laying the foundation for Serbian Orthodoxy in the New World.",
  },
];

// Movement II — Those Born of This Land
export const AMERICA_MOVEMENT_II: AmericaSaint[] = [
  {
    id: "OS-1894",
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
    id: "OS-1579",
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
    id: "OS-2083",
    name: "Olga",
    epithet: "of Alaska",
    cat: "Righteous",
    years: "1916 – 1979",
    feast: "Nov 8",
    glorified: "2023",
    contribution:
      "A Yup'ik matushka of Kwethluk, a midwife and mother known for her quiet care of the abused and the grieving — recently glorified by the Church in America.",
  },
  {
    id: "OS-2277",
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

// "The Witnesses of Our Time" — order follows the design handoff roster.
export const AMERICA_AWAITING: AwaitingSaint[] = [
  {
    name: "Elder Ephraim",
    epithet: "of Arizona",
    role: "Athonite Elder",
    years: "1928 – 2019",
    place: "St Anthony's Monastery, Florence, Arizona",
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
    name: "Archimandrite Roman",
    epithet: "Braga",
    role: "Confessor & Elder",
    years: "1922 – 2015",
    place: "Holy Dormition Monastery, Rives Junction, Michigan",
    contribution:
      "A Romanian priest imprisoned and tortured under communism who, having found inner freedom in his cell, carried that joy to America and shaped monastic life in Michigan.",
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
    name: "Mother Alexandra",
    epithet: "Princess Ileana",
    role: "Monastic Foundress",
    years: "1909 – 1991",
    place: "Monastery of the Transfiguration, Ellwood City, Pennsylvania",
    contribution:
      "Born Princess Ileana of Romania, she embraced monastic life in America and founded the Monastery of the Transfiguration in Pennsylvania — a haven of prayer for Orthodox women.",
  },
  {
    name: "Fr. Thomas Hopko",
    epithet: "of St Vladimir's",
    role: "Priest & Theologian",
    years: "1939 – 2015",
    place: "Ellwood City, Pennsylvania",
    contribution:
      "A beloved teacher, preacher and dean of St Vladimir's Seminary whose lectures, books and “55 maxims” formed generations of English-speaking Orthodox Christians.",
  },
  {
    name: "Fr. Michael Oleksa",
    epithet: "",
    role: "Priest & Educator",
    years: "1947 – 2023",
    place: "Alaska",
    contribution:
      "A missionary priest, teacher and storyteller who spent decades among the peoples of Alaska — a leading interpreter of Alaska Native cultures and of the deep Orthodox history rooted in that land.",
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
    name: "Fr. Alexander Schmemann",
    epithet: "",
    role: "Priest & Theologian",
    years: "1921 – 1983",
    place: "St Vladimir's Seminary, Crestwood, New York",
    contribution:
      "Dean of St Vladimir's Seminary and author of “For the Life of the World,” whose liturgical theology renewed the Eucharistic life of Orthodox Christians across America and far beyond.",
  },
  {
    name: "Fr. Georges Florovsky",
    epithet: "",
    role: "Priest & Theologian",
    years: "1893 – 1979",
    place: "Princeton, New Jersey",
    contribution:
      "A Russian émigré priest, church historian and theologian who called the Church to a “neo-patristic synthesis” — a return to the Fathers — while teaching at St Vladimir's, Harvard and Princeton.",
  },
  {
    name: "Fr. John Meyendorff",
    epithet: "",
    role: "Priest & Theologian",
    years: "1926 – 1992",
    place: "St Vladimir's Seminary, Crestwood, New York",
    contribution:
      "A patristic scholar of St Gregory Palamas and dean of St Vladimir's Seminary, whose learning and witness helped a self-governing Orthodox Church take root in America.",
  },
];
