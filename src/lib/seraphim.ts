/* Structured, sourced data for the comprehensive profile of Father Seraphim Rose
   (rendered by src/components/SeraphimProfile.astro for the witness slug
   "seraphim-rose"). Every factual claim was verified against the sources in
   SERAPHIM_SOURCES; where sources disagree (the monastery's founding year, the
   first-meeting year) the profile says so. Father Seraphim is NOT formally
   glorified — this is a historical memorial profile, not a record of canonical
   veneration (CLAUDE.md §9), and remains subject to clergy/source review.

   Types are reused from the Elder Ephraim profile module. */

import type {
  Work,
  BookAbout,
  Quote,
  TimelineEntry,
  RelatedFigure,
} from "./ephraim";

export const SERAPHIM_LIFE_TIMELINE: TimelineEntry[] = [
  {
    when: "1934",
    title: "Born in California",
    body: "Eugene Dennis Rose is born on August 13, 1934, in San Diego, California, into a Protestant family.",
    source: "https://orthodoxwiki.org/Seraphim_(Rose)",
  },
  {
    when: "1950s",
    title: "Philosophy and Chinese studies",
    body: "He graduates from Pomona College (1956) and pursues Asian languages and philosophy — studying Chinese under Gi-ming Shien and at the American Academy of Asian Studies — taking an M.A. in Oriental Languages at UC Berkeley (1961).",
    source: "https://en.wikipedia.org/wiki/Seraphim_Rose",
  },
  {
    when: "1961–62",
    title: "Meets Gleb Podmoshensky; received into the Church",
    body: "Drawn to Russian Orthodoxy in San Francisco, he meets Gleb Podmoshensky (the future Fr Herman) and is received into the Russian Church Abroad (ROCOR) by chrismation in 1962.",
    source: "https://seraphimofplatina.com/biography_en",
  },
  {
    when: "1963",
    title: "St Herman of Alaska Brotherhood founded",
    body: "With the blessing of his spiritual father, St John Maximovitch, Eugene and Gleb found the St Herman of Alaska Brotherhood as a community of Orthodox booksellers and publishers.",
    source: "https://sainthermanmonastery.org/about-us/",
  },
  {
    when: "1964–65",
    title: "Bookstore and publishing begin",
    body: "They open an Orthodox bookstore beside the Holy Virgin Cathedral in San Francisco (March 1964) and, in 1965, launch the magazine The Orthodox Word and St Herman Press.",
    source: "https://en.wikipedia.org/wiki/Seraphim_Rose",
  },
  {
    when: "1969–70",
    title: "Platina monastic community established",
    body: "The brotherhood moves to the wilderness near Platina, in northern California (1969); the first monks are tonsured in 1970, beginning the St Herman of Alaska Monastery. Eugene is tonsured a monk and given the name Seraphim, after St Seraphim of Sarov.",
    source: "https://sainthermanmonastery.org/about-us/",
  },
  {
    when: "1977",
    title: "Ordained priest",
    body: "Fr Seraphim is ordained a hieromonk by Bishop Nektary of Seattle, a spiritual son of St Nektary of Optina.",
    source: "https://seraphimofplatina.com/biography_en",
  },
  {
    when: "1982",
    title: "Repose in the Lord",
    body: "After a sudden illness (mesenteric thrombosis), Fr Seraphim reposes on September 2, 1982, aged 48, and is buried at the monastery in Platina.",
    source: "https://en.wikipedia.org/wiki/Seraphim_Rose",
  },
];

export const SERAPHIM_WORKS: Work[] = [
  {
    title: "Nihilism: The Root of the Revolution of the Modern Age",
    type: "Essay (book)",
    publisher: "St Herman of Alaska Brotherhood",
    year: "written c. 1962; pub. 1994 (posth.)",
    desc: "An analysis of nihilism as the spiritual root of the modern revolutionary age; written as a chapter of an unfinished larger work and later issued on its own.",
    source: "https://en.wikipedia.org/wiki/Seraphim_Rose",
  },
  {
    title: "Orthodoxy and the Religion of the Future",
    type: "Book",
    publisher: "St Herman of Alaska Brotherhood",
    year: "1975",
    desc: "A critique of Eastern religions, the New Age and charismatic movements, and other phenomena as a coalescing modern “religion of the future”; includes his chapter on UFOs.",
    source:
      "https://en.wikipedia.org/wiki/Orthodoxy_and_the_Religion_of_the_Future",
  },
  {
    title: "The Soul After Death",
    type: "Book",
    publisher: "St Herman of Alaska Brotherhood",
    year: "1980",
    desc: "The Orthodox patristic teaching on the soul's experience after death, set against contemporary “after-death” and occult accounts.",
    source: "https://archive.org/details/soulafterdeathco0000rose",
  },
  {
    title: "God's Revelation to the Human Heart",
    type: "Booklet (lecture)",
    publisher: "St Herman Press",
    year: "from a 1981 lecture; pub. posth.",
    desc: "A short talk, given at UC Santa Cruz in 1981, on the conversion of the heart, drawing on Scripture, the Fathers, and the lives of the saints.",
    source:
      "https://www.sainthermanmonastery.com/God-s-Revelation-to-the-Human-Heart-p/grhh.htm",
  },
  {
    title: "Genesis, Creation, and Early Man",
    type: "Compilation",
    publisher: "St Herman of Alaska Brotherhood",
    year: "2000 (posth.)",
    desc: "A compendium of his patristic commentary on Genesis 1–11, drawn largely from his Orthodox Survival Course.",
    source: "https://en.wikipedia.org/wiki/Seraphim_Rose",
  },
  {
    title: "Letters from Father Seraphim",
    type: "Collected letters",
    publisher: "Nikodemos Orthodox Publication Society",
    year: "2001 (posth.)",
    desc: "A collection of his spiritual correspondence. (Publisher and year per encyclopedic listings.)",
    source: "https://orthodoxwiki.org/Seraphim_(Rose)",
  },
];

