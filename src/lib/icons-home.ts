/* "Icons in the Home — Building a House of Prayer" data + saint resolver.
   Ported from the Cloud-of-Witnesses design mockup (IconsHome.jsx). The mockup
   keyed its "in our database" saints by short slug; here each slug resolves to a
   real OS-#### record (IDs are permanent, §6), so the cards link to live saint
   pages. A slug with no DB match (e.g. the Guardian Angel, Archangel Michael —
   angelic feasts are out of scope, §7) resolves to null and renders the
   not-yet-in-database fallback the mockup already provides. */

import { byId } from "./data";

/* slug → canonical OS-#### (resolved against data/saints.csv by name/AKA). */
const SLUG_TO_ID: Record<string, string> = {
  nicholas: "OS-0019",
  seraphim: "OS-0043",
  xenia: "OS-0047",
  michael: "", // Archangel Michael — angelic feast, not in DB
  euphrosynos: "OS-0077",
  martha: "OS-1280",
  "martha-mary": "OS-1280",
  stylianos: "OS-0062",
  angel: "", // the Guardian Angel — not a saint record
  "peter-fevronia": "OS-1422",
  "joachim-anna": "OS-0011",
  basil: "OS-0021",
  chrysostom: "OS-0023",
  "cyril-methodius": "OS-0038",
  catherine: "OS-0015",
  joseph: "OS-0075",
  luke: "OS-0006",
  spyridon: "OS-0020",
  abraham: "OS-1984",
  phocas: "OS-1888",
  tryphon: "OS-0061",
  christopher: "OS-1135",
  "gregory-theo": "OS-0022",
  "john-dam": "OS-2300",
  sergius: "OS-0042",
  paraskevi: "OS-0060",
  herman: "OS-0044",
  anthony: "OS-0026",
  elias: "OS-0056",
  nestor: "OS-2085",
  romanos: "OS-1929",
  george: "OS-0012",
};

export interface ResolvedSaint {
  id: string;
  /** display name with rank prefix stripped */
  name: string;
  /** trailing "of …" / "the …" descriptor, italicised on the card */
  epithet: string;
  feast: string;
  image?: string;
  imageThumb?: string;
  /** first rank term — feeds the avatar colour family */
  type: string;
}

// Mirror of america.ts cleanName, broadened to cover the ranks used here.
const RANK_PREFIX =
  /^(Sts?\.?|Saints?|Holy|Blessed|Righteous|Venerable|Great[- ]Martyrs?|New(?:\s+Virgin)?[- ]Martyrs?|Hiero(?:martyr|confessor)|Confessors?|Monastic-Martyrs?|Virgin-Martyrs?|Passion-?bearers?|Martyrs?|Prophets?|Forefather|Right-believing|Unmercenary|Apostles?(?:\s*&\s*Evangelist)?|Equal-to-the-Apostles)\s+/i;

function cleanName(dbName: string): string {
  let n = dbName.split(",")[0].trim();
  let prev = "";
  while (n !== prev && RANK_PREFIX.test(n)) {
    prev = n;
    n = n.replace(RANK_PREFIX, "").trim();
  }
  return n || dbName.split(",")[0].trim();
}

function cleanFeast(dbFeast: string): string {
  return (dbFeast || "")
    .split(";")[0]
    .replace(/\(.*?\)/g, "")
    .replace(/^\s*Glorification\s+/i, "")
    .trim();
}

function splitEpithet(name: string): { base: string; epithet: string } {
  const m = name.match(/^(.*?)(\s+(?:of|the)\s+.*)$/i);
  if (m) return { base: m[1].trim(), epithet: m[2].trim() };
  return { base: name, epithet: "" };
}

export function resolveById(id?: string | null): ResolvedSaint | null {
  if (!id) return null;
  const s = byId.get(id);
  if (!s) return null;
  const full = cleanName(s.name);
  const { base, epithet } = splitEpithet(full);
  return {
    id: s.id,
    name: base,
    epithet,
    feast: cleanFeast(s.feast),
    image: s.image,
    imageThumb: s.imageThumb,
    type: (s.rank && s.rank[0]) || "",
  };
}

export function resolveSaint(slug?: string | null): ResolvedSaint | null {
  return resolveById(slug ? SLUG_TO_ID[slug] : null);
}

export function inDb(slug?: string | null): boolean {
  const id = slug ? SLUG_TO_ID[slug] : "";
  return !!(id && byId.has(id));
}

/* Exact-name → OS-#### map for the saints named in the cards. Built by hand
   (not fuzzy-matched) because the page mixes saints with icons and items that
   share words — e.g. "The Hospitality of Abraham" is an icon, not the patriarch.
   Keys are the normalized core (lowercased, &→and, leading rank words stripped)
   so every variant a card uses ("St Spyridon", "St Spyridon of Trimythous")
   resolves to one record. Christ, the Theotokos, angels, icons, devotional
   items, and unsplit pairs are intentionally absent — they stay unlinked. */
const CORE_TO_ID: Record<string, string> = {
  abraham: "OS-1984",
  "abraham the forefather": "OS-1984",
  "abraham the patriarch": "OS-1984",
  "alypius the iconographer": "OS-1719",
  "anthony the great": "OS-0026",
  basil: "OS-0021",
  "basil the great": "OS-0021",
  "bede the venerable": "OS-0083",
  "benedict of nursia": "OS-0822",
  catherine: "OS-0015",
  "catherine of alexandria": "OS-0015",
  christopher: "OS-1135",
  "clement of ohrid": "OS-1588",
  "conon the gardener": "OS-0777",
  "cosmas and damian": "OS-1474",
  "cyril and methodius": "OS-0038",
  elias: "OS-0056",
  elijah: "OS-0056",
  "elizabeth the new martyr": "OS-1548",
  euphrosynos: "OS-0077",
  "euphrosynos the cook": "OS-0077",
  "gabriel of georgia": "OS-2592",
  "george the trophy bearer": "OS-0012",
  "herman of alaska": "OS-0044",
  "innocents of bethlehem": "OS-2425",
  "joachim and anna": "OS-0011",
  "john chrysostom": "OS-0023",
  "john of damascus": "OS-2300",
  "john of kronstadt": "OS-0045",
  "john the baptist": "OS-0002",
  "john the forerunner": "OS-0002",
  "john the merciful": "OS-2184",
  "john the russian": "OS-0069",
  "joseph the betrothed": "OS-0075",
  luke: "OS-0006",
  "luke of crimea": "OS-0049",
  "luke the evangelist": "OS-0006",
  "luke the physician": "OS-0006",
  "martha and mary": "OS-1280",
  "martha and mary of bethany": "OS-1280",
  "martha of bethany": "OS-1280",
  "mary of bethany": "OS-1280",
  "naum of ohrid": "OS-1398",
  nestor: "OS-2085",
  "nestor the chronicler": "OS-2085",
  nicholas: "OS-0019",
  "nicholas the wonderworker": "OS-0019",
  "pachomius the great": "OS-0028",
  panteleimon: "OS-0014",
  paraskevi: "OS-0060",
  paul: "OS-2749",
  "peter and fevronia": "OS-1422",
  "peter and fevronia of murom": "OS-1422",
  "philaret the merciful": "OS-2283",
  "phocas the gardener": "OS-1888",
  "romanos the melodist": "OS-1929",
  sarah: "OS-2356",
  "seraphim of sarov": "OS-0043",
  sergius: "OS-0042",
  "sergius of radonezh": "OS-0042",
  spyridon: "OS-0020",
  "spyridon of trimythous": "OS-0020",
  stylianos: "OS-0062",
  "stylianos of paphlagonia": "OS-0062",
  "tikhon of zadonsk": "OS-1696",
  tobias: "OS-2572",
  tryphon: "OS-0061",
  "tryphon of campsada": "OS-0061",
  xenia: "OS-0047",
  "xenia of st petersburg": "OS-0047",
};

const RANK_WORDS =
  /^(sts?|saint|saints|the|holy|blessed|righteous|venerable|prophet|forefather|great martyr|new martyr|hieromartyr|martyr|martyrs|apostle|apostles|archangel|right believing)\b/;

function nameCore(name: string): string {
  let s = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(RANK_WORDS, "").trim();
  }
  return s;
}

/* Resolve a card's named saint to a real record — by curated slug first
   (`opts.slug`), then by exact name. Returns null for non-saints (icons,
   items, Christ/Theotokos, angels), which then render as plain text. */
export function linkSaint(
  name: string,
  slug?: string | null,
): ResolvedSaint | null {
  if (slug && SLUG_TO_ID[slug]) return resolveById(SLUG_TO_ID[slug]);
  return resolveById(CORE_TO_ID[nameCore(name)] ?? null);
}

/* =====================================================================
   ROOM DATA — the simple rooms (Icon Corner feature + plain room cards)
   ===================================================================== */
export interface IhRoom {
  id: string;
  glyph: string;
  kicker: string;
  name: string;
  purpose: string;
  placements: string[];
  patrons: { n: string; id?: string }[];
  prayer: string;
  related: string[];
  large?: boolean;
}

