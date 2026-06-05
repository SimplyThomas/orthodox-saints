/* Name display helpers (ported from app.js). */

/* Strip leading "St.", "Sts", "Holy", "The" for sorting and head/epithet split. */
export function cleanName(name: string): string {
  return (name || "").replace(/^(Sts?\.?|Holy|The)\s+/i, "").trim();
}

/* Split a display name into a head + italic epithet, e.g.
   "Basil the Great" -> { title: "Basil", epithet: "the Great" }. */
export function splitName(name: string): { title: string; epithet: string } {
  const n = cleanName(name);
  const m = n.match(/^(.+?)(\s+(?:of|the)\s+.+)$/i);
  if (m) return { title: m[1].trim(), epithet: m[2].trim() };
  return { title: n, epithet: "" };
}