export const SERAPHIM_BOOKS_ABOUT: BookAbout[] = [
  {
    title: "Not of This World: The Life and Teaching of Fr Seraphim Rose",
    author: "Monk Damascene (Christensen)",
    type: "Biography",
    detail: "Fr Seraphim Rose Foundation, 1993",
    desc: "The first full-length biography, written by a disciple at the Platina monastery.",
    source: "https://www.goodreads.com/book/show/314169",
  },
  {
    title: "Father Seraphim Rose: His Life and Works",
    author: "Hieromonk Damascene (Christensen)",
    type: "Biography (definitive)",
    detail: "St Herman of Alaska Brotherhood, 2003",
    desc: "A greatly revised and expanded successor to Not of This World (~1,160 pp.); the standard biography.",
    source: "https://www.goodreads.com/book/show/314159.Father_Seraphim_Rose",
  },
];

export const SERAPHIM_QUOTES: Quote[] = [
  {
    theme: "Prayer",
    text: "The heart of Orthodoxy is prayer; and I may truthfully say that before I found Orthodoxy I never had the slightest idea of what prayer was or what power it had.",
    work: "Letter to Alison Engler, July 15, 1963",
  },
  {
    theme: "Prayer",
    text: "Often, of course, one is cold in prayer; but I have known times of truly warm and fervent prayer, and of heartfelt tears of repentance, and the joy of seeing my prayers answered.",
    work: "Letter to Alison Engler, July 15, 1963",
  },
  {
    theme: "Suffering",
    text: "When conversion takes place, the process of revelation occurs in a very simple way — a person is in need, he suffers, and then somehow the other world opens up.",
    work: "God's Revelation to the Human Heart (1981 lecture)",
  },
  {
    theme: "Truth",
    text: "Orthodoxy is life. If we don't live Orthodoxy, we simply are not Orthodox, no matter what formal beliefs we might hold.",
    work: "The Orthodox World-View (1982)",
  },
  {
    theme: "Spiritual struggle",
    text: "The true Christian today cannot be at home in the world; he cannot help but feel himself, and be regarded by others, as a little “crazy.”",
    work: "The Orthodox World-View (1982)",
  },
  {
    theme: "Spiritual struggle",
    text: "It is later than you think. Hasten, therefore, to do the work of God.",
    work: "A frequent refrain, recorded in Father Seraphim Rose: His Life and Works",
  },
  {
    theme: "Love of Christ",
    text: "God's revelation is given to something called a loving heart.",
    work: "God's Revelation to the Human Heart (1981 lecture)",
  },
];

export const SERAPHIM_RELATED: RelatedFigure[] = [
  {
    name: "St John Maximovitch (of Shanghai & San Francisco)",
    note: "His spiritual father and mentor in San Francisco, who blessed the founding of the St Herman Brotherhood.",
    href: "saint/OS-0050",
  },
  {
    name: "St Herman of Alaska",
    note: "The 18th-century Alaska missionary for whom the brotherhood and monastery are named.",
    href: "saint/OS-0044",
  },
  {
    name: "Archbishop Averky Taushev",
    note: "Rector of Holy Trinity Seminary, Jordanville; a ROCOR theological influence on the brotherhood's outlook.",
  },
  {
    name: "Father Herman Podmoshensky",
    note: "Co-founder, with Eugene Rose, of the St Herman Brotherhood, The Orthodox Word, and the Platina monastery.",
  },
  {
    name: "Elder Ephraim of Arizona",
    note: "A contemporary who, in the same era, planted Athonite monasticism across North America.",
    href: "witness/ephraim-of-arizona",
  },
  {
    name: "St Paisios the Athonite",
    note: "A contemporary Athonite elder of the same period of monastic renewal.",
    href: "saint/OS-0051",
  },
  {
    name: "St Porphyrios of Kavsokalivia",
    note: "A contemporary Athonite elder widely sought for spiritual counsel.",
    href: "saint/OS-2291",
  },
];

