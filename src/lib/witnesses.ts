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

import type { TimelineEntry, RelatedFigure } from "./ephraim";

/** A work by, or book about, a witness. Lighter than the Ephraim/Seraphim
 *  `Work`/`BookAbout` tables — a title with an optional one-line detail and an
 *  optional citation link. */
export interface WitnessWork {
  title: string;
  detail?: string;
  source?: string;
}

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

  /* ── Rich profile (optional) ──────────────────────────────────────────────
     When `overview` is present, witness/[slug].astro renders the comprehensive
     WitnessProfile (matching the Elder Ephraim / Fr Seraphim format) instead of
     the simple memorial template. All fields below are sourced-only and remain
     subject to clergy/source review (CLAUDE.md §9); these figures are NOT
     glorified, so no feast/veneration/intercession is ever implied. */
  /** secular / birth name shown under the heading (e.g. "Born Princess Ileana") */
  secularName?: string;
  /** jurisdiction(s) within which they served — historical, not a veneration claim */
  jurisdiction?: string;
  /** rail "At a glance" facts (label, value); falls back to none if absent */
  railFacts?: [string, string][];
  /** rail "Known for" line */
  knownFor?: string;
  /** the comprehensive biography, one entry per paragraph — presence triggers the rich profile */
  overview?: string[];
  /** life-in-brief timeline */
  timeline?: TimelineEntry[];
  /** works by the witness */
  worksBy?: WitnessWork[];
  /** books / materials about the witness */
  worksAbout?: WitnessWork[];
  /** related figures (internal saint/witness links where a page exists) */
  related?: RelatedFigure[];
  /** historical significance, one entry per paragraph */
  significance?: string[];
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
    secularName: "Romanian-American confessor and elder",
    jurisdiction: "Romanian Orthodox Episcopate of America (OCA)",
    railFacts: [
      ["Lived", "1922 – 2015"],
      ["Born", "Condrița, Bessarabia"],
      ["Reposed", "Rives Junction, Michigan"],
      ["Tradition", "Romanian · OCA"],
      ["Era", "Modern · 20th–21st c."],
    ],
    knownFor: "Prison-confessor spirituality carried to North America",
    overview: [
      "Father Roman Braga was born on April 2, 1922, in Condrița, in Bessarabia, and entered monastic formation in Romania while still young, receiving his monastic and theological schooling there through the 1930s.",
      "Under the Romanian communist regime he was imprisoned and endured years of suffering, including a period of solitary confinement. He often recounted that it was precisely in his cell that he discovered an inner freedom and joy no captivity could take from him — an experience that shaped the confessor and spiritual father he would become.",
      "After emigrating to North America he served especially within the Romanian Orthodox Episcopate and settled at the Holy Dormition Monastery in Rives Junction, Michigan, where he was widely sought as an elder. Shortly before his death the Orthodox Church in America awarded him the Order of Saint Romanos for his service. He reposed at the monastery on April 28, 2015.",
    ],
    timeline: [
      {
        when: "1922",
        title: "Born in Bessarabia",
        body: "Roman Braga is born on April 2, 1922, in Condrița, Bessarabia.",
        source: "https://www.oca.org/in-memoriam/archimandrite-roman-braga",
      },
      {
        when: "1930s",
        title: "Monastic and theological schooling",
        body: "He enters monastic formation in Romania and pursues theological studies.",
        source: "https://www.oca.org/in-memoriam/archimandrite-roman-braga",
      },
      {
        when: "1940s–50s",
        title: "Imprisonment under communism",
        body: "He is imprisoned by the Romanian communist regime and endures years of suffering, including solitary confinement — the crucible of his later witness as a confessor.",
        source: "https://www.oca.org/in-memoriam/archimandrite-roman-braga",
      },
      {
        when: "1960s–70s",
        title: "Emigration to North America",
        body: "After his release he eventually emigrates to North America, serving within the Romanian Orthodox Episcopate.",
        source: "https://www.oca.org/in-memoriam/archimandrite-roman-braga",
      },
      {
        when: "Later years",
        title: "Elder at Holy Dormition Monastery",
        body: "He settles at the Holy Dormition Monastery in Rives Junction, Michigan, becoming a beloved spiritual father; shortly before his repose the OCA awards him the Order of Saint Romanos.",
        source: "https://www.oca.org/in-memoriam/archimandrite-roman-braga",
      },
      {
        when: "2015",
        title: "Repose in the Lord",
        body: "Father Roman reposes at the Holy Dormition Monastery on April 28, 2015.",
        source: "https://www.oca.org/in-memoriam/archimandrite-roman-braga",
      },
    ],
    worksBy: [
      {
        title: "Talks, interviews, and homilies",
        detail:
          "Recorded and transcribed; individual published titles should be verified before being listed as formal books.",
      },
    ],
    worksAbout: [
      {
        title: "“Beyond Torture” — interview material",
        detail:
          "Filmed and recorded interviews recounting his prison years and spiritual outlook.",
      },
      {
        title: "Holy Dormition Monastery memorial materials",
        detail:
          "Memorial accounts and remembrances from the monastery and the OCA.",
        source: "https://www.oca.org/in-memoriam/archimandrite-roman-braga",
      },
    ],
    related: [
      {
        name: "Mother Gabriella (Ursache)",
        note: "Abbess of the Holy Dormition Monastery in Michigan, where Fr Roman served as spiritual father.",
      },
      {
        name: "Holy Dormition Monastery, Rives Junction, Michigan",
        note: "The Romanian-tradition women's monastery that was his home in America.",
      },
      {
        name: "Romanian Orthodox Episcopate of America",
        note: "The jurisdiction within the OCA in which he served after emigrating.",
      },
    ],
    significance: [
      "Father Roman Braga is remembered as a living-memory bridge between the prison-confessor spirituality of Romania under communism and Orthodox monastic life in North America — a witness that suffering, met in Christ, can become a source of inner freedom and joy.",
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
    secularName: "Born Robert R. Royster · “Apostle to the South”",
    jurisdiction: "Orthodox Church in America — Diocese of the South",
    railFacts: [
      ["Lived", "1923 – 2011"],
      ["Born", "Teague, Texas"],
      ["Reposed", "Dallas, Texas"],
      ["Tradition", "Convert · OCA"],
      ["Era", "Modern · 20th–21st c."],
    ],
    knownFor: "Building Orthodox mission life across the American South",
    overview: [
      "Archbishop Dmitri (Royster) was born Robert R. Royster on November 2, 1923, in Teague, Texas, into a Baptist family. As a young man he discovered Orthodox Christianity and was received into the Church in 1941.",
      "He was ordained a priest in 1954 and consecrated a bishop in 1969. In 1978 he became the first ruling bishop of the OCA Diocese of the South, which he led from Dallas; he was elevated to the dignity of archbishop in 1993 and retired in 2009.",
      "A rare early American-born convert hierarch, he is remembered above all for planting and nurturing Orthodox mission parishes across the American South — work that earned him the affectionate title “Apostle to the South.” He reposed in Dallas on August 28, 2011.",
    ],
    timeline: [
      {
        when: "1923",
        title: "Born in Texas",
        body: "Robert R. Royster is born on November 2, 1923, in Teague, Texas, into a Baptist family.",
        source: "https://orthodoxwiki.org/Dmitri_(Royster)_of_Dallas",
      },
      {
        when: "1941",
        title: "Received into Orthodoxy",
        body: "As a young man he is received into the Orthodox Church.",
        source: "https://orthodoxwiki.org/Dmitri_(Royster)_of_Dallas",
      },
      {
        when: "1954",
        title: "Ordained priest",
        body: "He is ordained to the holy priesthood.",
        source: "https://orthodoxwiki.org/Dmitri_(Royster)_of_Dallas",
      },
      {
        when: "1969",
        title: "Consecrated bishop",
        body: "He is consecrated a bishop.",
        source: "https://orthodoxwiki.org/Dmitri_(Royster)_of_Dallas",
      },
      {
        when: "1978",
        title: "First bishop of the Diocese of the South",
        body: "He becomes the first ruling bishop of the OCA Diocese of the South, based in Dallas.",
        source:
          "https://www.oca.org/in-memoriam/his-eminence-archbishop-dmitri",
      },
      {
        when: "1993",
        title: "Elevated to archbishop",
        body: "He is elevated to the dignity of archbishop.",
        source:
          "https://www.oca.org/in-memoriam/his-eminence-archbishop-dmitri",
      },
      {
        when: "2009",
        title: "Retirement",
        body: "Archbishop Dmitri retires after decades of missionary leadership in the South.",
        source:
          "https://www.oca.org/in-memoriam/his-eminence-archbishop-dmitri",
      },
      {
        when: "2011",
        title: "Repose in the Lord",
        body: "He reposes in Dallas on August 28, 2011.",
        source:
          "https://www.oca.org/in-memoriam/his-eminence-archbishop-dmitri",
      },
    ],
    worksBy: [
      {
        title: "Scriptural commentaries and liturgical translations",
        detail:
          "Published through OCA / St Vladimir's Seminary Press; individual titles should be verified before listing.",
      },
    ],
    worksAbout: [
      {
        title: "OCA Diocese of the South — biographical profile",
        detail: "The diocese's account of his life and ministry.",
      },
      {
        title: "St Seraphim Orthodox Cathedral (Dallas) — memorial",
        detail:
          "Memorial materials at the cathedral where he served and is buried.",
      },
    ],
    related: [
      {
        name: "OCA Diocese of the South",
        note: "The mission diocese he founded and led from Dallas.",
      },
      {
        name: "St Seraphim Orthodox Cathedral, Dallas",
        note: "His cathedral and place of burial.",
      },
      {
        name: "Metropolitan Jonah (Paffhausen)",
        note: "A spiritual son who later became Metropolitan of the OCA.",
      },
    ],
    significance: [
      "Archbishop Dmitri was one of the most important missionary hierarchs for English-speaking Orthodoxy in the United States — an early American convert bishop whose decades of patient church-planting gave the Orthodox South much of its present shape.",
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
    secularName: "Born Princess Ileana of Romania",
    jurisdiction: "OCA — Monastery of the Transfiguration, Ellwood City, PA",
    railFacts: [
      ["Lived", "1909 – 1991"],
      ["Born", "Bucharest, Romania"],
      ["Reposed", "Youngstown, Ohio"],
      ["Tradition", "Romanian-American · OCA"],
      ["Era", "Modern · 20th c."],
    ],
    knownFor: "Founding English-language women's monasticism in America",
    overview: [
      "Mother Alexandra was born Princess Ileana of Romania on January 5, 1909, in Bucharest, daughter of King Ferdinand and Queen Marie. Her early life was one of royal duty, wartime service, and, after the fall of the monarchy, exile.",
      "In her later years she embraced the monastic life, receiving the name Alexandra. In 1967 she founded the Orthodox Monastery of the Transfiguration in Ellwood City, Pennsylvania, envisioned as an English-language monastic home open to Orthodox women of every background. She served as its abbess until her retirement in 1981.",
      "She reposed on January 21, 1991, and is buried at the monastery she founded. At her own request her gravestone bears the words of Romans 14:7–8.",
    ],
    timeline: [
      {
        when: "1909",
        title: "Born a princess of Romania",
        body: "Princess Ileana is born in Bucharest, daughter of King Ferdinand and Queen Marie of Romania.",
        source: "https://www.orthodoxmonasteryellwoodcity.org/about/foundress",
      },
      {
        when: "1920s–40s",
        title: "Royal and wartime service",
        body: "She serves her country, including humanitarian and wartime work, before the communist takeover.",
        source: "https://www.orthodoxmonasteryellwoodcity.org/about/foundress",
      },
      {
        when: "after 1948",
        title: "Exile",
        body: "With the abolition of the Romanian monarchy she goes into exile, eventually settling in the United States.",
        source: "https://www.orthodoxmonasteryellwoodcity.org/about/foundress",
      },
      {
        when: "1960s",
        title: "Monastic tonsure",
        body: "She embraces the monastic life and is tonsured, receiving the name Alexandra.",
        source: "https://www.orthodoxmonasteryellwoodcity.org/about/foundress",
      },
      {
        when: "1967",
        title: "Founds the Monastery of the Transfiguration",
        body: "She establishes the Orthodox Monastery of the Transfiguration in Ellwood City, Pennsylvania, as an English-language home for Orthodox women.",
        source: "https://www.orthodoxmonasteryellwoodcity.org/about/foundress",
      },
      {
        when: "1981",
        title: "Retires as abbess",
        body: "She steps down from the leadership of the monastery she founded.",
        source: "https://www.orthodoxmonasteryellwoodcity.org/about/foundress",
      },
      {
        when: "1991",
        title: "Repose in the Lord",
        body: "Mother Alexandra reposes on January 21, 1991, and is buried at the monastery.",
        source:
          "https://www.oca.org/news/headline-news/remembering-mother-alexandra",
      },
    ],
    worksBy: [
      {
        title: "I Live Again",
        detail: "Her memoir of life as a princess of Romania, war, and exile.",
      },
      {
        title: "The Holy Angels",
        detail: "A book on the angels in the Orthodox tradition.",
      },
    ],
    worksAbout: [
      {
        title: "Royal Monastic: A Biography of Mother Alexandra",
        detail:
          "A biographical account of Princess Ileana's path to monasticism.",
      },
    ],
    related: [
      {
        name: "Queen Marie of Romania",
        note: "Her mother; a defining figure of early-twentieth-century Romania.",
      },
      {
        name: "Monastery of the Transfiguration, Ellwood City",
        note: "The English-language women's monastery she founded in 1967.",
      },
    ],
    significance: [
      "Mother Alexandra is a foundational figure for English-language women's monasticism in North America — a princess who exchanged a royal life for the monastic one and gave Orthodox women on the continent a home of prayer of their own.",
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
    secularName: "Thomas John Hopko",
    jurisdiction: "Orthodox Church in America — St Vladimir's Seminary",
    railFacts: [
      ["Lived", "1939 – 2015"],
      ["Born", "Endicott, New York"],
      ["Reposed", "Wexford, Pennsylvania"],
      ["Tradition", "American · OCA"],
      ["Era", "Modern · 20th–21st c."],
    ],
    knownFor: "Accessible English-language Orthodox catechesis",
    overview: [
      "Protopresbyter Thomas Hopko was born on March 28, 1939, in Endicott, New York. He studied at Fordham University, St Vladimir's Orthodox Theological Seminary, and Duquesne University, later earning a doctorate from Fordham.",
      "He taught dogmatic theology at St Vladimir's Seminary for many years and served as its dean from 1992 to 2002. Through his books, lectures, and recordings — including his widely circulated “55 Maxims” for the Christian life — he became one of the most influential and accessible English-language Orthodox teachers of his generation.",
      "He reposed on March 18, 2015, in Wexford, Pennsylvania.",
    ],
    timeline: [
      {
        when: "1939",
        title: "Born in New York",
        body: "Thomas John Hopko is born on March 28, 1939, in Endicott, New York.",
        source: "https://www.svots.edu/people/protopresbyter-thomas-hopko",
      },
      {
        when: "1960",
        title: "Fordham University",
        body: "He completes his undergraduate studies at Fordham University.",
        source: "https://orthodoxwiki.org/Thomas_Hopko",
      },
      {
        when: "1960s",
        title: "Seminary and ordination",
        body: "He studies at St Vladimir's Seminary and is ordained to the priesthood, beginning his pastoral and teaching ministry.",
        source: "https://orthodoxwiki.org/Thomas_Hopko",
      },
      {
        when: "1969",
        title: "Duquesne University (M.A.)",
        body: "He earns a master's degree from Duquesne University.",
        source: "https://orthodoxwiki.org/Thomas_Hopko",
      },
      {
        when: "1982",
        title: "Doctorate from Fordham",
        body: "He completes his doctorate at Fordham University.",
        source: "https://orthodoxwiki.org/Thomas_Hopko",
      },
      {
        when: "1992–2002",
        title: "Dean of St Vladimir's Seminary",
        body: "He serves as dean of St Vladimir's Orthodox Theological Seminary.",
        source: "https://www.svots.edu/people/protopresbyter-thomas-hopko",
      },
      {
        when: "2015",
        title: "Repose in the Lord",
        body: "Father Thomas reposes on March 18, 2015, in Wexford, Pennsylvania.",
        source: "https://www.svots.edu/people/protopresbyter-thomas-hopko",
      },
    ],
    worksBy: [
      {
        title: "The Orthodox Faith",
        detail:
          "A four-volume catechetical series (Doctrine, Worship, Bible & Church History, Spirituality).",
      },
      {
        title: "The Lenten Spring",
        detail: "Reflections for the season of Great Lent.",
      },
      {
        title: "Christian Faith and Same-Sex Attraction",
        detail: "A pastoral treatment of a contemporary question.",
      },
      {
        title: "If We Confess Our Sins",
        detail: "On repentance and confession.",
      },
      {
        title: "The 55 Maxims",
        detail:
          "His widely shared list of practical counsels for the Christian life.",
      },
    ],
    worksAbout: [
      {
        title: "St Vladimir's Seminary — memorial pages",
        detail: "Remembrances of his life, teaching, and deanship.",
        source: "https://www.svots.edu/people/protopresbyter-thomas-hopko",
      },
    ],
    related: [
      {
        name: "Fr Alexander Schmemann",
        note: "His teacher, father-in-law, and predecessor in shaping Orthodox theological education in America.",
        href: "witness/alexander-schmemann",
      },
      {
        name: "St Vladimir's Orthodox Theological Seminary",
        note: "Where he taught for decades and served as dean.",
      },
      {
        name: "Ancient Faith Ministries",
        note: "The platform through which many of his talks reached a wide audience.",
      },
    ],
    significance: [
      "Father Thomas Hopko was perhaps the most accessible Orthodox catechist for modern English-speaking Christians — a teacher whose clarity, warmth, and economy of words formed clergy, converts, and laity far beyond the seminary classroom.",
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
    secularName: "Priest, missionary, and Alaska Native cultural historian",
    jurisdiction: "Orthodox Church in America — Diocese of Alaska",
    railFacts: [
      ["Lived", "1947 – 2023"],
      ["Served", "Alaska (50+ years)"],
      ["Reposed", "Alaska"],
      ["Tradition", "American · OCA"],
      ["Era", "Modern · 20th–21st c."],
    ],
    knownFor: "Alaska Native cultures and Orthodox mission history",
    overview: [
      "Father Michael Oleksa was born on March 16, 1947. In 1970 he came to Alaska, beginning some five decades of service in which he ministered in more than a dozen Alaska Native villages.",
      "He became widely known as a historian, linguist, educator, and advocate for Alaska Native peoples, with major work on intercultural communication and on the long history of Orthodox Christianity in Alaska. He taught and lectured across the state and beyond.",
      "His repose on November 29, 2023, was marked by the OCA and St Vladimir's Seminary as the loss of a major missionary scholar of Alaskan Orthodoxy.",
    ],
    timeline: [
      {
        when: "1947",
        title: "Born",
        body: "Michael Oleksa is born on March 16, 1947.",
        source: "https://en.wikipedia.org/wiki/Michael_Oleksa",
      },
      {
        when: "1970",
        title: "Comes to Alaska",
        body: "He arrives in Alaska, beginning decades of service among Alaska Native communities.",
        source: "https://en.wikipedia.org/wiki/Michael_Oleksa",
      },
      {
        when: "1970s–2010s",
        title: "Village ministry and scholarship",
        body: "He serves in more than a dozen Native villages and becomes a leading educator, linguist, and historian of Alaskan Orthodoxy and Native cultures.",
        source: "https://www.oca.org/in-memoriam/archpriest-michael-oleksa",
      },
      {
        when: "2023",
        title: "Repose in the Lord",
        body: "Father Michael reposes on November 29, 2023.",
        source: "https://www.oca.org/in-memoriam/archpriest-michael-oleksa",
      },
    ],
    worksBy: [
      {
        title: "Orthodox Alaska: A Theology of Mission",
        detail: "His study of the Orthodox missionary tradition in Alaska.",
      },
      {
        title: "Another Culture / Another World",
        detail: "On intercultural communication and Alaska Native life.",
      },
      {
        title: "Writings on Alaska Native cultures and Orthodox mission",
        detail: "Essays, lectures, and educational materials.",
      },
    ],
    worksAbout: [
      {
        title: "OCA — In Memoriam: Archpriest Michael Oleksa",
        detail: "The OCA's memorial account of his life and work.",
        source: "https://www.oca.org/in-memoriam/archpriest-michael-oleksa",
      },
      {
        title: "St Vladimir's Seminary — remembrances",
        detail: "Seminary tributes marking his repose.",
      },
    ],
    related: [
      {
        name: "St Herman of Alaska",
        note: "The first canonized saint of America, whose Alaskan mission Fr Michael interpreted for new generations.",
        href: "saint/OS-0044",
      },
      {
        name: "St Innocent of Alaska",
        note: "Apostle to America and Alaska, a central figure in the history Fr Michael studied.",
        href: "saint/OS-0054",
      },
      {
        name: "St Herman Theological Seminary (Kodiak)",
        note: "The Alaskan seminary serving the Native Orthodox communities he loved.",
      },
    ],
    significance: [
      "Father Michael Oleksa was one of the central interpreters of Alaskan Orthodox mission — especially from the perspective of the Native communities themselves — helping the wider Church understand its own history as a meeting of the Gospel with the peoples and cultures of the far North.",
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
      {
        label: "OrthodoxWiki: Alexander Schmemann",
        url: "https://orthodoxwiki.org/Alexander_Schmemann",
      },
      {
        label: "Wikipedia: Alexander Schmemann",
        url: "https://en.wikipedia.org/wiki/Alexander_Schmemann",
      },
    ],
    secularName: "Alexander Dmitrievich Schmemann",
    jurisdiction: "Orthodox Church in America — St Vladimir's Seminary",
    railFacts: [
      ["Lived", "1921 – 1983"],
      ["Born", "Tallinn, Estonia"],
      ["Reposed", "Crestwood, New York"],
      ["Tradition", "Russian émigré · OCA"],
      ["Era", "Modern · 20th c."],
    ],
    knownFor: "Renewing Orthodox liturgical theology in the West",
    overview: [
      "Protopresbyter Alexander Schmemann was born on September 13, 1921, in Tallinn, Estonia, and grew up in the Russian émigré world of France. He studied and then taught at the St Sergius Orthodox Theological Institute in Paris before moving to the United States in 1951 to teach at St Vladimir's Seminary.",
      "He became dean of St Vladimir's in 1962 and served until his death. At the heart of his theology was the conviction that the liturgy is the living expression of the Church's faith — the world received back as gift and Eucharist. His most famous book, For the Life of the World, carried this vision to a wide readership.",
      "For decades his Radio Liberty broadcasts reached listeners behind the Iron Curtain, among them Alexander Solzhenitsyn. He played a central role in the life of the newly autocephalous Orthodox Church in America. He reposed on December 13, 1983.",
    ],
    timeline: [
      {
        when: "1921",
        title: "Born in Estonia",
        body: "Alexander Schmemann is born on September 13, 1921, in Tallinn, into the Russian émigré world.",
        source: "https://orthodoxwiki.org/Alexander_Schmemann",
      },
      {
        when: "1946",
        title: "Ordained priest in Paris",
        body: "After studies at the St Sergius Institute he is ordained to the priesthood.",
        source: "https://orthodoxwiki.org/Alexander_Schmemann",
      },
      {
        when: "1951",
        title: "Moves to the United States",
        body: "He joins the faculty of St Vladimir's Seminary in New York.",
        source:
          "https://www.svots.edu/content/protopresbyter-alexander-schmemann",
      },
      {
        when: "1962",
        title: "Dean of St Vladimir's Seminary",
        body: "He becomes dean, a post he holds until his death, shaping a generation of Orthodox clergy and theologians.",
        source:
          "https://www.svots.edu/content/protopresbyter-alexander-schmemann",
      },
      {
        when: "1970",
        title: "Autocephaly of the OCA",
        body: "He is a leading figure in the establishment of the autocephalous Orthodox Church in America.",
        source: "https://en.wikipedia.org/wiki/Alexander_Schmemann",
      },
      {
        when: "1983",
        title: "Repose in the Lord",
        body: "Father Alexander reposes on December 13, 1983.",
        source:
          "https://www.svots.edu/content/protopresbyter-alexander-schmemann",
      },
    ],
    worksBy: [
      {
        title: "For the Life of the World",
        detail: "His best-known work, on sacrament and the world as Eucharist.",
      },
      {
        title: "Great Lent",
        detail: "A study of the Lenten journey of the Church.",
      },
      {
        title: "Introduction to Liturgical Theology",
        detail:
          "A foundational scholarly work on the development of the liturgy.",
      },
      {
        title: "The Eucharist: Sacrament of the Kingdom",
        detail: "His mature synthesis on the Divine Liturgy.",
      },
      {
        title: "The Historical Road of Eastern Orthodoxy",
        detail: "A survey of Orthodox church history.",
      },
      {
        title: "The Journals of Father Alexander Schmemann, 1973–1983",
        detail: "His posthumously published personal journals.",
      },
    ],
    worksAbout: [
      {
        title: "St Vladimir's Seminary — memorial profile",
        detail: "The seminary's account of his life and deanship.",
        source:
          "https://www.svots.edu/content/protopresbyter-alexander-schmemann",
      },
    ],
    related: [
      {
        name: "Fr Georges Florovsky",
        note: "His older colleague at St Vladimir's and a shaping influence on émigré theology.",
        href: "witness/georges-florovsky",
      },
      {
        name: "Fr John Meyendorff",
        note: "His colleague and successor as dean of St Vladimir's Seminary.",
        href: "witness/john-meyendorff",
      },
      {
        name: "Fr Thomas Hopko",
        note: "His student and son-in-law, who carried his catechetical vision to a wide audience.",
        href: "witness/thomas-hopko",
      },
      {
        name: "Alexander Solzhenitsyn",
        note: "The Russian writer who listened to his Radio Liberty broadcasts from the Soviet Union.",
      },
    ],
    significance: [
      "Father Alexander Schmemann is a defining voice of modern Orthodox liturgical theology in the English-speaking world — a teacher who helped the Church in America recover the Eucharist as the source and goal of its life.",
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
    secularName: "Georges Vasilievich Florovsky",
    jurisdiction: "Russian Orthodox émigré; North American academic Orthodoxy",
    railFacts: [
      ["Lived", "1893 – 1979"],
      ["Born", "Russian Empire (sources vary)"],
      ["Reposed", "Princeton, New Jersey"],
      ["Tradition", "Russian émigré"],
      ["Era", "Modern · 20th c."],
    ],
    knownFor: "The “neo-patristic synthesis”",
    overview: [
      "Father Georges Florovsky was born on September 9, 1893, in the Russian Empire — sources differ as to the exact place, giving either Odessa or the Yelisavetgrad region — and was raised in an intellectually rich Orthodox priestly household. He became one of the major theologians of the Russian émigré world.",
      "Following the Russian Revolution he emigrated, working in the theological centres of the diaspora, and came to the United States in the late 1940s. He taught at St Vladimir's Seminary — including as dean (the exact years are given variously by different sources, c. 1948/1951–1955) — and later at Harvard and Princeton.",
      "He is especially associated with the call for a “neo-patristic synthesis”: a return of Orthodox theology to the mind of the Fathers rather than to modern Western categories. He reposed in Princeton, New Jersey, on August 11, 1979.",
    ],
    timeline: [
      {
        when: "1893",
        title: "Born in the Russian Empire",
        body: "Georges Florovsky is born on September 9, 1893; sources differ on whether his birthplace was Odessa or the Yelisavetgrad region.",
        source: "https://en.wikipedia.org/wiki/Georges_Florovsky",
      },
      {
        when: "1916",
        title: "University graduation",
        body: "He completes his university studies in the Russian Empire.",
        source: "https://en.wikipedia.org/wiki/Georges_Florovsky",
      },
      {
        when: "1920s–30s",
        title: "Émigré theologian in Europe",
        body: "After the Revolution he emigrates and becomes a leading theologian in the Russian diaspora, notably in Paris.",
        source: "https://orthodoxwiki.org/Georges_Florovsky",
      },
      {
        when: "late 1940s",
        title: "Comes to the United States",
        body: "He joins St Vladimir's Seminary, where he serves as professor and, for a period, dean (exact years given variously by sources).",
        source:
          "https://library.svots.edu/index.php/archival-collections/fr-georges-florovsky-papers",
      },
      {
        when: "1950s–60s",
        title: "Harvard and Princeton",
        body: "He teaches at Harvard University and Princeton, becoming a major figure in Orthodox academic life in America.",
        source: "https://en.wikipedia.org/wiki/Georges_Florovsky",
      },
      {
        when: "1979",
        title: "Repose in the Lord",
        body: "Father Georges reposes in Princeton, New Jersey, on August 11, 1979.",
        source: "https://en.wikipedia.org/wiki/Georges_Florovsky",
      },
    ],
    worksBy: [
      {
        title: "Collected Works of Georges Florovsky",
        detail: "The multi-volume English edition of his theological writings.",
      },
      {
        title: "Ways of Russian Theology",
        detail: "His landmark critical history of Russian theological thought.",
      },
      {
        title: "“The Lost Scriptural Mind”",
        detail: "A programmatic essay on recovering the patristic mind.",
      },
    ],
    worksAbout: [
      {
        title: "Georges Florovsky: Russian Intellectual and Orthodox Churchman",
        detail: "Edited by Andrew Blane — the standard biographical study.",
      },
      {
        title: "Scholarship by George Demacopoulos and Aristotle Papanikolaou",
        detail: "Modern academic studies of his thought and legacy.",
      },
      {
        title: "St Vladimir's Seminary Library — Fr Georges Florovsky Papers",
        detail: "His archival collection.",
        source:
          "https://library.svots.edu/index.php/archival-collections/fr-georges-florovsky-papers",
      },
    ],
    related: [
      {
        name: "Vladimir Lossky",
        note: "A fellow émigré theologian, sometimes in dialogue and tension with Florovsky's program.",
      },
      {
        name: "Fr Sergei Bulgakov",
        note: "The émigré theologian whose sophiology Florovsky's neo-patristic synthesis pointedly countered.",
      },
      {
        name: "Fr Alexander Schmemann",
        note: "His younger colleague at St Vladimir's Seminary.",
        href: "witness/alexander-schmemann",
      },
      {
        name: "Fr John Meyendorff",
        note: "His colleague in the émigré and American Orthodox academic world.",
        href: "witness/john-meyendorff",
      },
    ],
    significance: [
      "Father Georges Florovsky was one of the most influential Orthodox theologians of the twentieth century and a major force in Orthodox academic life in America — the man who, more than any other, summoned modern Orthodoxy back to the Fathers.",
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
    secularName: "Born Jean (Ivan) Meyendorff",
    jurisdiction: "Orthodox Church in America — St Vladimir's Seminary",
    railFacts: [
      ["Lived", "1926 – 1992"],
      ["Born", "Neuilly-sur-Seine, France"],
      ["Reposed", "Montreal, Canada"],
      ["Tradition", "Russian émigré · OCA"],
      ["Era", "Modern · 20th c."],
    ],
    knownFor: "St Gregory Palamas and Byzantine theology",
    overview: [
      "Protopresbyter John Meyendorff was born on February 17, 1926, in Neuilly-sur-Seine, France, into the Russian emigration. He was educated in France, completing his theological studies at the St Sergius Institute and advanced studies at the Sorbonne.",
      "He joined the faculty of St Vladimir's Seminary, where he taught church history and patristics, edited major Orthodox publications, and served as dean from 1984 until shortly before his death. His scholarship on St Gregory Palamas and Byzantine theology became foundational for English-speaking Orthodox theological education.",
      "He reposed in Montreal, Canada, on July 22, 1992.",
    ],
    timeline: [
      {
        when: "1926",
        title: "Born near Paris",
        body: "John Meyendorff is born on February 17, 1926, in Neuilly-sur-Seine, France.",
        source: "https://orthodoxwiki.org/John_Meyendorff",
      },
      {
        when: "1949",
        title: "Theological studies at St Sergius",
        body: "He completes his theological education at the St Sergius Institute in Paris.",
        source: "https://orthodoxwiki.org/John_Meyendorff",
      },
      {
        when: "1958",
        title: "Doctorate",
        body: "He completes his doctoral work, centred on St Gregory Palamas, in France.",
        source: "https://en.wikipedia.org/wiki/John_Meyendorff",
      },
      {
        when: "1959",
        title: "Joins St Vladimir's Seminary",
        body: "He moves to the United States and joins the faculty of St Vladimir's Seminary, teaching patristics and church history.",
        source:
          "https://www.svots.edu/headlines/remembering-protopresbyter-john-meyendorff-february-17-1926-july-22-1992",
      },
      {
        when: "1984",
        title: "Dean of St Vladimir's Seminary",
        body: "He becomes dean, succeeding Fr Alexander Schmemann, and leads the seminary until shortly before his death.",
        source:
          "https://www.svots.edu/headlines/remembering-protopresbyter-john-meyendorff-february-17-1926-july-22-1992",
      },
      {
        when: "1992",
        title: "Repose in the Lord",
        body: "Father John reposes in Montreal on July 22, 1992.",
        source:
          "https://www.svots.edu/headlines/remembering-protopresbyter-john-meyendorff-february-17-1926-july-22-1992",
      },
    ],
    worksBy: [
      {
        title: "A Study of Gregory Palamas",
        detail:
          "His landmark study that helped recover Palamite theology for the modern Church.",
      },
      {
        title: "Byzantine Theology: Historical Trends and Doctrinal Themes",
        detail: "A standard survey of Byzantine theological development.",
      },
      {
        title: "The Orthodox Church: Its Past and Its Role in the World Today",
        detail: "An accessible history and overview of Orthodoxy.",
      },
      {
        title: "Christ in Eastern Christian Thought",
        detail: "On the development of Christology in the East.",
      },
      {
        title: "Marriage: An Orthodox Perspective",
        detail: "A short, widely used pastoral study.",
      },
    ],
    worksAbout: [
      {
        title:
          "St Vladimir's Seminary — Remembering Protopresbyter John Meyendorff",
        detail: "The seminary's memorial profile.",
        source:
          "https://www.svots.edu/headlines/remembering-protopresbyter-john-meyendorff-february-17-1926-july-22-1992",
      },
      {
        title: "Orthodox History — remembrance",
        detail: "Historical remembrances of his life and scholarship.",
      },
    ],
    related: [
      {
        name: "Fr Alexander Schmemann",
        note: "His colleague and predecessor as dean of St Vladimir's Seminary.",
        href: "witness/alexander-schmemann",
      },
      {
        name: "Fr Georges Florovsky",
        note: "The elder theologian whose neo-patristic program shaped Meyendorff's generation.",
        href: "witness/georges-florovsky",
      },
      {
        name: "St Gregory Palamas",
        note: "The 14th-century hesychast theologian whose thought Meyendorff did most to recover.",
        href: "saint/OS-0025",
      },
      {
        name: "Syndesmos",
        note: "The world fellowship of Orthodox youth he helped lead in his earlier years.",
      },
    ],
    significance: [
      "Father John Meyendorff was a major patristic and Byzantine scholar who helped define Orthodox theological education in North America — and, through his work on St Gregory Palamas, restored hesychasm to the centre of the modern Orthodox self-understanding.",
    ],
  },
  {
    slug: "philip-saliba",
    name: "Metropolitan Philip",
    epithet: "Saliba",
    role: "Antiochian Hierarch",
    years: "1931 – 2014",
    place: "Antiochian Archdiocese of North America, Englewood, New Jersey",
    bio: [
      "The long-serving Metropolitan of the Antiochian Orthodox Christian Archdiocese of North America, who led it through decades of dramatic growth and, in 1987, received a large body of former evangelicals into the Orthodox Church.",
    ],
    sources: [
      {
        label: "Wikipedia: Philip Saliba",
        url: "https://en.wikipedia.org/wiki/Philip_Saliba",
      },
      {
        label: "OrthodoxWiki: Philip (Saliba)",
        url: "https://orthodoxwiki.org/Philip_(Saliba)",
      },
      {
        label: "Antiochian Orthodox Christian Archdiocese of North America",
        url: "https://www.antiochian.org",
      },
    ],
    secularName: "Antiochian Orthodox hierarch of North America",
    jurisdiction: "Antiochian Orthodox Christian Archdiocese of North America",
    railFacts: [
      ["Lived", "1931 – 2014"],
      ["Born", "Abou-Mizan, Lebanon"],
      ["See", "Englewood, New Jersey"],
      ["Tradition", "Antiochian"],
      ["Era", "Modern · 20th–21st c."],
    ],
    knownFor: "Antiochian growth and the reception of converts",
    overview: [
      "Metropolitan Philip (Saliba) was born on June 10, 1931, in Abou-Mizan, Lebanon. After theological studies he emigrated to the United States, where he was ordained and served in the Antiochian Archdiocese.",
      "In 1966 he was elected Metropolitan of the Antiochian Orthodox Christian Archdiocese of North America, an office he held for nearly half a century. Under his leadership the Archdiocese expanded dramatically in parishes, clergy, and institutions, founding the Antiochian Village in Pennsylvania (1978) as a centre for camping, conferences, and heritage.",
      "He is especially remembered for the 1987 reception of the Evangelical Orthodox Church — some two thousand former evangelical Protestants — into canonical Orthodoxy, which made the Archdiocese a notable home for converts. He reposed on March 19, 2014, after nearly forty-eight years leading the Archdiocese.",
    ],
    timeline: [
      {
        when: "1931",
        title: "Born in Lebanon",
        body: "Philip Saliba is born on June 10, 1931, in Abou-Mizan, Lebanon.",
        source: "https://en.wikipedia.org/wiki/Philip_Saliba",
      },
      {
        when: "1950s",
        title: "Studies and emigration to the United States",
        body: "After theological studies he emigrates to the United States and is ordained to serve in the Antiochian Archdiocese.",
        source: "https://en.wikipedia.org/wiki/Philip_Saliba",
      },
      {
        when: "1966",
        title: "Elected Metropolitan",
        body: "He is elected Metropolitan of the Antiochian Orthodox Christian Archdiocese of North America.",
        source: "https://en.wikipedia.org/wiki/Philip_Saliba",
      },
      {
        when: "1978",
        title: "Antiochian Village founded",
        body: "He establishes the Antiochian Village in Bolivar, Pennsylvania, as a camp, conference, and heritage centre for the Archdiocese.",
        source: "https://en.wikipedia.org/wiki/Philip_Saliba",
      },
      {
        when: "1987",
        title: "Reception of the Evangelical Orthodox",
        body: "He receives the Evangelical Orthodox Church — some two thousand former evangelicals — into canonical Orthodoxy through the Archdiocese.",
        source: "https://en.wikipedia.org/wiki/Philip_Saliba",
      },
      {
        when: "2014",
        title: "Repose in the Lord",
        body: "Metropolitan Philip reposes on March 19, 2014, after nearly half a century leading the Archdiocese.",
        source: "https://en.wikipedia.org/wiki/Philip_Saliba",
      },
    ],
    worksBy: [
      {
        title: "Editorials and addresses in The Word magazine",
        detail:
          "His pastoral writing as Metropolitan; individual published titles should be verified.",
      },
    ],
    worksAbout: [
      {
        title: "Antiochian Archdiocese — memorial materials",
        detail:
          "Memorial accounts and remembrances published by the Archdiocese.",
        source: "https://www.antiochian.org",
      },
    ],
    related: [
      {
        name: "St Raphael of Brooklyn",
        note: "The first Orthodox bishop consecrated in North America, of the same Antiochian tradition.",
        href: "saint/OS-0055",
      },
      {
        name: "Antiochian Orthodox Christian Archdiocese of North America",
        note: "The jurisdiction he led from 1966 until his repose.",
      },
      {
        name: "The Antiochian Village, Bolivar, Pennsylvania",
        note: "The camp and conference centre he founded in 1978.",
      },
    ],
    significance: [
      "Metropolitan Philip is remembered as the architect of the modern Antiochian Archdiocese in North America — under whom it grew dramatically and, through the reception of a large body of former evangelicals, became a notable home for converts to the Orthodox faith.",
    ],
  },
  {
    slug: "basil-rodzianko",
    name: "Bishop Basil",
    epithet: "Rodzianko",
    role: "Bishop & Radio Missionary",
    years: "1915 – 1999",
    place: "Washington, D.C.",
    bio: [
      "A Russian émigré bishop whose decades of radio broadcasts carried the Gospel to listeners across the Soviet Union, and who served his last years as an OCA bishop in America.",
    ],
    sources: [
      {
        label: "Wikipedia: Basil (Rodzianko)",
        url: "https://en.wikipedia.org/wiki/Basil_(Rodzianko)",
      },
      {
        label: "OrthodoxWiki: Basil (Rodzianko)",
        url: "https://orthodoxwiki.org/Basil_(Rodzianko)",
      },
    ],
    secularName: "Born Vladimir Mikhailovich Rodzianko",
    jurisdiction:
      "Orthodox Church in America (earlier ministry in the Serbian Orthodox Church)",
    railFacts: [
      ["Lived", "1915 – 1999"],
      ["Born", "Russian Empire"],
      ["Reposed", "Washington, D.C."],
      ["Tradition", "Russian émigré · OCA"],
      ["Era", "Modern · 20th c."],
    ],
    knownFor: "Radio preaching to the Soviet Union",
    overview: [
      "Bishop Basil was born Vladimir Mikhailovich Rodzianko on May 22, 1915, into a prominent Russian family — he was a grandson of Mikhail Rodzianko, the last chairman of the Imperial State Duma. After the Revolution his family lived in emigration, and he was raised and educated in the Serbian lands.",
      "He was ordained a priest in the Serbian Orthodox Church and served as a parish pastor. Under the communist Yugoslav regime he was imprisoned for his ministry before being released and emigrating. For many years he worked with the BBC's Russian service, broadcasting religious programmes that reached countless listeners across the Soviet Union.",
      "After the death of his wife he was tonsured a monk, and in 1980 he was consecrated a bishop of the Orthodox Church in America, serving as Bishop of Washington until his retirement in 1984. He continued to preach and broadcast, including to a newly opening post-Soviet Russia, until his repose in Washington, D.C., on September 17, 1999.",
    ],
    timeline: [
      {
        when: "1915",
        title: "Born into the Rodzianko family",
        body: "Vladimir Rodzianko is born on May 22, 1915, a grandson of the chairman of the Imperial State Duma.",
        source: "https://en.wikipedia.org/wiki/Basil_(Rodzianko)",
      },
      {
        when: "1920s–40s",
        title: "Émigré upbringing and ordination",
        body: "Raised in emigration in the Serbian lands, he is ordained a priest in the Serbian Orthodox Church and serves a parish.",
        source: "https://en.wikipedia.org/wiki/Basil_(Rodzianko)",
      },
      {
        when: "after 1945",
        title: "Imprisonment and emigration",
        body: "Under the communist Yugoslav regime he is imprisoned for his pastoral work; after his release he emigrates westward.",
        source: "https://en.wikipedia.org/wiki/Basil_(Rodzianko)",
      },
      {
        when: "1950s–70s",
        title: "BBC Russian-service broadcasts",
        body: "He works with the BBC's Russian service, broadcasting religious programmes that reach listeners throughout the Soviet Union.",
        source: "https://en.wikipedia.org/wiki/Basil_(Rodzianko)",
      },
      {
        when: "1980",
        title: "Tonsured monk and consecrated bishop",
        body: "After the death of his wife he becomes a monk and is consecrated a bishop of the Orthodox Church in America.",
        source: "https://orthodoxwiki.org/Basil_(Rodzianko)",
      },
      {
        when: "1980–1984",
        title: "Bishop of Washington",
        body: "He serves as the OCA Bishop of Washington until his retirement, after which he continues to preach and broadcast.",
        source: "https://orthodoxwiki.org/Basil_(Rodzianko)",
      },
      {
        when: "1999",
        title: "Repose in the Lord",
        body: "Bishop Basil reposes in Washington, D.C., on September 17, 1999.",
        source: "https://en.wikipedia.org/wiki/Basil_(Rodzianko)",
      },
    ],
    worksBy: [
      {
        title: "Radio sermons, talks, and catechetical broadcasts",
        detail:
          "His BBC and later Russian-language religious programmes; individual recordings and transcripts should be verified before listing.",
      },
    ],
    worksAbout: [
      {
        title: "OrthodoxWiki / Wikipedia biographical accounts",
        detail: "Encyclopedic accounts of his life and broadcasting ministry.",
        source: "https://orthodoxwiki.org/Basil_(Rodzianko)",
      },
    ],
    related: [
      {
        name: "Orthodox Church in America — Diocese of Washington",
        note: "The jurisdiction in which he served as bishop from 1980 to 1984.",
      },
      {
        name: "Mikhail Rodzianko",
        note: "His grandfather, the last chairman of the Imperial Russian State Duma.",
      },
    ],
    significance: [
      "Bishop Basil is remembered above all as a voice of the Gospel to the Soviet Union — whose decades of radio preaching reached countless listeners cut off from the Church — and as a gentle pastor in his American years.",
    ],
  },
  {
    slug: "john-romanides",
    name: "Fr. John Romanides",
    epithet: "",
    role: "Priest & Theologian",
    years: "1927 – 2001",
    place: "Athens, Greece",
    bio: [
      "A Greek-American priest and theologian, raised in New York, who became an influential and controversial voice in modern Orthodox thought — known for his sharp distinction between the Orthodox East and the Frankish-Augustinian West and for his emphasis on the patristic “cure of the soul.”",
    ],
    sources: [
      {
        label: "Wikipedia: John Romanides",
        url: "https://en.wikipedia.org/wiki/John_Romanides",
      },
      {
        label: "OrthodoxWiki: John Romanides",
        url: "https://orthodoxwiki.org/John_Romanides",
      },
      {
        label: "Romanity — archive of the works of Fr John Romanides",
        url: "https://www.romanity.org",
      },
    ],
    secularName: "Greek-American patristic theologian",
    jurisdiction:
      "Greek Orthodox Archdiocese of America / Church of Greece; academic theology",
    railFacts: [
      ["Lived", "1927 – 2001"],
      ["Born", "Piraeus, Greece (raised in New York)"],
      ["Reposed", "Athens, Greece"],
      ["Tradition", "Greek · Greek-American"],
      ["Era", "Modern · 20th–21st c."],
    ],
    knownFor: "Patristic theology and the East–West critique",
    overview: [
      "Father John Romanides was born on March 2, 1927, in Piraeus, Greece. While he was still an infant his family emigrated to the United States, and he was raised in Manhattan, New York.",
      "He studied at Hellenic College and Holy Cross Greek Orthodox School of Theology, at Yale Divinity School, and at the University of Athens, where his doctoral dissertation, The Ancestral Sin, set out themes he would develop for the rest of his career. He was ordained a priest and went on to teach dogmatic theology, most notably as professor at the University of Thessaloniki, while also lecturing in North America.",
      "He is remembered for a forceful body of work contrasting the experiential, therapeutic theology of the Greek Fathers with what he called the “Frankish” or Augustinian theology of the West, and for his emphasis on hesychasm as the heart of Orthodox life. He reposed in Athens, Greece, on November 1, 2001.",
    ],
    timeline: [
      {
        when: "1927",
        title: "Born in Greece; family emigrates to New York",
        body: "John Romanides is born on March 2, 1927, in Piraeus; his family soon emigrates to the United States, settling in Manhattan.",
        source: "https://en.wikipedia.org/wiki/John_Romanides",
      },
      {
        when: "1940s–50s",
        title: "Theological studies",
        body: "He studies at Hellenic College / Holy Cross, at Yale Divinity School, and at the University of Athens.",
        source: "https://en.wikipedia.org/wiki/John_Romanides",
      },
      {
        when: "1957",
        title: "Doctorate — “The Ancestral Sin”",
        body: "He completes his doctoral dissertation at the University of Athens, a study that becomes foundational for his later theology.",
        source: "https://en.wikipedia.org/wiki/John_Romanides",
      },
      {
        when: "1968–1982",
        title: "Professor at the University of Thessaloniki",
        body: "He serves as professor of dogmatic theology at the University of Thessaloniki, while also teaching and lecturing in North America.",
        source: "https://en.wikipedia.org/wiki/John_Romanides",
      },
      {
        when: "2001",
        title: "Repose in the Lord",
        body: "Father John reposes in Athens, Greece, on November 1, 2001.",
        source: "https://en.wikipedia.org/wiki/John_Romanides",
      },
    ],
    worksBy: [
      {
        title: "The Ancestral Sin",
        detail:
          "His doctoral study of original sin in the Greek patristic tradition.",
      },
      {
        title: "Romanity, Romania, Roumeli",
        detail: "On Roman identity and the history of the Orthodox East.",
      },
      {
        title: "Franks, Romans, Feudalism, and Doctrine",
        detail: "His comparative study of Eastern and Western Christendom.",
      },
      {
        title: "Patristic Theology",
        detail:
          "Posthumously published lectures on the Fathers and the healing of the soul.",
      },
    ],
    worksAbout: [
      {
        title: "Encyclopedic and academic assessments",
        detail:
          "Studies of his thought and its reception; his work is treated by both admirers and critics.",
        source: "https://en.wikipedia.org/wiki/John_Romanides",
      },
    ],
    related: [
      {
        name: "Holy Cross Greek Orthodox School of Theology",
        note: "Where he studied and later taught in North America.",
      },
      {
        name: "Greek Orthodox Archdiocese of America",
        note: "The jurisdiction of his American formation and ministry.",
      },
      {
        name: "Fr Georges Florovsky",
        note: "An elder contemporary whose “return to the Fathers” Romanides pressed in his own, more polemical, direction.",
        href: "witness/georges-florovsky",
      },
    ],
    significance: [
      "Father John Romanides was one of the most provocative Orthodox theologians of his generation. His work has been both highly influential and sharply contested within Orthodox theological circles — critics have questioned aspects of his historical theses and his polemical tone, while admirers regard him as a major modern interpreter of the patristic and hesychast tradition.",
    ],
  },
];

export const witnessBySlug: Map<string, Witness> = new Map(
  WITNESSES.map((w) => [w.slug, w]),
);
