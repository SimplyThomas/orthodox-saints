/* Saints of America — a curated web feature listing GLORIFIED Orthodox saints who
   planted and tended the faith in North America. Each maps by `id` to a canonical
   record in data/saints.csv; the America page reads name/feast/portrait from there
   (single source of truth) and layers these page-only editorial fields (cat,
   years, glorified year, contribution) on top. Bios are short and factual, ported
   from the Cloud of Witnesses design handoff, and await clergy/source review
   before being treated as authoritative (see CLAUDE.md §9).

   The departed who are NOT (or not yet) glorified — the "Witnesses of Our Time" —
   are kept entirely separate in src/lib/witnesses.ts, with their own memorial
   pages, so they never appear as canonized saints. */

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

// The "Witnesses of Our Time" (departed, not yet glorified) now live in their
// own non-canonical database, src/lib/witnesses.ts, with their own memorial
// pages at /witness/<slug>.

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