export const SERAPHIM_AMERICA_TIMELINE: TimelineEntry[] = [
  {
    when: "1794",
    title: "The Valaam mission arrives in Alaska",
    body: "Monks from Valaam arrive at Kodiak — the beginning of organized Orthodox mission in North America.",
    figures: [
      { name: "St Herman of Alaska", href: "saint/OS-0044" },
      { name: "St Innocent of Alaska", href: "saint/OS-0054" },
    ],
    source:
      "https://www.oca.org/orthodoxy/the-orthodox-faith/church-history/eighteenth-century/mission-to-alaska",
  },
  {
    when: "1898–1907",
    title: "St Tikhon and St Raphael build up the American Church",
    body: "The future Patriarch St Tikhon organizes the North American diocese, and St Raphael of Brooklyn becomes the first Orthodox bishop consecrated on American soil (1904).",
    figures: [
      { name: "St Tikhon of Moscow", href: "saint/OS-0053" },
      { name: "St Raphael of Brooklyn", href: "saint/OS-0055" },
    ],
    source: "https://orthodoxwiki.org/Raphael_of_Brooklyn",
  },
  {
    when: "1962",
    title: "Eugene Rose enters the Orthodox Church",
    body: "An American-born seeker, having passed through philosophy and Eastern religion, is received into ROCOR in San Francisco under St John Maximovitch.",
    figures: [{ name: "St John Maximovitch", href: "saint/OS-0050" }],
    source: "https://orthodoxwiki.org/Seraphim_(Rose)",
  },
  {
    when: "1963–65",
    title: "The St Herman Brotherhood and The Orthodox Word",
    body: "Rose and Podmoshensky found the St Herman of Alaska Brotherhood (1963) and begin English-language Orthodox publishing — The Orthodox Word and St Herman Press (1965).",
    source: "https://en.wikipedia.org/wiki/Seraphim_Rose",
  },
  {
    when: "1969–70",
    title: "The Platina monastery",
    body: "The brotherhood withdraws to the northern California wilderness; the St Herman of Alaska Monastery begins with the first tonsures in 1970.",
    source: "https://sainthermanmonastery.org/about-us/",
  },
  {
    when: "1982",
    title: "Repose of Fr Seraphim",
    body: "Fr Seraphim reposes at the monastery he helped found; his books and The Orthodox Word continue in print.",
    source: "https://en.wikipedia.org/wiki/Seraphim_Rose",
  },
  {
    when: "Present day",
    title: "A continuing influence",
    body: "Through the monastery, the press, and a readership of converts, Fr Seraphim's work represents a phase of Orthodox mission addressed to modern English-speaking Americans.",
    source: "https://sainthermanmonastery.org/about-us/",
  },
];

export const SERAPHIM_GALLERY: { subject: string; caption: string }[] = [
  {
    subject: "Father Seraphim Rose portrait",
    caption: "Hieromonk Seraphim (Rose) of Platina (1934–1982).",
  },
  {
    subject: "St John Maximovitch",
    caption:
      "St John of Shanghai & San Francisco, Fr Seraphim's spiritual father.",
  },
  {
    subject: "St Herman of Alaska Monastery, Platina",
    caption:
      "The monastery in the northern California wilderness, founded 1969–70.",
  },
  {
    subject: "The Orthodox Word",
    caption: "The bimonthly magazine begun in January 1965, still in print.",
  },
  {
    subject: "Father Seraphim's grave",
    caption: "His grave at the Platina monastery, a place of pilgrimage.",
  },
];

export const SERAPHIM_SOURCES: { label: string; url: string }[] = [
  {
    label: "OrthodoxWiki — Seraphim (Rose)",
    url: "https://orthodoxwiki.org/Seraphim_(Rose)",
  },
  {
    label: "Wikipedia — Seraphim Rose",
    url: "https://en.wikipedia.org/wiki/Seraphim_Rose",
  },
  {
    label: "St Herman of Alaska Monastery — About",
    url: "https://sainthermanmonastery.org/about-us/",
  },
  {
    label: "St Herman of Alaska Monastery / St Herman Press",
    url: "http://www.sainthermanmonastery.com/Default.asp",
  },
  {
    label: "Seraphim of Platina — Biography",
    url: "https://seraphimofplatina.com/biography_en",
  },
  {
    label: "Wikipedia — Saint Herman of Alaska Monastery (Platina)",
    url: "https://en.wikipedia.org/wiki/Saint_Herman_of_Alaska_Monastery",
  },
  {
    label: "The Orthodox Word, Issue #1 (Jan–Feb 1965), Internet Archive",
    url: "https://archive.org/details/001V01N011965JanFeb",
  },
  {
    label: "Collected Letters of Fr Seraphim (Goldenmouth)",
    url: "https://www.goldenmouth.org/st-seraphim-of-platina/letters",
  },
];