export const IH_ROOMS: IhRoom[] = [
  {
    id: "icon-corner",
    glyph: "corner",
    kicker: "The heart of the home",
    name: "The Icon Corner",
    purpose:
      "A small, set-apart place of prayer — traditionally on the eastern wall — where the family gathers morning and evening to stand before the Lord.",
    placements: [
      "Christ Pantocrator and the Theotokos, side by side at the center",
      "The family’s patron saints gathered around them",
      "A standing cross",
      "A vigil lamp kept burning",
      "Prayer books, a censer, and a small shelf for blessed items",
    ],
    patrons: [],
    prayer:
      "O Heavenly King, Comforter, Spirit of Truth — come and abide in us.",
    related: ["nicholas", "seraphim", "xenia"],
  },
  {
    id: "entryway",
    glyph: "door",
    kicker: "The threshold",
    name: "Entryway",
    purpose:
      "Blessing all who enter and all who leave. An icon by the door is venerated on the way out into the world and on the way home again.",
    placements: [
      "An icon of Christ or the Theotokos to greet each guest",
      "A Guardian Angel for those who travel out",
      "A small font of holy water, where the custom is kept",
    ],
    patrons: [
      { n: "Archangel Michael", id: "michael" },
      { n: "St Nicholas", id: "nicholas" },
    ],
    prayer:
      "Holy Angel, guardian of this house, keep us in our going out and our coming in.",
    related: ["nicholas"],
  },
  {
    id: "kitchen",
    glyph: "pot",
    kicker: "Thanksgiving & hospitality",
    name: "Kitchen & Dining Room",
    purpose:
      "Where the family is fed and the stranger is welcomed. The table is blessed before every meal in thanksgiving for daily bread.",
    placements: [
      "Christ blessing the bread, near where food is prepared",
      "The Mystical Supper above the dining table",
      'An icon of the Theotokos "of the Inexhaustible Cup," in some traditions',
    ],
    patrons: [
      { n: "St Euphrosynos the Cook", id: "euphrosynos" },
      { n: "St Martha of Bethany", id: "martha" },
    ],
    prayer:
      "O Christ our God, bless the food and drink of Thy servants, for Thou art holy always.",
    related: [],
  },
  {
    id: "childrens-room",
    glyph: "crib",
    kicker: "Protection & formation",
    name: "Children’s Rooms",
    purpose:
      "A place of protection, gentle spiritual formation, and remembrance of baptism. Children learn to pray by seeing their parents pray and by greeting familiar faces on the wall.",
    placements: [
      "Christ and the Theotokos, hung low enough for small eyes",
      "The child’s own Guardian Angel",
      "The child’s patron saint — the saint whose name they bear",
      "A small cross above the bed",
    ],
    patrons: [
      { n: "St Stylianos of Paphlagonia", id: "stylianos" },
      { n: "The Holy Guardian Angel", id: "angel" },
    ],
    prayer:
      "O Angel of God, my holy guardian, keep this child this night in peace.",
    related: ["nicholas"],
  },
  {
    id: "parents-room",
    glyph: "bed",
    kicker: "Marriage & family life",
    name: "Parents’ Bedroom",
    purpose:
      "The room of marriage and family life, kept under the blessing of the holy couples who sanctified ordinary married love.",
    placements: [
      "An icon of Christ and the Theotokos",
      "The wedding icons, where a couple was crowned",
      "A patron of marriage and of childbearing",
    ],
    patrons: [
      { n: "Sts Peter & Fevronia of Murom", id: "peter-fevronia" },
      { n: "Sts Joachim & Anna", id: "joachim-anna" },
    ],
    prayer:
      "O Lord, bless this marriage as Thou didst bless the wedding at Cana.",
    related: ["xenia"],
  },
  {
    id: "homeschool",
    glyph: "book",
    kicker: "Learning & wisdom",
    name: "Homeschool Room / Library",
    large: true,
    purpose:
      "The room of study, where the mind is offered to God. Generations of Orthodox children have begun their lessons under the gaze of the Church’s great teachers, asking their prayers before opening a book.",
    placements: [
      'Christ "the Teacher," blessing with an open Gospel',
      "The Three Holy Hierarchs, patrons of learning",
      "The saint who patrons the subject at hand",
      "A small icon at each child’s desk",
    ],
    patrons: [
      { n: "St Basil the Great", id: "basil" },
      { n: "St John Chrysostom", id: "chrysostom" },
      { n: "Sts Cyril & Methodius", id: "cyril-methodius" },
      { n: "St Catherine of Alexandria", id: "catherine" },
    ],
    prayer:
      "O Lord, send down upon us the grace of Thy Holy Spirit, that we may grow in wisdom.",
    related: ["basil", "chrysostom", "catherine", "gregory-theo", "john-dam"],
  },
  {
    id: "office",
    glyph: "tools",
    kicker: "Daily work",
    name: "Office / Workshop",
    purpose:
      "Where the work of our hands is offered to God. The labor of the carpenter, the physician, and the craftsman is all sanctified in Christ.",
    placements: [
      "Christ or the Theotokos above the desk or bench",
      "A patron of one’s trade or profession",
      "A small cross or blessing in the workspace",
    ],
    patrons: [
      { n: "St Joseph the Betrothed", id: "joseph" },
      { n: "St Luke the Physician", id: "luke" },
      { n: "St Spyridon of Trimythous", id: "spyridon" },
    ],
    prayer:
      "Bless, O Lord, the work of our hands; establish Thou the work of our hands.",
    related: ["spyridon"],
  },
  {
    id: "guest-room",
    glyph: "guest",
    kicker: "Hospitality to strangers",
    name: "Guest Room",
    purpose:
      "A room kept ready for the stranger, in whom we receive Christ Himself. The icons here welcome the guest into the prayer of the household.",
    placements: [
      "A welcoming icon of Christ or the Theotokos",
      "The Hospitality of Abraham — the three angels at Mamre",
      "A small prayer card left for the guest",
    ],
    patrons: [
      { n: "Righteous Abraham the Patriarch", id: "abraham" },
      { n: "Sts Martha & Mary of Bethany", id: "martha-mary" },
    ],
    prayer:
      "O Lord, who wast received as a guest, make us worthy to receive others in Thy name.",
    related: [],
  },
  {
    id: "garden",
    glyph: "leaf",
    kicker: "The work of the earth",
    name: "Garden",
    purpose:
      "Where the family tends the earth and waits on God for rain and harvest. A small shrine or weatherproof icon keeps the garden under heaven’s blessing.",
    placements: [
      "A weatherproof icon or small outdoor shrine",
      "A patron of gardeners and of the harvest",
      "A cross at the threshold of the garden",
    ],
    patrons: [
      { n: "St Phocas the Gardener", id: "phocas" },
      { n: "St Tryphon of Campsada", id: "tryphon" },
    ],
    prayer:
      "O Lord, send down Thy blessing upon the seed and the harvest of Thy servants.",
    related: ["elias"],
  },
  {
    id: "garage",
    glyph: "car",
    kicker: "Safe journeys",
    name: "Garage / Travel Area",
    purpose:
      "The threshold of every journey. Travelers have always set out under the protection of the saints, carrying a small icon and asking their prayers on the road.",
    placements: [
      "A small icon of Christ or the Theotokos in the car",
      "A patron of travelers",
      "A travel blessing kept near the door to the road",
    ],
    patrons: [
      { n: "St Nicholas the Wonderworker", id: "nicholas" },
      { n: "St Christopher", id: "christopher" },
    ],
    prayer:
      "O Lord, be Thou the companion of our journey and the guide of our way.",
    related: ["nicholas"],
  },
];

/* =====================================================================
   RICH CARD DATA
   ===================================================================== */
export interface IhEntry {
  n: string;
  sub?: string;
  why: string;
  footLabel?: string;
  foot?: string;
  footLabel2?: string;
  foot2?: string;
  bestFor?: string[];
  id?: string;
}
export interface IhGroup {
  label: string;
  entries: IhEntry[];
}
export interface IhRegion {
  place: string;
  icons: string[];
  custom: string;
}
export interface IhRec {
  label: string;
  saints: string[];
}
export interface IhVignette {
  title: string;
  panels: { label: string; big?: boolean }[];
  note: string;
}
export interface IhRichCard {
  id: string;
  glyph: string;
  kicker: string;
  title: string;
  regionsTitle: string;
  recsTitle?: string;
  relatedLabel: string;
  intro: string;
  callout?: { title: string; lines: string[]; foot?: string };
  groups: IhGroup[];
  vignette?: IhVignette;
  facts: [string, string][];
  regions: IhRegion[];
  recs?: IhRec[];
  historical?: { title: string; items: { label: string; list: string[] }[] };
  note: string;
  sources?: string[];
  related: string[];
}

