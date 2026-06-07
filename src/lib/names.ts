/* Name display helpers (ported from app.js). */

/* Strip leading "St.", "Sts", "Holy", "The" for sorting and head/epithet split. */
export function cleanName(name: string): string {
  return (name || "").replace(/^(Sts?\.?|Holy|The)\s+/i, "").trim();
}

/* Split a display name into a head + italic epithet, e.g.
   "Basil the Great" -> { title: "Basil", epithet: "the Great" }.
   A comma takes precedence: "Luke, Archbishop of Crimea" ->
   { title: "Luke", epithet: "Archbishop of Crimea" }. */
export function splitName(name: string): { title: string; epithet: string } {
  const n = cleanName(name);
  const comma = n.indexOf(",");
  if (comma !== -1) {
    return {
      title: n.slice(0, comma).trim(),
      epithet: n.slice(comma + 1).trim(),
    };
  }
  const m = n.match(/^(.+?)(\s+(?:of|the)\s+.+)$/i);
  if (m) return { title: m[1].trim(), epithet: m[2].trim() };
  return { title: n, epithet: "" };
}

/* Leading honorific / rank / office words to skip when finding a saint's own
   given-name initial for the monogram avatar. Our `Name` field routinely leads
   with a title ("Apostle Andrew", "Great Martyr George", "Elder Ephraim"), so a
   naive first letter would render the title's initial. Compared after stripping
   non-letters, so compound titles ("Apostle & Evangelist John") fall through to
   the name. This only affects the avatar letter, never the displayed heading. */
const HONORIFICS = new Set([
  "st",
  "sts",
  "saint",
  "saints",
  "holy",
  "most",
  "the",
  "blessed",
  "venerable",
  "righteous",
  "apostle",
  "apostles",
  "evangelist",
  "prophet",
  "prophetess",
  "martyr",
  "martyrs",
  "hieromartyr",
  "hieromartyrs",
  "new",
  "newmartyr",
  "newmartyrs",
  "virgin",
  "virginmartyr",
  "great",
  "greatmartyr",
  "protomartyr",
  "first",
  "firstmartyr",
  "archdeacon",
  "deacon",
  "unmercenary",
  "unmercenaries",
  "fool",
  "equal",
  "passion",
  "passionbearer",
  "bearer",
  "confessor",
  "enlightener",
  "wonderworker",
  "monk",
  "monastic",
  "nun",
  "abba",
  "abbot",
  "abbess",
  "elder",
  "fr",
  "father",
  "mother",
  "hieromonk",
  "hierarch",
  "bishop",
  "archbishop",
  "patriarch",
  "pope",
  "metropolitan",
  "priest",
  "priestmartyr",
  "child",
  "childmartyr",
  "nunmartyr",
  "venerablemartyr",
  "right",
  "rightbelieving",
  "believing",
  "king",
  "queen",
  "prince",
  "princess",
  "myrrh",
  "myrrhbearer",
  "healer",
  "physician",
  "reader",
  "forefather",
  "forefathers",
  "ancestor",
  "and",
  "of",
]);

/* The given-name initial for a saint's monogram avatar. Strips leading
   honorific / rank words (and the connectors between them) and returns the
   first letter of the remaining given name, uppercased. */
export function monogramLetter(name: string): string {
  const raw = (name || "").trim();
  const tokens = raw.split(/[\s&,;.]+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length) {
    const norm = tokens[i].toLowerCase().replace(/[^a-z]/g, "");
    if (norm && HONORIFICS.has(norm)) i++;
    else break;
  }
  const rest = (i < tokens.length ? tokens.slice(i).join(" ") : raw).match(
    /[A-Za-z]/,
  );
  return rest ? rest[0].toUpperCase() : "?";
}