export const IH_OFFICE: IhRichCard = {
  id: "office",
  glyph: "tools",
  kicker: "Daily Work",
  title: "Office, Workshop & Place of Labor",
  regionsTitle: "Regional customs at work",
  recsTitle: "Patrons by profession",
  relatedLabel: "Workplace patrons in our database",
  intro:
    "Orthodox Christianity teaches that work is not only a means of earning a living, but an opportunity to cooperate with God through honest labor, creativity, service, and stewardship. There is no universal rule assigning particular icons to offices or workshops, yet many Orthodox Christians keep icons in their workspaces — reminders to work diligently, honestly, and prayerfully.",
  groups: [
    {
      label: "Primary icons · the most universal",
      entries: [
        {
          n: "Christ the Savior",
          why: "His presence reminds the Christian that all labor — intellectual, creative, administrative, or physical — is offered to God and becomes a means of serving both God and neighbor.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "The Theotokos",
          why: "The Mother of God is an example of humility, obedience, and faithful service. Her icon is found in home and professional workspaces alike.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
      ],
    },
    {
      label: "Common patron saints of work",
      entries: [
        {
          n: "St Joseph the Betrothed",
          why: "A carpenter and craftsman who supported the Holy Family by honest labor — among the most fitting saints for workshops, garages, woodworking spaces, and tradesmen.",
          footLabel: "Most common in",
          foot: "Universal Christian tradition.",
          bestFor: [
            "Woodworking",
            "Construction",
            "Skilled trades",
            "Family businesses",
          ],
        },
        {
          n: "The Apostle Paul",
          why: "St Paul supported himself by tentmaking while carrying out his mission — an example of balancing professional work with Christian vocation.",
          bestFor: [
            "Business owners",
            "Professionals",
            "Mission work",
            "Entrepreneurs",
          ],
        },
        {
          n: "St Spyridon of Trimythous",
          id: "spyridon",
          why: "Before he was a bishop, Spyridon was a shepherd living a simple life of labor and service. He is associated with practical concerns, honest work, and God’s provision.",
          footLabel: "Most common in",
          foot: "Greek and Slavic traditions.",
        },
      ],
    },
    {
      label: "Intellectual & professional work",
      entries: [
        {
          n: "St Luke the Evangelist",
          why: "Remembered as both physician and iconographer — a natural patron for medical professionals, artists, writers, and researchers whose work joins knowledge and creativity.",
          bestFor: ["Doctors", "Nurses", "Researchers", "Artists", "Writers"],
        },
        {
          n: "St Basil the Great",
          id: "basil",
          why: "One of the greatest scholars and administrators in the history of the Church — a model of disciplined study, leadership, and service through learning.",
          bestFor: ["Educators", "Administrators", "Academics"],
        },
        {
          n: "St John Chrysostom",
          id: "chrysostom",
          why: "Renowned for his preaching and theological writing, Chrysostom is associated with communication, teaching, and public speaking.",
          bestFor: ["Teachers", "Speakers", "Writers", "Clergy"],
        },
      ],
    },
    {
      label: "Artists & craftsmen",
      entries: [
        {
          n: "St Luke the Evangelist",
          why: "Tradition holds that St Luke painted icons of the Mother of God; he is regarded as the patron of iconographers and sacred artists.",
        },
        {
          n: "St Alypius the Iconographer",
          why: "One of the earliest known iconographers of Kievan Rus, honored for his work creating sacred images.",
          bestFor: ["Iconographers", "Artists", "Designers", "Craftsmen"],
        },
      ],
    },
    {
      label: "Agricultural & manual labor",
      entries: [
        {
          n: "St Isidore the Farmer",
          why: "A laborer known for his devotion while performing the most ordinary work.",
          bestFor: ["Farmers", "Gardeners", "Agricultural workers"],
        },
        {
          n: "St Spyridon of Trimythous",
          id: "spyridon",
          why: "His life as shepherd and later bishop shows that holiness can be found in both manual labor and leadership.",
        },
      ],
    },
  ],
  vignette: {
    title: "A workshop vignette",
    panels: [
      { label: "Christ", big: true },
      { label: "St Joseph" },
      { label: "St Luke" },
    ],
    note: "Christ with St Joseph the carpenter and St Luke, among books, tools, and a prayer rope.",
  },
  facts: [
    ["Most universal icons", "Christ · the Theotokos"],
    ["For workshops", "St Joseph the Betrothed"],
    ["For offices", "Apostle Paul · St Basil the Great"],
    ["For artists", "St Luke the Evangelist"],
    ["For medical work", "St Luke the Evangelist"],
  ],
  regions: [
    {
      place: "Russia",
      icons: ["Christ", "St Nicholas", "St Sergius of Radonezh"],
      custom:
        "Workshops and studies often hold small icons, where work begins and ends with prayer.",
    },
    {
      place: "Greece",
      icons: ["Christ", "Theotokos", "St Spyridon"],
      custom:
        "Family businesses frequently display icons prominently in offices, shops, and workplaces.",
    },
    {
      place: "Serbia",
      icons: ["Christ", "Family Slava saint"],
      custom:
        "The family patron saint may be displayed in both the home and the workplace.",
    },
    {
      place: "Romania",
      icons: ["Christ", "St Nicholas", "Theotokos"],
      custom:
        "Icons appear in shops, farms, offices, and workshops as reminders that work is blessed by God.",
    },
    {
      place: "Antioch",
      icons: ["Christ", "Theotokos", "Patron of the worker"],
      custom:
        "Many keep a small prayer corner even within a professional office.",
    },
  ],
  recs: [
    {
      label: "Writers & authors",
      saints: ["St John Chrysostom", "St Luke", "St Nestor the Chronicler"],
    },
    {
      label: "Teachers & educators",
      saints: [
        "Sts Cyril & Methodius",
        "St Basil the Great",
        "St Catherine of Alexandria",
      ],
    },
    {
      label: "Doctors & medical workers",
      saints: [
        "St Luke the Evangelist",
        "Sts Cosmas & Damian",
        "St Panteleimon",
      ],
    },
    {
      label: "Artists & designers",
      saints: ["St Luke the Evangelist", "St Alypius the Iconographer"],
    },
    { label: "Business owners", saints: ["The Apostle Paul", "St Spyridon"] },
    {
      label: "Tradesmen & craftsmen",
      saints: ["St Joseph the Betrothed", "St Spyridon"],
    },
  ],
  note: "Orthodox Christians have long placed icons in their workplaces as reminders that every honest task can become an offering to God.",
  sources: [
    "Orthodox Church in America (OCA) — Lives of St Joseph the Betrothed, St Luke the Evangelist, and St Spyridon of Trimythous.",
    "OrthodoxWiki — St Luke the Evangelist, St Spyridon, and St Alypius the Iconographer.",
    "Orthodox Church in America — Sts Cyril & Methodius, St Basil the Great, St John Chrysostom, Sts Cosmas & Damian, and St Panteleimon.",
  ],
  related: ["spyridon", "basil", "chrysostom", "sergius"],
};

export const IH_DINING: IhRichCard = {
  id: "dining",
  glyph: "table",
  kicker: "Thanksgiving & Hospitality",
  title: "Dining Room & Family Table",
  regionsTitle: "Regional customs at the table",
  relatedLabel: "Table & hospitality patrons in our database",
  intro:
    "The family table has long held an honored place in Orthodox Christian life. Meals begin and end with prayer, feast days are kept around the table, and hospitality is extended to family, friends, and strangers alike. There is no universal rule governing dining-room icons, yet many homes display images that emphasize thanksgiving, hospitality, and Christ’s presence at every meal.",
  groups: [
    {
      label: "Primary icons · the most universal",
      entries: [
        {
          n: "Christ the Savior",
          why: "Every meal is received as a gift from God. An icon of Christ reminds the family to give thanks before and after eating, and to know Him as the true host of every table.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "The Mystical Supper",
          sub: "the Last Supper",
          why: "One of the most common dining-room icons. It joins ordinary meals to the Eucharistic life of the Church — a reminder that every family meal should reflect gratitude, unity, and love.",
          footLabel: "Traditions",
          foot: "Greek, Russian, Serbian, Romanian, Antiochian, and other traditions.",
        },
        {
          n: "Christ Blessing the Bread",
          why: "Icons of Christ blessing bread emphasize thanksgiving and God’s provision for daily needs.",
          footLabel: "Traditions",
          foot: "Common throughout the Orthodox world.",
        },
      ],
    },
    {
      label: "Saints of hospitality & the table",
      entries: [
        {
          n: "St Martha of Bethany",
          why: "Remembered for her service and hospitality to Christ — among the most fitting saints for kitchens, dining rooms, and homes where hospitality is treasured.",
          bestFor: ["Dining rooms", "Family gatherings", "Hospitality"],
        },
        {
          n: "St Mary of Bethany",
          why: "Mary complements Martha, reminding us that meals are not only about serving but also about fellowship, prayer, and attentiveness to Christ.",
          bestFor: ["Family meals", "Hospitality", "Fellowship"],
        },
        {
          n: "Righteous Abraham the Forefather",
          why: "His hospitality to the three visitors at Mamre became one of the great biblical examples of welcoming the stranger and honoring the guest.",
          bestFor: ["Dining rooms", "Guest spaces", "Homes that host"],
        },
        {
          n: "Righteous Sarah",
          why: "Sarah shares in the hospitality shown at Mamre and is an example of generous household stewardship.",
          bestFor: ["Family-centered homes", "Hospitality"],
        },
      ],
    },
    {
      label: "Saints associated with food & feasts",
      entries: [
        {
          n: "St Euphrosynos the Cook",
          why: "A monastery cook, and one of the clearest patron saints associated with the preparation of food and the keeping of meals.",
          footLabel: "Most common in",
          foot: "Greek, Slavic, and monastic traditions.",
          bestFor: ["Dining rooms", "Kitchens", "Family cooks"],
        },
        {
          n: "St Nicholas the Wonderworker",
          id: "nicholas",
          why: "Though not strictly a dining-room saint, Nicholas is everywhere associated with generosity, charity, and care for those in need.",
          bestFor: ["Family dining spaces", "Charitable households"],
        },
      ],
    },
    {
      label: "Scriptural themes of the table",
      entries: [
        {
          n: "The Hospitality of Abraham",
          sub: "icon",
          why: "Abraham welcoming the three visitors at Mamre — a beloved visual reminder of Christian hospitality.",
        },
        {
          n: "The Wedding at Cana",
          sub: "icon",
          why: "The first public miracle of Christ took place at a wedding feast — especially fitting for a family dining space.",
        },
        {
          n: "Christ in the House of Martha and Mary",
          sub: "icon",
          why: "A reminder that the Christian home should hold service and prayer together in balance.",
        },
      ],
    },
  ],
  vignette: {
    title: "A dining-room vignette",
    panels: [
      { label: "Mystical Supper" },
      { label: "Christ", big: true },
      { label: "Martha & Mary" },
    ],
    note: "The Mystical Supper above the table — with bread and wine and a lit candle below.",
  },
  facts: [
    ["Most universal icon", "Christ the Savior"],
    ["Most common dining-room icon", "The Mystical Supper"],
    ["Hospitality saints", "Sts Martha & Mary · Abraham"],
    ["Food-related saint", "St Euphrosynos the Cook"],
    ["For family gatherings", "The Wedding at Cana"],
  ],
  regions: [
    {
      place: "Russia",
      icons: ["Christ", "The Mystical Supper", "St Nicholas"],
      custom:
        "Dining spaces often hold icons visible during family meals, especially where daily meal prayers are kept.",
    },
    {
      place: "Greece",
      icons: ["Christ", "The Mystical Supper", "The Wedding at Cana"],
      custom:
        "Family meals and feast-day gatherings are central to Orthodox life, so Eucharistic imagery is especially common.",
    },
    {
      place: "Serbia",
      icons: ["Christ", "Family Slava saint"],
      custom:
        "The family patron saint often holds a prominent place during the Slava celebration and festive meals.",
    },
    {
      place: "Romania",
      icons: ["Christ", "The Last Supper", "St Nicholas"],
      custom:
        "Icons frequently overlook the family table, reinforcing the bond between prayer and daily meals.",
    },
    {
      place: "Antioch",
      icons: ["Christ", "The Mystical Supper", "Theotokos"],
      custom:
        "Hospitality holds an important place in many Antiochian homes, so icons of fellowship and welcome are fitting.",
    },
  ],
  note: "The Orthodox table is more than a place to eat. It is a place of thanksgiving, fellowship, hospitality, and the remembrance of God’s gifts.",
  related: ["nicholas"],
};

export const IH_PARENTS: IhRichCard = {
  id: "parents-room",
  glyph: "bed",
  kicker: "Marriage & Family Life",
  title: "Parents’ Bedroom & Marriage",
  regionsTitle: "Regional customs in the bedroom",
  recsTitle: "Icons for every season of marriage",
  relatedLabel: "Marriage & family patrons in our database",
  intro:
    "The marital bedroom is among the most private spaces in the Christian home. Orthodox tradition sees marriage as a sacramental vocation in which husband and wife help one another grow in faith, love, fidelity, and holiness. There is no universal rule about bedroom icons, yet many couples place icons in their room to encourage prayer together and to remember the sacred character of Christian marriage.",
  groups: [
    {
      label: "Primary icons · the most universal",
      entries: [
        {
          n: "Christ the Savior",
          why: "Christ stands at the center of every Christian marriage. His icon reminds husband and wife that their union is founded on faithfulness, sacrifice, forgiveness, and love.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "The Theotokos",
          sub: "Mother of God",
          why: "The Mother of God is regarded as the protector of the Christian family and home — her icon is among the most common found in Orthodox bedrooms.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "The Wedding at Cana",
          sub: "icon",
          why: "Commemorating Christ’s presence at a marriage feast and His first public miracle — one of the most fitting icons for married couples and family life.",
          footLabel: "Traditions",
          foot: "Found throughout the Orthodox world.",
        },
      ],
    },
    {
      label: "Primary saints of marriage",
      entries: [
        {
          n: "Sts Peter & Fevronia of Murom",
          why: "Perhaps the most widely recognized Orthodox patrons of Christian marriage, remembered for mutual devotion, perseverance, reconciliation, and family life.",
          footLabel: "Most common in",
          foot: "Russian and Slavic traditions, and increasingly across Orthodoxy.",
          bestFor: ["Married couples", "Newlyweds", "Families"],
        },
        {
          n: "Righteous Joachim & Anna",
          why: "As the parents of the Theotokos, they are often invoked by Orthodox families; their lives emphasize faithfulness, patience, and family life.",
          bestFor: ["Married couples", "Parents", "Families with children"],
        },
        {
          n: "Sts Aquila & Priscilla",
          why: "This married couple worked alongside the Apostle Paul and served the early Church together — one of the clearest New Testament examples of a Christian marriage.",
          bestFor: [
            "Married couples",
            "Shared vocation",
            "Ministry-minded families",
          ],
        },
      ],
    },
    {
      label: "Holy couples of Scripture",
      entries: [
        {
          n: "Abraham & Sarah",
          why: "They represent faithfulness through the trials and uncertainties of life; their marriage holds a central place in salvation history.",
          bestFor: ["Long marriages", "Families", "Couples facing trials"],
        },
        {
          n: "Zechariah & Elizabeth",
          why: "The parents of St John the Baptist, remembered for righteousness, patience, and steadfast faith.",
          bestFor: ["Families", "Parents", "Couples praying for children"],
        },
      ],
    },
    {
      label: "Saints for family life",
      entries: [
        {
          n: "St Nicholas the Wonderworker",
          id: "nicholas",
          why: "Often chosen as a household protector and family saint; his icon is common in family bedrooms throughout the Orthodox world.",
        },
        {
          n: "St Xenia of St Petersburg",
          id: "xenia",
          why: "Many seek her intercessions concerning marriage, family concerns, and the difficulties of the household.",
          footLabel: "Most common in",
          foot: "Russian tradition.",
        },
        {
          n: "St Paraskevi",
          id: "paraskevi",
          why: "Widely venerated across the Balkans and Eastern Europe, often regarded as a protector of Christian households and families.",
        },
      ],
    },
  ],
  vignette: {
    title: "A bedroom prayer corner",
    panels: [
      { label: "Theotokos" },
      { label: "Christ", big: true },
      { label: "Peter & Fevronia" },
    ],
    note: "Christ and the Theotokos with the wedding icons and a lampada — wedding crowns kept nearby.",
  },
  facts: [
    ["Most universal icons", "Christ · the Theotokos"],
    ["Most traditional marriage saints", "Sts Peter & Fevronia"],
    ["Most traditional family saints", "Joachim & Anna"],
    ["Most fitting marriage icon", "The Wedding at Cana"],
    ["New Testament married couple", "Sts Aquila & Priscilla"],
  ],
  regions: [
    {
      place: "Russia",
      icons: ["Christ", "Theotokos", "Sts Peter & Fevronia"],
      custom:
        "Many couples place the wedding icons received during the sacrament of marriage in their bedroom.",
    },
    {
      place: "Greece",
      icons: ["Christ", "Theotokos", "The Wedding at Cana"],
      custom:
        "Couples often keep their wedding or blessing icons in the bedroom or an adjacent prayer corner.",
    },
    {
      place: "Serbia",
      icons: ["Christ", "Family Slava saint", "Theotokos"],
      custom:
        "The family patron saint holds a place of honor within the home and family life.",
    },
    {
      place: "Romania",
      icons: ["Christ", "Theotokos", "Joachim & Anna"],
      custom:
        "Icons emphasizing family protection and marriage are commonly found in the couple’s room.",
    },
    {
      place: "Antioch",
      icons: ["Christ", "Theotokos", "The Wedding at Cana"],
      custom:
        "The bedroom is seen as an extension of the family’s prayer life, where husband and wife may pray together.",
    },
  ],
  recs: [
    {
      label: "For newlyweds",
      saints: [
        "The Wedding at Cana",
        "Sts Peter & Fevronia",
        "Christ & the Theotokos",
      ],
    },
    {
      label: "For parents",
      saints: ["Joachim & Anna", "Zechariah & Elizabeth", "The Theotokos"],
    },
    {
      label: "For couples without children",
      saints: ["Joachim & Anna", "Abraham & Sarah", "Zechariah & Elizabeth"],
    },
    {
      label: "For long-married couples",
      saints: [
        "Sts Peter & Fevronia",
        "Sts Aquila & Priscilla",
        "Abraham & Sarah",
      ],
    },
  ],
  historical: {
    title: "Historical & devotional notes",
    items: [
      {
        label: "Strong historical associations",
        list: [
          "Christ",
          "The Theotokos",
          "The Wedding at Cana",
          "Joachim & Anna",
          "Aquila & Priscilla",
        ],
      },
      {
        label: "Strong modern marriage patrons",
        list: ["Sts Peter & Fevronia"],
      },
      { label: "Popular family devotions", list: ["St Nicholas", "St Xenia"] },
    ],
  },
  note: "Orthodox marriage is understood as a shared journey toward Christ. Icons in the marital bedroom remind husband and wife to pray together, to forgive one another, and to grow in faith.",
  related: ["nicholas", "xenia", "paraskevi"],
};

export const IH_GUEST: IhRichCard = {
  id: "guest-room",
  glyph: "guest",
  kicker: "Hospitality to Strangers",
  title: "Guest Room & Hospitality",
  regionsTitle: "Regional customs for guests",
  relatedLabel: "Hospitality patrons in our database",
  intro:
    "Hospitality has held a central place in Christian life since the earliest days of the Church. Scripture calls believers again and again to welcome strangers, care for travelers, and receive guests with generosity. There is no universal rule assigning particular icons to guest rooms, yet many Orthodox families choose images that reflect hospitality, welcome, charity, and the presence of Christ in every visitor.",
  groups: [
    {
      label: "Primary icons · the most universal",
      entries: [
        {
          n: "Christ the Savior",
          why: "Christ taught that to welcome another is, in the end, to welcome Him. His icon reminds host and guest alike that Christian hospitality is rooted in love of God and neighbor.",
          footLabel: "Scriptural theme",
          foot: "“I was a stranger and you welcomed me.” — Matthew 25:35",
        },
        {
          n: "The Theotokos",
          sub: "Mother of God",
          why: "The Mother of God is often placed in guest spaces as a sign of comfort, protection, and welcome.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
      ],
    },
    {
      label: "Primary saints of hospitality",
      entries: [
        {
          n: "Righteous Abraham the Forefather",
          why: "His reception of the three visitors at Mamre became one of the great biblical images of hospitality — a willingness to welcome the stranger celebrated throughout Christian tradition.",
          bestFor: ["Guest rooms", "Hospitality", "Homes that host"],
        },
        {
          n: "Righteous Sarah",
          why: "Sarah shared in Abraham’s hospitality and the care of their guests; together they are one of Scripture’s great examples of a welcoming household.",
          bestFor: ["Family hospitality", "Guest accommodation"],
        },
        {
          n: "St Martha of Bethany",
          why: "Remembered for serving Christ in her home — among the most fitting saints for spaces dedicated to welcoming visitors.",
          bestFor: ["Guest rooms", "Hospitality", "Family gatherings"],
        },
        {
          n: "St Mary of Bethany",
          why: "Mary reminds us that hospitality is not only service but also fellowship, conversation, and spiritual attentiveness.",
          bestFor: ["Guest spaces", "Christian fellowship"],
        },
      ],
    },
    {
      label: "Icons of hospitality",
      entries: [
        {
          n: "The Hospitality of Abraham",
          sub: "the Old Testament Trinity",
          why: "Depicting Abraham welcoming the three visitors at Mamre — long associated with Christian hospitality.",
          footLabel: "Traditions",
          foot: "Found throughout the Orthodox world.",
          bestFor: ["Guest rooms", "Entryways", "Dining rooms"],
        },
        {
          n: "Christ Visiting Martha and Mary",
          sub: "icon",
          why: "Hospitality offered directly to Christ — a picture of the balance between service and spiritual attentiveness.",
          bestFor: ["Guest rooms", "Family gathering spaces"],
        },
      ],
    },
    {
      label: "Saints of charity & care for strangers",
      entries: [
        {
          n: "St John the Merciful",
          why: "Known for extraordinary generosity toward strangers, travelers, and the poor.",
          footLabel: "Most common in",
          foot: "Greek and Middle Eastern traditions.",
          bestFor: ["Homes of charity", "Hospitality"],
        },
        {
          n: "St Philaret the Merciful",
          why: "Remembered for welcoming and caring for those in need despite his own hardship.",
          bestFor: ["Christian hospitality", "Charitable households"],
        },
        {
          n: "St Elizabeth the New Martyr",
          why: "Her life of service to the suffering and the displaced made her an example of Christian compassion and hospitality.",
          bestFor: ["Homes in ministry", "Guest accommodation"],
        },
      ],
    },
    {
      label: "Monastic examples of hospitality",
      entries: [
        {
          n: "St Benedict of Nursia",
          why: "A Western, pre-schism saint whose Rule famously taught that every guest should be received as Christ Himself.",
          bestFor: ["Pilgrim lodging", "Retreat centers", "Hospitality"],
        },
      ],
    },
  ],
  vignette: {
    title: "A guest-room corner",
    panels: [
      { label: "Hospitality of Abraham" },
      { label: "Christ", big: true },
      { label: "Martha & Mary" },
    ],
    note: "A welcoming icon with a bedside prayer book, a lampada, and fresh flowers.",
  },
  facts: [
    ["Most universal icons", "Christ · the Theotokos"],
    ["Most traditional hospitality saint", "Righteous Abraham"],
    ["Most traditional hospitality icon", "The Hospitality of Abraham"],
    ["New Testament hospitality", "Sts Martha & Mary of Bethany"],
    ["Saint of charity", "St John the Merciful"],
  ],
  regions: [
    {
      place: "Russia",
      icons: ["Christ", "Theotokos", "St Nicholas"],
      custom:
        "Guest spaces often hold simple icons meant to give comfort and a prayerful atmosphere to visitors.",
    },
    {
      place: "Greece",
      icons: ["Christ", "Hospitality of Abraham", "Theotokos"],
      custom:
        "Hospitality is held as a sacred duty, and icons reinforce the bond between welcoming guests and serving Christ.",
    },
    {
      place: "Serbia",
      icons: ["Christ", "Family Slava saint"],
      custom:
        "Guests are welcomed under the protection of the family’s patron saint.",
    },
    {
      place: "Romania",
      icons: ["Christ", "Theotokos", "St Nicholas"],
      custom:
        "Guest rooms often hold simple devotional icons that help visitors feel welcomed and cared for.",
    },
    {
      place: "Antioch",
      icons: ["Christ", "Hospitality of Abraham", "Theotokos"],
      custom:
        "Middle Eastern Christian culture prizes generous welcome, making hospitality-themed icons especially fitting.",
    },
  ],
  historical: {
    title: "Historical & devotional notes",
    items: [
      {
        label: "Strong historical associations",
        list: [
          "Righteous Abraham",
          "Righteous Sarah",
          "The Hospitality of Abraham",
          "Sts Martha & Mary",
        ],
      },
      {
        label: "Christian hospitality examples",
        list: ["St John the Merciful", "St Philaret the Merciful"],
      },
      {
        label: "Popular household devotions",
        list: ["St Nicholas", "St Elizabeth the New Martyr"],
      },
    ],
  },
  note: "Throughout Christian history, to welcome a guest has been understood as an opportunity to welcome Christ Himself.",
  related: ["nicholas"],
};

export const IH_CHILDREN: IhRichCard = {
  id: "childrens-room",
  glyph: "crib",
  kicker: "Protection & Formation",
  title: "Children’s Room & Spiritual Formation",
  regionsTitle: "Regional customs for children",
  recsTitle: "Icons by age",
  relatedLabel: "Children’s patrons in our database",
  intro:
    "From the earliest centuries of Christianity, parents have sought to raise their children in the faith by surrounding them with reminders of Christ, the saints, and the life of the Church. There is no universal rule governing which icons belong in a child’s room, yet many families choose images that emphasize protection, baptism, spiritual growth, learning, and the child’s bond with their patron saint.",
  groups: [
    {
      label: "Primary icons · the most universal",
      entries: [
        {
          n: "Jesus Christ",
          why: "Christ is the center of every Christian life. His icon reminds children that they belong to Him and are called to grow in faith, love, and holiness.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "The Theotokos",
          sub: "Mother of God",
          why: "The Mother of God is regarded as a special protector of children and families — her icon is among the most common in Orthodox nurseries and children’s rooms.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "The Guardian Angel",
          why: "Orthodox Christians believe each baptized Christian receives a guardian angel; icons of the Guardian Angel are especially common in children’s rooms.",
          footLabel: "Traditions",
          foot: "Greek, Russian, Serbian, Romanian, Antiochian, Georgian, and other traditions.",
        },
        {
          n: "The Child’s Patron Saint",
          why: "The patron saint has long been one of the most important saints in an Orthodox Christian’s life. Children are encouraged to learn about their patron and to see them as a heavenly example and companion.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
      ],
    },
    {
      label: "Primary saints of children",
      entries: [
        {
          n: "St Stylianos of Paphlagonia",
          why: "One of the most universally recognized Orthodox saints associated with children, often depicted holding an infant and widely venerated by parents seeking his prayers.",
          footLabel: "Most common in",
          foot: "Greek tradition, and widely across Orthodoxy.",
          footLabel2: "Historical confidence",
          foot2: "Very high.",
          bestFor: ["Children’s rooms", "Nurseries", "Family prayer"],
        },
        {
          n: "The Holy Innocents of Bethlehem",
          why: "These child martyrs are remembered as some of the youngest saints honored by the Church.",
          bestFor: ["Children’s rooms", "Teaching courage & faith"],
        },
      ],
    },
    {
      label: "Saints of learning & education",
      entries: [
        {
          n: "St Sergius of Radonezh",
          id: "sergius",
          why: "His Life recounts that he struggled with reading as a child until he received help through God’s providence; he became one of the most beloved saints of students and learning.",
          footLabel: "Most common in",
          foot: "Russian tradition.",
          bestFor: ["School-aged children", "Homeschool rooms", "Study areas"],
        },
        {
          n: "Sts Cyril & Methodius",
          why: "The creators of the Slavic literary tradition, associated with education, literacy, and learning.",
          bestFor: ["Readers", "Students", "Homeschool families"],
        },
        {
          n: "St Catherine of Alexandria",
          id: "catherine",
          why: "One of the Church’s most celebrated saints of wisdom and learning.",
          bestFor: ["Older children", "Students", "Academic pursuits"],
        },
      ],
    },
    {
      label: "Saints of youthful holiness",
      entries: [
        {
          n: "St Tikhon of Zadonsk",
          why: "Known for his pastoral concern and accessible teaching, often recommended to families raising children.",
        },
        {
          n: "St Gabriel of Georgia",
          why: "Though not traditionally a children’s saint, many modern families love his warmth, humility, and approachable example.",
          footLabel: "Historical confidence",
          foot: "Modern devotional use rather than historical tradition.",
        },
        {
          n: "St John of Kronstadt",
          why: "Remembered for his pastoral care of children, families, and education.",
          bestFor: ["Family prayer spaces", "Children’s rooms"],
        },
      ],
    },
  ],
  vignette: {
    title: "A child’s icon corner",
    panels: [
      { label: "Guardian Angel" },
      { label: "Christ", big: true },
      { label: "St Stylianos" },
    ],
    note: "Christ, the Guardian Angel, and the child’s patron — with a children’s prayer book and a baptismal cross nearby.",
  },
  facts: [
    ["Most universal icons", "Christ · the Theotokos"],
    ["Most traditional child saint", "St Stylianos"],
    ["Most universal personal saint", "The child’s patron saint"],
    ["Most common room icon", "The Guardian Angel"],
    ["For students", "St Sergius of Radonezh"],
  ],
  regions: [
    {
      place: "Russia",
      icons: ["Guardian Angel", "Patron saint", "Christ"],
      custom:
        "Many families place a Guardian Angel icon near a child’s bed; patron-saint icons are often given at baptism and stay through life.",
    },
    {
      place: "Greece",
      icons: ["St Stylianos", "Christ", "Theotokos"],
      custom:
        "St Stylianos is perhaps the most recognizable saint associated with children in Greek Orthodox homes.",
    },
    {
      place: "Serbia",
      icons: ["Patron saint", "Christ", "Family Slava saint"],
      custom:
        "Children are raised with a strong awareness of both their patron saint and the family’s Slava saint.",
    },
    {
      place: "Romania",
      icons: ["Guardian Angel", "Christ", "Theotokos"],
      custom:
        "Guardian Angel icons are especially popular gifts for baptisms and young children.",
    },
    {
      place: "Antioch",
      icons: ["Christ", "Theotokos", "Patron saint"],
      custom:
        "Family prayer and patron-saint devotion often matter more than room-specific saint traditions.",
    },
  ],
  recs: [
    {
      label: "Babies & toddlers",
      saints: ["Christ", "Theotokos", "Guardian Angel", "St Stylianos"],
    },
    {
      label: "Young children",
      saints: ["Christ", "Guardian Angel", "Patron saint", "St Stylianos"],
    },
    {
      label: "School-aged children",
      saints: [
        "Patron saint",
        "Guardian Angel",
        "St Sergius",
        "Sts Cyril & Methodius",
      ],
    },
    {
      label: "Teenagers",
      saints: [
        "Patron saint",
        "St Catherine",
        "St John of Kronstadt",
        "St Gabriel of Georgia",
      ],
    },
  ],
  historical: {
    title: "Historical & devotional notes",
    items: [
      {
        label: "Strong historical associations",
        list: [
          "Christ",
          "Theotokos",
          "Guardian Angel",
          "Patron saint",
          "St Stylianos",
        ],
      },
      {
        label: "Strong educational associations",
        list: [
          "St Sergius of Radonezh",
          "Sts Cyril & Methodius",
          "St Catherine",
        ],
      },
      {
        label: "Popular modern devotions",
        list: ["St Gabriel of Georgia", "St John of Kronstadt"],
      },
    ],
  },
  note: "In many Orthodox homes a child’s room holds icons of Christ, the Guardian Angel, and the child’s patron saint — to encourage prayer and spiritual growth from the earliest age.",
  related: ["sergius", "catherine"],
};

export const IH_HOMESCHOOL: IhRichCard = {
  id: "homeschool",
  glyph: "book",
  kicker: "Learning & Wisdom",
  title: "Homeschool Room, Library & Study",
  regionsTitle: "Regional customs for study",
  recsTitle: "Patrons by subject",
  relatedLabel: "Teachers & scholars in our database",
  intro:
    "The pursuit of wisdom, learning, and the knowledge of God has always held an honored place in Orthodox Christianity — from the great theological schools of Alexandria and Constantinople to monastic scriptoria and parish schools, where education was understood as the formation of the whole person. There is no universal rule assigning particular icons to a study or library, yet many families choose saints associated with learning, literacy, teaching, scholarship, writing, and wisdom.",
  groups: [
    {
      label: "Primary icons · the most universal",
      entries: [
        {
          n: "Christ the Teacher",
          why: "Christ is the ultimate teacher and the source of all wisdom. His icon is a reminder that all true knowledge leads, in the end, toward God.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "The Theotokos",
          sub: "the Seat of Wisdom",
          why: "Often called the Seat of Wisdom in Christian tradition; her icon reminds students that learning should be accompanied by humility and faith.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "Christ Among the Teachers",
          sub: "icon",
          why: "Depicting the young Christ teaching in the Temple — particularly fitting for an educational setting.",
          bestFor: ["Homeschool rooms", "Libraries", "Classrooms"],
        },
      ],
    },
    {
      label: "Primary saints of learning",
      entries: [
        {
          n: "St Catherine of Alexandria",
          id: "catherine",
          why: "One of the most famous saints of wisdom, learning, philosophy, and education — a patron of students and scholars throughout Christian history.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: ["Students", "Academics", "Philosophy"],
        },
        {
          n: "St Basil the Great",
          id: "basil",
          why: "A classically educated scholar, theologian, and church leader whose writings still shape Orthodox thought.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: ["Teachers", "Educators", "Academic study"],
        },
        {
          n: "St John Chrysostom",
          id: "chrysostom",
          why: "Renowned for his preaching and biblical interpretation, he remains one of Christianity’s greatest teachers.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: ["Reading", "Scripture study", "Communication"],
        },
      ],
    },
    {
      label: "Saints of literacy & education",
      entries: [
        {
          n: "Sts Cyril & Methodius",
          why: "Missionaries who translated Christian texts and laid the foundation of Slavic literacy — among the most important educational saints in Orthodox history.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: ["Reading", "Languages", "Literacy", "Homeschooling"],
        },
        {
          n: "St Clement of Ohrid",
          why: "A disciple of Cyril and Methodius who helped establish schools and preserve Christian learning.",
          footLabel: "Historical confidence",
          foot: "High.",
          bestFor: ["Teachers", "Students", "Educational settings"],
        },
        {
          n: "St Naum of Ohrid",
          why: "An educator and missionary closely tied to the growth of Christian schools and literacy.",
          bestFor: ["Learning", "Teaching", "Classical education"],
        },
      ],
    },
    {
      label: "Saints of students",
      entries: [
        {
          n: "St Sergius of Radonezh",
          id: "sergius",
          why: "His Life recounts that he struggled with reading as a child until he received divine help; he became one of the Church’s most beloved saints of students and education.",
          footLabel: "Most common in",
          foot: "Russian tradition.",
          footLabel2: "Historical confidence",
          foot2: "High.",
          bestFor: ["Children", "Reading difficulties", "Students"],
        },
        {
          n: "St John of Kronstadt",
          why: "Known for his support of Christian education and his care for young people.",
          bestFor: ["Family education", "Formation of children"],
        },
      ],
    },
    {
      label: "Saints of writing & history",
      entries: [
        {
          n: "St Nestor the Chronicler",
          why: "One of the most important historians in Orthodox history and author of the Primary Chronicle.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: ["History", "Writing", "Research"],
        },
        {
          n: "St Bede the Venerable",
          why: "A pre-schism Western saint known for his biblical scholarship and historical writing.",
          bestFor: ["History", "Biblical studies", "Classical education"],
        },
      ],
    },
    {
      label: "Saints of science & medicine",
      entries: [
        {
          n: "St Luke the Evangelist",
          why: "Traditionally regarded as a physician, historian, and author — especially fitting for studies that join medicine, science, and writing.",
          bestFor: ["Science", "Medicine", "Writing"],
        },
        {
          n: "St Luke of Crimea",
          why: "A modern saint who was both a surgeon and a bishop — a witness to the harmony of faith and scientific learning.",
          bestFor: ["Science", "Medicine", "Academic study"],
        },
      ],
    },
    {
      label: "Saints of music & the arts",
      entries: [
        {
          n: "St Romanos the Melodist",
          why: "One of the Church’s greatest hymnographers and poets.",
          bestFor: ["Music", "Literature", "Creative writing"],
        },
        {
          n: "St John of Damascus",
          why: "A major theologian, hymnographer, and defender of the holy icons.",
          bestFor: ["Theology", "Writing", "Sacred arts"],
        },
      ],
    },
  ],
  vignette: {
    title: "A library prayer corner",
    panels: [
      { label: "St Catherine" },
      { label: "Christ", big: true },
      { label: "Cyril & Methodius" },
    ],
    note: "Christ the Teacher among bookshelves, a globe and maps, a writing desk, and a small prayer corner.",
  },
  facts: [
    ["Most universal icon", "Christ the Teacher"],
    ["Most universal educational saint", "St Catherine of Alexandria"],
    ["Most important literacy saints", "Sts Cyril & Methodius"],
    ["Most important teaching saints", "St Basil · St John Chrysostom"],
    ["For history", "St Nestor the Chronicler"],
    ["For science", "St Luke the Evangelist"],
    ["For music", "St Romanos the Melodist"],
  ],
  regions: [
    {
      place: "Russia",
      icons: ["St Sergius of Radonezh", "Christ", "St John of Kronstadt"],
      custom:
        "Study spaces often emphasize saints associated with learning and spiritual formation.",
    },
    {
      place: "Greece",
      icons: ["St Catherine", "St Basil", "St John Chrysostom"],
      custom:
        "The Cappadocian Fathers are especially revered as models of Christian education.",
    },
    {
      place: "Serbia",
      icons: ["St Sava", "Christ", "Sts Cyril & Methodius"],
      custom:
        "St Sava is honored as the founder of Serbian education — among the most important educational saints in Serbian Orthodoxy.",
    },
    {
      place: "Romania",
      icons: ["St John Chrysostom", "St Basil", "Sts Cyril & Methodius"],
      custom:
        "Educational saints are commonly displayed in schools and family study areas.",
    },
    {
      place: "Antioch",
      icons: [
        "St John Chrysostom",
        "St John of Damascus",
        "Christ the Teacher",
      ],
      custom:
        "Theological learning and biblical study are often given pride of place.",
    },
  ],
  recs: [
    {
      label: "Reading & literacy",
      saints: ["Sts Cyril & Methodius", "St Clement of Ohrid"],
    },
    {
      label: "History",
      saints: ["St Nestor the Chronicler", "St Bede the Venerable"],
    },
    {
      label: "Writing",
      saints: ["St John Chrysostom", "St Nestor", "St Romanos the Melodist"],
    },
    { label: "Languages", saints: ["Sts Cyril & Methodius"] },
    {
      label: "Science",
      saints: ["St Luke the Evangelist", "St Luke of Crimea"],
    },
    {
      label: "Medicine",
      saints: [
        "St Luke the Evangelist",
        "St Luke of Crimea",
        "Sts Cosmas & Damian",
      ],
    },
    {
      label: "Music",
      saints: ["St Romanos the Melodist", "St John of Damascus"],
    },
    {
      label: "Theology",
      saints: [
        "St Basil the Great",
        "St John Chrysostom",
        "St John of Damascus",
      ],
    },
  ],
  historical: {
    title: "Historical & devotional notes",
    items: [
      {
        label: "Strong historical associations",
        list: [
          "St Catherine",
          "St Basil",
          "St John Chrysostom",
          "Sts Cyril & Methodius",
          "St Nestor",
        ],
      },
      {
        label: "Strong educational traditions",
        list: [
          "St Clement of Ohrid",
          "St Naum of Ohrid",
          "St Sergius of Radonezh",
        ],
      },
      {
        label: "Subject-specific modern favorites",
        list: ["St Luke of Crimea", "St Romanos the Melodist"],
      },
    ],
  },
  note: "Orthodox education seeks not merely the accumulation of knowledge, but the formation of wisdom, virtue, and the love of God.",
  sources: [
    "Orthodox Church in America (OCA) — Lives of St Catherine, St Basil the Great, St John Chrysostom, Sts Cyril & Methodius, St Sergius of Radonezh, St Nestor the Chronicler, and St Romanos the Melodist.",
    "OrthodoxWiki — Catherine of Alexandria, Cyril & Methodius, Sergius of Radonezh, Nestor the Chronicler, Romanos the Melodist, and Luke of Crimea.",
  ],
  related: ["catherine", "basil", "chrysostom", "sergius"],
};

export const IH_GARDEN: IhRichCard = {
  id: "garden",
  glyph: "leaf",
  kicker: "The Work of the Earth",
  title: "Garden, Orchard & God’s Creation",
  regionsTitle: "Regional customs in the garden",
  relatedLabel: "Garden & creation patrons in our database",
  intro:
    "From the Garden of Eden to the gardens of the monasteries, Orthodox Christianity has long seen the cultivation of the earth as a sacred stewardship entrusted to humanity by God. Gardens give food, beauty, rest, and the chance to care for creation. There is no universal rule assigning particular icons to a garden, yet many place an icon or an outdoor shrine among the plants — dedicated to saints of agriculture, cultivation, creation, and God’s providence.",
  groups: [
    {
      label: "Primary icons · the most universal",
      entries: [
        {
          n: "Jesus Christ",
          why: "Christ is Lord of all creation; His presence reminds us that the earth and its fruits ultimately belong to God.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "The Theotokos",
          sub: "Mother of God",
          why: "In Orthodox hymnography the Mother of God is linked to gardens, vineyards, fruitful land, and spiritual fertility; outdoor shrines to the Theotokos are common throughout Orthodox lands.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
      ],
    },
    {
      label: "Primary saints of gardens & agriculture",
      entries: [
        {
          n: "St Phocas the Gardener",
          why: "A gardener by trade and one of the saints most directly tied to gardening — remembered for tending his garden while offering hospitality to travelers and the poor.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: ["Vegetable gardens", "Flower gardens", "Family gardens"],
        },
        {
          n: "St Conon the Gardener",
          why: "Commemorated specifically as a gardener and agricultural laborer — among the clearest patrons for those who cultivate the land.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: ["Home gardens", "Farms", "Orchards"],
        },
        {
          n: "St Tryphon",
          why: "Traditionally invoked for crops, vineyards, orchards, and protection from pests — especially beloved in the farming regions of Greece, Serbia, Bulgaria, Romania, and Russia.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: ["Vineyards", "Orchards", "Farms", "Agricultural land"],
        },
      ],
    },
    {
      label: "Saints of creation & stewardship",
      entries: [
        {
          n: "St Herman of Alaska",
          id: "herman",
          why: "Remembered for his love of the natural world and his simple life close to creation.",
          bestFor: ["Nature gardens", "Wildlife gardens", "Native plantings"],
        },
        {
          n: "St Seraphim of Sarov",
          id: "seraphim",
          why: "His life reflects a deep harmony with God’s creation; many associate him with forests, animals, and contemplation in nature.",
          bestFor: ["Prayer gardens", "Woodland gardens", "Retreat spaces"],
        },
      ],
    },
    {
      label: "Monastic garden traditions",
      entries: [
        {
          n: "St Anthony the Great",
          id: "anthony",
          why: "The father of Christian monasticism, whose life inspired generations of monks who cultivated gardens as part of their ascetic labor.",
          bestFor: ["Monastic-style gardens", "Prayer gardens"],
        },
        {
          n: "St Pachomius the Great",
          why: "His monastic communities often supported themselves through agriculture and cultivation.",
          bestFor: ["Large gardens", "Community gardens"],
        },
      ],
    },
    {
      label: "Saints of bees, fruit & harvest",
      entries: [
        {
          n: "St Modomnoc of Ossory",
          why: "A pre-schism Western Orthodox saint traditionally associated with beekeeping.",
          footLabel: "Historical confidence",
          foot: "High.",
          bestFor: ["Apiaries", "Pollinator gardens"],
        },
        {
          n: "The Prophet Elijah",
          id: "elias",
          why: "Deeply connected throughout Scripture with rain, drought, harvest, and God’s provision.",
          bestFor: ["Agricultural land", "Farms"],
        },
      ],
    },
    {
      label: "Icons of creation",
      entries: [
        {
          n: "Paradise",
          sub: "the Garden of Eden",
          why: "A reminder of humanity’s original vocation to cultivate and care for creation.",
        },
        {
          n: "The Hospitality of Abraham",
          sub: "icon",
          why: "Often associated with outdoor spaces and trees, for its setting beneath the Oak of Mamre.",
        },
        {
          n: "The Theotokos the Unfading Bloom",
          sub: "icon",
          why: "A beloved icon depicting the Mother of God amidst floral imagery.",
          bestFor: ["Flower gardens", "Marian gardens"],
        },
      ],
    },
  ],
  vignette: {
    title: "A garden shrine",
    panels: [
      { label: "Theotokos" },
      { label: "Christ", big: true },
      { label: "St Phocas" },
    ],
    note: "A small outdoor shrine among flowers and fruit trees, with a stone path and a bench for prayer.",
  },
  facts: [
    ["Most universal outdoor icon", "The Theotokos"],
    ["Most traditional gardening saint", "St Phocas the Gardener"],
    ["Most traditional agricultural saint", "St Tryphon"],
    ["Most traditional orchard saint", "St Tryphon"],
    ["Most traditional gardener saint", "St Conon the Gardener"],
    ["For a prayer garden", "St Seraphim of Sarov"],
  ],
  regions: [
    {
      place: "Russia",
      icons: ["St Tryphon", "St Seraphim of Sarov", "St Herman of Alaska"],
      custom:
        "Garden shrines and outdoor icons are often placed near vegetable plots, orchards, or the dacha.",
    },
    {
      place: "Greece",
      icons: ["St Tryphon", "St Phocas", "Theotokos"],
      custom:
        "Many homes keep an outdoor shrine to the Mother of God, surrounded by flowers and gardens.",
    },
    {
      place: "Serbia",
      icons: ["St Tryphon", "Family Slava saint"],
      custom: "St Tryphon is especially honored in the vineyard regions.",
    },
    {
      place: "Romania",
      icons: ["St Tryphon", "Theotokos", "Prophet Elijah"],
      custom:
        "Blessings of the fields, orchards, and vineyards remain a living part of local tradition.",
    },
    {
      place: "Antioch",
      icons: ["Prophet Elijah", "St George", "Theotokos"],
      custom:
        "Agricultural blessings are often tied to local saints and their feast days.",
    },
  ],
  historical: {
    title: "Historical & devotional notes",
    items: [
      {
        label: "Strong historical associations",
        list: ["St Phocas the Gardener", "St Conon the Gardener", "St Tryphon"],
      },
      {
        label: "Strong agricultural traditions",
        list: ["The Prophet Elijah", "St Modomnoc"],
      },
      {
        label: "Popular modern devotions",
        list: ["St Herman of Alaska", "St Seraphim of Sarov"],
      },
    ],
  },
  note: "Orthodox gardens remind us that humanity’s first vocation was to tend and to care for the creation of God.",
  related: ["seraphim", "herman", "anthony", "elias"],
};

export const IH_KITCHEN: IhRichCard = {
  id: "kitchen",
  glyph: "pot",
  kicker: "Thanksgiving & Hospitality",
  title: "Kitchen & Preparation of Meals",
  regionsTitle: "Regional customs in the kitchen",
  recsTitle: "Special recommendations",
  relatedLabel: "Kitchen & hospitality patrons in our database",
  intro:
    "The kitchen has long been one of the busiest rooms in an Orthodox home — where food is prepared, feast days are kept, fasts are observed, and hospitality begins. There is no universal rule about kitchen icons, yet many families place images that emphasize service, hospitality, provision, and gratitude for the gifts of God.",
  groups: [
    {
      label: "Primary icons · the most universal",
      entries: [
        {
          n: "Jesus Christ",
          why: "Every meal ultimately comes from God’s provision; an icon of Christ reminds those preparing food that even ordinary tasks can be offered to God.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "The Theotokos",
          sub: "Mother of God",
          why: "The Mother of God is associated with care, nurture, and the life of the household; her icon is often found in kitchens and family gathering spaces.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
      ],
    },
    {
      label: "Primary saint of the kitchen",
      entries: [
        {
          n: "St Euphrosynos the Cook",
          why: "A monastery cook, and the closest the Orthodox Church has to a traditional patron of cooks and kitchens. His humility, obedience, and faithful service in an ordinary task made him one of the most beloved saints of food preparation.",
          footLabel: "Traditions",
          foot: "Greek, Russian, Serbian, Romanian, Antiochian, and monastic traditions.",
          footLabel2: "Historical confidence",
          foot2: "Very high.",
          bestFor: ["Kitchens", "Family cooks", "Bakers", "Professional chefs"],
        },
      ],
    },
    {
      label: "Saints of hospitality",
      entries: [
        {
          n: "St Martha of Bethany",
          why: "Martha welcomed Christ into her home and served Him through hospitality — one of the strongest biblical examples of Christian service within the household.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: ["Kitchens", "Family meals", "Hospitality"],
        },
        {
          n: "St Mary of Bethany",
          why: "Mary reminds us that service should be joined to prayer and attentiveness to Christ; together, Martha and Mary give a balanced model of hospitality and devotion.",
          bestFor: ["Family homes", "Christian hospitality"],
        },
        {
          n: "Abraham & Sarah",
          why: "Their hospitality to the three visitors at Mamre became one of Scripture’s foundational examples of welcoming the stranger and caring for the guest.",
          bestFor: ["Homes that host", "Family kitchens"],
        },
      ],
    },
    {
      label: "Saints of charity & feeding others",
      entries: [
        {
          n: "St John the Merciful",
          why: "Known for providing food and care for the poor — a witness of generosity and practical charity.",
          bestFor: ["Charitable households", "Feeding ministries"],
        },
        {
          n: "St Philaret the Merciful",
          why: "Remembered for sharing his resources with those in need despite his own hardship.",
          bestFor: ["Generous households", "Hospitality"],
        },
      ],
    },
    {
      label: "Icons associated with food & hospitality",
      entries: [
        {
          n: "Christ Blessing the Bread",
          sub: "icon",
          why: "A reminder that all food comes from the provision of God.",
          bestFor: ["Kitchen walls", "Dining spaces"],
        },
        {
          n: "The Hospitality of Abraham",
          sub: "icon",
          why: "A visual telling of one of the most important biblical stories of hospitality.",
          bestFor: ["Kitchens", "Dining rooms", "Guest spaces"],
        },
        {
          n: "Christ in the House of Martha and Mary",
          sub: "icon",
          why: "One of the most fitting Gospel scenes for a kitchen or a family gathering space.",
          bestFor: ["Family kitchens", "Hospitable homes"],
        },
      ],
    },
  ],
  vignette: {
    title: "A kitchen corner",
    panels: [
      { label: "St Euphrosynos" },
      { label: "Christ", big: true },
      { label: "Martha & Mary" },
    ],
    note: "Christ blessing the bread, with herbs and vegetables, a wooden table, and the family recipe books below.",
  },
  facts: [
    ["Most universal icons", "Christ · the Theotokos"],
    ["Most traditional kitchen saint", "St Euphrosynos the Cook"],
    ["Most traditional hospitality saints", "Sts Martha & Mary of Bethany"],
    ["Most traditional hospitality icon", "The Hospitality of Abraham"],
    ["Most fitting Gospel scene", "Christ in the House of Martha & Mary"],
  ],
  regions: [
    {
      place: "Russia",
      icons: ["St Euphrosynos the Cook", "St Nicholas", "Christ"],
      custom:
        "Kitchen icons often emphasize gratitude and daily prayer before meals.",
    },
    {
      place: "Greece",
      icons: ["St Euphrosynos", "Sts Martha & Mary", "Theotokos"],
      custom:
        "Family cooking, feast-day preparation, and hospitality are strongly bound to Orthodox family life.",
    },
    {
      place: "Serbia",
      icons: ["Family Slava saint", "Christ", "St Euphrosynos"],
      custom:
        "The kitchen plays a central role in preparing Slava meals and festive gatherings.",
    },
    {
      place: "Romania",
      icons: ["Christ", "St Nicholas", "Theotokos"],
      custom:
        "Icons often overlook the spaces where bread and meals are prepared.",
    },
    {
      place: "Antioch",
      icons: ["Christ", "Sts Martha & Mary", "Theotokos"],
      custom:
        "Hospitality holds a particularly important place in many Middle Eastern Christian households.",
    },
  ],
  recs: [
    {
      label: "For home bakers",
      saints: ["St Euphrosynos the Cook", "St Martha of Bethany"],
    },
    {
      label: "For large families",
      saints: ["Christ", "Theotokos", "Sts Martha & Mary"],
    },
    {
      label: "For frequent hosts",
      saints: [
        "Abraham & Sarah",
        "Sts Martha & Mary",
        "The Hospitality of Abraham",
      ],
    },
    {
      label: "For parish & church cooks",
      saints: ["St Euphrosynos", "St John the Merciful"],
    },
  ],
  historical: {
    title: "Historical & devotional notes",
    items: [
      {
        label: "Strong historical associations",
        list: [
          "St Euphrosynos the Cook",
          "St Martha of Bethany",
          "St Mary of Bethany",
          "Abraham & Sarah",
        ],
      },
      {
        label: "Strong hospitality traditions",
        list: [
          "The Hospitality of Abraham",
          "Christ in the House of Martha & Mary",
        ],
      },
      {
        label: "Popular household devotions",
        list: [
          "St Nicholas",
          "St John the Merciful",
          "St Philaret the Merciful",
        ],
      },
    ],
  },
  note: "The Orthodox kitchen is not merely a place of work. It is where hospitality begins, where the feast is prepared, and where daily bread becomes an occasion for thanksgiving.",
  related: ["nicholas"],
};

export const IH_GARAGE: IhRichCard = {
  id: "garage",
  glyph: "car",
  kicker: "Safe Journeys",
  title: "Garage, Vehicles & Travel",
  regionsTitle: "Regional customs for travelers",
  recsTitle: "Special recommendations",
  relatedLabel: "Travel patrons in our database",
  intro:
    "Throughout Christian history, travelers have sought God’s protection before setting out by land or sea. Automobiles are modern, yet Orthodox Christians have naturally extended the ancient prayers for travelers to cars, garages, and the places of departure. There is no universal rule assigning icons to a garage, but many keep an icon near the vehicle or the door — a reminder to pray before leaving and to give thanks on returning safely.",
  groups: [
    {
      label: "Primary icons · the most universal",
      entries: [
        {
          n: "Jesus Christ",
          why: "Every journey takes place, in the end, under the providence of God; an icon of Christ reminds the traveler to entrust the road to Him.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
        {
          n: "The Theotokos",
          sub: "Mother of God",
          why: "The Mother of God has long been invoked for protection and guidance; her icon is commonly found in vehicles, garages, and travel prayer spaces.",
          footLabel: "Traditions",
          foot: "Universal throughout the Orthodox world.",
        },
      ],
    },
    {
      label: "Primary saint of travel",
      entries: [
        {
          n: "St Nicholas the Wonderworker",
          id: "nicholas",
          why: "The most universally recognized Orthodox patron of travelers — for centuries invoked by sailors, merchants, pilgrims, and all who undertake a journey.",
          footLabel: "Traditions",
          foot: "Greek, Russian, Serbian, Romanian, Antiochian, Georgian, and throughout the Orthodox world.",
          footLabel2: "Historical confidence",
          foot2: "Very high.",
          bestFor: ["Garages", "Vehicles", "Travel corners", "Entryways"],
        },
      ],
    },
    {
      label: "Saints of journeys & pilgrimage",
      entries: [
        {
          n: "The Archangel Raphael",
          why: "In the Book of Tobit, Raphael accompanies and protects Tobias on his journey — making him one of the most fitting heavenly protectors for travelers.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: ["Road trips", "Family travel", "Pilgrimages"],
        },
        {
          n: "Righteous Tobias",
          sub: "of the Book of Tobit",
          why: "His journey under the guidance of the Archangel Raphael makes him an important biblical figure connected with travel.",
          bestFor: ["Family travel", "Pilgrimages", "Young travelers"],
        },
        {
          n: "The Apostle Paul",
          why: "Few saints traveled more widely — his missionary journeys carried him across the Mediterranean world by foot and by sea.",
          footLabel: "Historical confidence",
          foot: "Very high.",
          bestFor: [
            "Long-distance travelers",
            "Missionaries",
            "Frequent travelers",
          ],
        },
      ],
    },
    {
      label: "Saints of pilgrims & wayfarers",
      entries: [
        {
          n: "St Xenia of St Petersburg",
          id: "xenia",
          why: "Though not strictly a travel saint, her life as a wandering pilgrim and stranger has made her a beloved companion for many on the road.",
          footLabel: "Historical confidence",
          foot: "Moderate.",
        },
        {
          n: "St John the Russian",
          why: "His life knew displacement, captivity, and endurance far from home.",
          bestFor: ["Military families", "Travelers far from home"],
        },
      ],
    },
    {
      label: "Protectors of those on the road",
      entries: [
        {
          n: "The Archangel Michael",
          why: "As commander of the heavenly hosts, Michael is often chosen by those seeking protection during travel.",
          bestFor: ["Family vehicles", "Garages", "Travel prayer spaces"],
        },
        {
          n: "The Guardian Angel",
          why: "Many pray to their guardian angel before setting out and keep a Guardian Angel icon in the vehicle.",
          bestFor: ["Drivers", "Children traveling", "Family vehicles"],
        },
      ],
    },
    {
      label: "Icons associated with travel",
      entries: [
        {
          n: "The Flight into Egypt",
          sub: "icon",
          why: "Depicting the Holy Family’s journey and God’s protection on the road.",
          bestFor: ["Family travel", "Pilgrim spaces"],
        },
        {
          n: "Tobit and Raphael",
          sub: "icon",
          why: "One of the strongest biblical images associated with a safe journey.",
          bestFor: ["Garages", "Travel corners", "Pilgrimage preparation"],
        },
      ],
    },
  ],
  vignette: {
    title: "A travel prayer corner",
    panels: [
      { label: "Theotokos" },
      { label: "St Nicholas", big: true },
      { label: "Archangel Raphael" },
    ],
    note: "St Nicholas and the Archangel Raphael with a small travel cross, a road map, and the pilgrim’s pack ready by the door.",
  },
  facts: [
    ["Most universal travel saint", "St Nicholas"],
    ["Biblical travel protector", "The Archangel Raphael"],
    ["Most traditional travel icon", "Tobit and Raphael"],
    ["Most universal protective figure", "The Guardian Angel"],
    ["For pilgrims", "The Apostle Paul"],
  ],
  regions: [
    {
      place: "Russia",
      icons: ["St Nicholas", "Guardian Angel", "Archangel Michael"],
      custom:
        "Small travel icons are often kept in vehicles, and prayers for travelers are widely practiced.",
    },
    {
      place: "Greece",
      icons: ["St Nicholas", "Theotokos", "Archangel Michael"],
      custom:
        "Drivers often carry small icons in their cars and pray before a long journey.",
    },
    {
      place: "Serbia",
      icons: ["St Nicholas", "Family Slava saint"],
      custom:
        "Many families place icons in the vehicle or near the garage entrance.",
    },
    {
      place: "Romania",
      icons: ["St Nicholas", "Archangel Raphael", "Theotokos"],
      custom:
        "Travel prayers are often said before long trips and pilgrimages.",
    },
    {
      place: "Antioch",
      icons: ["St Nicholas", "Archangel Raphael", "Theotokos"],
      custom:
        "Pilgrimage traditions have helped preserve devotion to the saints of safe travel.",
    },
  ],
  recs: [
    {
      label: "For daily commuters",
      saints: ["St Nicholas", "The Guardian Angel"],
    },
    {
      label: "For family road trips",
      saints: ["Archangel Raphael", "Righteous Tobias", "Theotokos"],
    },
    {
      label: "For pilgrimages",
      saints: ["The Apostle Paul", "St Nicholas", "Archangel Raphael"],
    },
    {
      label: "For military families",
      saints: ["Archangel Michael", "St John the Russian"],
    },
  ],
  historical: {
    title: "Historical & devotional notes",
    items: [
      {
        label: "Strong historical associations",
        list: [
          "St Nicholas",
          "Archangel Raphael",
          "Righteous Tobias",
          "The Apostle Paul",
        ],
      },
      {
        label: "Strong protective traditions",
        list: ["Archangel Michael", "The Guardian Angel"],
      },
      {
        label: "Popular modern devotions",
        list: ["St Xenia of St Petersburg", "St John the Russian"],
      },
    ],
  },
  note: "For centuries Orthodox Christians have prayed before setting out on a journey — asking God to guide them safely and to bring them home in peace.",
  related: ["nicholas", "xenia"],
};

export const IH_ICONCORNER: IhRichCard = {
  id: "icon-corner",
  glyph: "corner",
  kicker: "The Heart of the Home",
  title: "Icon Corner, Prayer Corner & the Domestic Church",
  regionsTitle: "Examples by tradition",
  recsTitle: "Choosing icons for the corner",
  relatedLabel: "Beloved corner saints in our database",
  intro:
    "The icon corner is the spiritual heart of the Orthodox home. Unlike many other rooms in this guide, it rests on a genuine and ancient tradition throughout the Orthodox world: a dedicated place of prayer, oriented toward the east wherever practical, where the family gathers for morning and evening prayers, reads Scripture, keeps the feasts, and remembers the saints and the departed. It is not decoration — it is a visible sign that the Christian home is called to be a “little church,” its daily life centered upon Christ.",
  callout: {
    title: "The traditional arrangement",
    lines: [
      "Christ is placed on the right.",
      "The Theotokos is placed on the left.",
      "A cross stands above or between them.",
      "Other saints are gathered around them.",
    ],
    foot: "On a smaller scale, the corner mirrors the iconostasis of an Orthodox church.",
  },
  groups: [
    {
      label: "Primary icons · essential",
      entries: [
        {
          n: "Jesus Christ",
          sub: "Pantocrator or Savior",
          why: "Christ is always the central icon of the Orthodox home; every icon corner begins with Him.",
          footLabel: "Historical confidence",
          foot: "Certain.",
        },
        {
          n: "The Theotokos",
          sub: "Mother of God",
          why: "Traditionally placed opposite Christ — together these two icons form the foundation of the home prayer corner.",
          footLabel: "Historical confidence",
          foot: "Certain.",
        },
      ],
    },
    {
      label: "Foundational additions",
      entries: [
        {
          n: "The Holy Cross",
          why: "The primary symbol of Christ’s victory over death, and among the oldest elements of a Christian prayer space.",
          footLabel: "Traditions",
          foot: "Universal.",
        },
        {
          n: "The Family’s Patron Saints",
          why: "Orthodox Christians have long included icons of their baptismal patrons — St Nicholas, St George, St Catherine, St Herman of Alaska, and each family’s own patrons.",
          footLabel: "Historical confidence",
          foot: "Very high.",
        },
        {
          n: "The Guardian Angel",
          why: "Icons of the Guardian Angel are commonly included as reminders of God’s care and protection.",
          footLabel: "Most common in",
          foot: "Slavic traditions, but found throughout Orthodoxy.",
        },
      ],
    },
    {
      label: "Most common additional saints",
      entries: [
        {
          n: "St John the Forerunner",
          why: "As the greatest of the prophets and forerunner of Christ, his icon is often included alongside Christ and the Theotokos.",
          footLabel: "Historical confidence",
          foot: "Very high.",
        },
        {
          n: "St Nicholas the Wonderworker",
          id: "nicholas",
          why: "One of the most beloved and universally recognized saints of the Orthodox world.",
          footLabel: "Historical confidence",
          foot: "Very high.",
        },
        {
          n: "St George the Trophy-Bearer",
          id: "george",
          why: "A common household saint throughout Greece, the Balkans, the Middle East, and Eastern Europe.",
          footLabel: "Historical confidence",
          foot: "High.",
        },
        {
          n: "Local or Family Saints",
          why: "Families often include saints tied to their ancestry, parish, jurisdiction, profession, or homeland.",
        },
      ],
    },
    {
      label: "Traditional items found in the corner",
      entries: [
        {
          n: "Prayer Books",
          why: "For daily prayers, canons, akathists, and the reading of Scripture.",
        },
        {
          n: "The Bible or Gospel Book",
          why: "The Word of God traditionally holds a place of honor.",
        },
        {
          n: "A Vigil Lamp",
          sub: "lampada",
          why: "A small flame kept burning, a sign of continual prayer and devotion.",
        },
        {
          n: "An Incense Burner",
          why: "Used during family prayer and on feast days.",
        },
        {
          n: "A Prayer Rope",
          why: "For the Jesus Prayer and personal prayer.",
        },
        {
          n: "Holy Water",
          why: "Often kept nearby for the blessing of the household.",
        },
        {
          n: "Blessed Palms or Willow",
          why: "Many families keep blessed items from the great feasts.",
        },
        {
          n: "Commemoration Lists",
          why: "The names of the living and the departed, for whom prayers are offered.",
        },
      ],
    },
  ],
  vignette: {
    title: "A home iconostasis",
    panels: [
      { label: "Theotokos" },
      { label: "Christ Pantocrator", big: true },
      { label: "St Nicholas" },
    ],
    note: "Christ and the Theotokos with a cross above, a vigil lamp, prayer books, an incense burner, and a prayer rope.",
  },
  facts: [
    ["Most essential icon", "Jesus Christ"],
    ["Second most essential", "The Theotokos"],
    ["Most universal additional saint", "St Nicholas"],
    ["Most universal family addition", "The patron saint"],
    ["Most traditional Slavic addition", "The Guardian Angel"],
    ["Most traditional Serbian addition", "The family Slava saint"],
  ],
  regions: [
    {
      place: "Russia",
      icons: [
        "Christ",
        "Theotokos",
        "St Nicholas",
        "Guardian Angel",
        "Patron saints",
      ],
      custom:
        "The “beautiful” or “red” corner held the most honored place in the home; guests would greet the icons before greeting the family.",
    },
    {
      place: "Greece",
      icons: ["Christ", "Theotokos", "St John the Baptist", "Patron saints"],
      custom:
        "Prayer corners frequently include a vigil lamp, incense, prayer books, and the family’s baptismal icons.",
    },
    {
      place: "Serbia",
      icons: ["Christ", "Theotokos", "Family Slava saint"],
      custom:
        "The Slava saint often holds a prominent place within the family icon corner.",
    },
    {
      place: "Romania",
      icons: ["Christ", "Theotokos", "St Nicholas", "Patron saints"],
      custom:
        "Many homes add embroidered cloths, vigil lamps, and icons inherited through generations.",
    },
    {
      place: "Antioch",
      icons: ["Christ", "Theotokos", "St John the Baptist", "Patron saints"],
      custom:
        "The corner is often the primary place for family prayer and the reading of Scripture.",
    },
  ],
  recs: [
    {
      label: "Especially appropriate",
      saints: [
        "Christ Pantocrator",
        "Theotokos of Kazan",
        "The Vladimir Theotokos",
        "Christ the Teacher",
        "St John the Baptist",
        "St Nicholas",
        "Family patron saints",
        "Local saints",
        "The Guardian Angel",
      ],
    },
    {
      label: "Keep the center on",
      saints: [
        "Christ",
        "The Theotokos",
        "Let no secondary saint crowd them out",
      ],
    },
  ],
  historical: {
    title: "Historical & devotional notes",
    items: [
      {
        label: "Strong historical foundations",
        list: ["Christ", "The Theotokos", "The Cross", "Family patron saints"],
      },
      {
        label: "Very common additions",
        list: ["St John the Baptist", "St Nicholas", "The Guardian Angel"],
      },
      {
        label: "Regional traditions",
        list: ["The Slava saint (Serbian)", "Local saints", "Family saints"],
      },
    ],
  },
  note: "The icon corner is the spiritual heart of the Orthodox home — a place where heaven and earth meet in daily prayer.",
  sources: [
    "OrthodoxWiki — “Icon Corner.”  Orthodox Church in America (OCA) — “Icons” and “Setting Up an Icon Corner.”",
    "Kallistos Ware, The Orthodox Way · Thomas Hopko, The Orthodox Faith, Vol. 4: Worship · Uspensky & Lossky, The Meaning of Icons.",
  ],
  related: ["nicholas", "george", "catherine", "herman"],
};

/* The entryway uses a bespoke card (richer door guide) in the mockup. */
export interface IhEntryData {
  intro: string;
  primary: { n: string; sub?: string; why: string; trad: string }[];
  additional: { n: string; id?: string; why: string; where: string }[];
  regions: { place: string; icons: string[]; custom: string }[];
  facts: [string, string][];
  tooltip: string;
}
export const IH_ENTRY: IhEntryData = {
  intro:
    "The entrance of the home is the threshold between the outside world and the domestic church. Orthodox Christianity has no universal rule requiring particular icons at the front door, yet many traditions place icons near the entrance — so that those who live here may begin and end every journey with prayer, and remember that the home belongs to Christ.",
  primary: [
    {
      n: "Christ the Savior",
      why: "Christ is the head of the household and the center of every Orthodox home. His icon near the entrance is a reminder that all who enter are received under His lordship.",
      trad: "Greek, Russian, Serbian, Romanian, Antiochian, Georgian, and other traditions.",
    },
    {
      n: "The Theotokos",
      sub: "Mother of God",
      why: "The Theotokos is most often paired with Christ in the Orthodox home. Her presence at the entrance reflects her role as protector and intercessor for the Christian family.",
      trad: "Found throughout the Orthodox world.",
    },
  ],
  additional: [
    {
      n: "St Nicholas the Wonderworker",
      id: "nicholas",
      why: "One of the most beloved saints of the Church, traditionally invoked for travelers, sailors, merchants, and all who set out on a journey. His icon by the door reminds the family to seek God’s blessing before leaving home.",
      where: "Russian, Serbian, Romanian, and other Slavic traditions.",
    },
    {
      n: "Archangel Michael",
      why: "As commander of the heavenly hosts, the Archangel Michael is associated with protection. His icon is chosen by families seeking a visible reminder of God’s guard over the household.",
      where: "Greek, Romanian, Antiochian, Serbian, and Russian traditions.",
    },
  ],
  regions: [
    {
      place: "Russia",
      icons: ["Christ", "Theotokos", "St Nicholas"],
      custom:
        "Many Russian homes historically kept small icons near the entrance in addition to the main icon corner. The family would cross themselves before departing and give thanks upon returning.",
    },
    {
      place: "Greece",
      icons: ["Christ the Savior", "Theotokos"],
      custom:
        "The home is often called a “little church” (mikrá ekklsía). Christ and the Theotokos remain the primary household icons and may be displayed prominently near the entrance.",
    },
    {
      place: "Serbia",
      icons: ["Family Slava saint", "Christ", "Theotokos"],
      custom:
        "Many Serbian families display the icon of their Slava saint in a prominent place, visible to every visitor entering the home.",
    },
    {
      place: "Romania",
      icons: ["Christ", "Theotokos", "St Nicholas", "Archangel Michael"],
      custom:
        "Entrance icons are often tied to household blessings and to prayers for protection over those entering and leaving the home.",
    },
    {
      place: "Antioch",
      icons: ["Christ", "Theotokos", "Archangel Michael"],
      custom:
        "The entrance serves as an extension of the family’s prayer life, with icons placed where they are immediately seen on entering.",
    },
  ],
  facts: [
    ["Most universal icons", "Christ · the Theotokos"],
    ["Most common protective saint", "Archangel Michael"],
    ["Most common travel saint", "St Nicholas the Wonderworker"],
    ["Most common family-specific icon", "Patron or Slava saint"],
  ],
  tooltip:
    "Many Orthodox families place icons near the entrance so that every departure and return may begin with prayer and thanksgiving.",
};

/* Map room id → the rich card data (entryway/icon-corner handled specially). */
export const IH_RICH: Record<string, IhRichCard> = {
  office: IH_OFFICE,
  dining: IH_DINING,
  "parents-room": IH_PARENTS,
  "guest-room": IH_GUEST,
  "childrens-room": IH_CHILDREN,
  homeschool: IH_HOMESCHOOL,
  garden: IH_GARDEN,
  kitchen: IH_KITCHEN,
  garage: IH_GARAGE,
  "icon-corner": IH_ICONCORNER,
};

/* =====================================================================
   PATRON SAINTS BY SUBJECT (homeschool) · FAQ · FINDER · TRADITIONS
   ===================================================================== */
export const IH_SUBJECTS: {
  subject: string;
  saint: string;
  id: string;
  glyph: string;
}[] = [
  {
    subject: "Reading & Letters",
    saint: "Sts Cyril & Methodius",
    id: "cyril-methodius",
    glyph: "book",
  },
  {
    subject: "History",
    saint: "St Nestor the Chronicler",
    id: "nestor",
    glyph: "book",
  },
  {
    subject: "Science & Medicine",
    saint: "St Luke the Physician",
    id: "luke",
    glyph: "tools",
  },
  {
    subject: "Music & Hymnody",
    saint: "St Romanos the Melodist",
    id: "romanos",
    glyph: "book",
  },
  {
    subject: "Rhetoric & Speech",
    saint: "St John Chrysostom",
    id: "chrysostom",
    glyph: "book",
  },
  {
    subject: "Philosophy",
    saint: "St Catherine of Alexandria",
    id: "catherine",
    glyph: "book",
  },
];

export const IH_FAQ: { q: string; a: string }[] = [
  {
    q: "Can icons go in every room?",
    a: 'Yes. Many Orthodox homes keep at least one icon in every room, so that wherever you are, you are reminded of Christ and can lift up a prayer. There is no room that is "too ordinary" to be sanctified.',
  },
  {
    q: "Can icons be placed above televisions?",
    a: "There is no canon forbidding it, but many people prefer not to, simply because it can feel incongruous to pray before an icon and be entertained in the same glance. A common gentle solution is to give the icon its own wall, or to place it where the eye naturally turns in prayer.",
  },
  {
    q: "Should icons face east?",
    a: "The eastern wall is the traditional place for the main icon corner, since we pray facing east toward the rising sun, an image of the coming of Christ. But this is a beautiful custom, not a rule. If the layout of your home makes east impractical, simply choose a fitting, honorable place.",
  },
  {
    q: "Can I have icons in the bathroom?",
    a: "Customs vary. Many keep icons out of the bathroom out of a sense of reverence, while others keep a small cross there. Use prudence and ask your parish priest if you are unsure; the guiding principle is honor, not anxiety.",
  },
  {
    q: "How many icons should I own?",
    a: "As few or as many as draw you to prayer. A home with two icons and a home with two hundred can both be houses of prayer. Begin with Christ and the Theotokos and your patron saint, and let your collection grow naturally over the years.",
  },
  {
    q: "What if I live in an apartment?",
    a: "An icon corner needs no special architecture, only a small honored space. A shelf, the top of a bookcase, or a corner of one wall is more than enough. The Kingdom of God is not measured in square feet.",
  },
  {
    q: "Can children have icons in their rooms?",
    a: "Absolutely, and it is a beautiful practice. Hang them low enough for a child to see and venerate, include their patron saint and Guardian Angel, and let the saints become familiar friends from the earliest age.",
  },
];

export const IH_FINDER: Record<string, { n: string; id: string }[]> = {
  Kitchen: [
    { n: "St Euphrosynos the Cook", id: "euphrosynos" },
    { n: "St Martha of Bethany", id: "martha" },
  ],
  Bedroom: [
    { n: "Sts Peter & Fevronia", id: "peter-fevronia" },
    { n: "Sts Joachim & Anna", id: "joachim-anna" },
    { n: "St Xenia of St Petersburg", id: "xenia" },
  ],
  Nursery: [
    { n: "St Stylianos of Paphlagonia", id: "stylianos" },
    { n: "St Nicholas the Wonderworker", id: "nicholas" },
    { n: "The Holy Guardian Angel", id: "angel" },
  ],
  "Homeschool Room": [
    { n: "St Basil the Great", id: "basil" },
    { n: "St John Chrysostom", id: "chrysostom" },
    { n: "St Catherine of Alexandria", id: "catherine" },
  ],
  Garden: [
    { n: "St Phocas the Gardener", id: "phocas" },
    { n: "St Tryphon", id: "tryphon" },
    { n: "Prophet Elias", id: "elias" },
  ],
  Office: [
    { n: "St Spyridon of Trimythous", id: "spyridon" },
    { n: "St Luke the Physician", id: "luke" },
    { n: "St Joseph the Betrothed", id: "joseph" },
  ],
  Travel: [
    { n: "St Nicholas the Wonderworker", id: "nicholas" },
    { n: "St Christopher", id: "christopher" },
  ],
};

export const IH_TRADITIONS: { place: string; text: string }[] = [
  {
    place: "Greece",
    text: "The ikonostási often sits in the eastern corner with a hanging kandíli (oil lamp) kept lit, dried flowers from Holy Friday, and a sprig of basil from the Feast of the Cross.",
  },
  {
    place: "Russia",
    text: 'The "krasny ugol" — the beautiful, or "red," corner — holds the family icons high in the most honored corner; guests traditionally greet the icons before greeting the host.',
  },
  {
    place: "Serbia",
    text: "Homes honor a single patron saint through the Slava, the family feast; the Slava icon and candle hold pride of place and are passed down through generations.",
  },
  {
    place: "Romania",
    text: "Icons are often draped with an embroidered cloth (prosop) and set above the doorway, so that one venerates Christ on entering and leaving the home.",
  },
  {
    place: "Antioch",
    text: "Arab Orthodox homes keep icons of Christ, the Theotokos, and local saints such as St George, often near the entry, with a small censer used on feast days.",
  },
  {
    place: "America",
    text: "Converts and cradle faithful alike blend customs from many lands — an icon corner that gathers Greek, Russian, Serbian, and newly-glorified American saints under one roof.",
  },
];
