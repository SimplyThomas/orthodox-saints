/* SVG motif builders (ported verbatim from app.js). Returned as SVG strings so
   they can be used both at build time (.astro via set:html) and inside the
   client islands (innerHTML). Thin .astro wrappers live in components/icons/. */

import { monogramLetter } from "./names";
import { esc, withBase } from "./format";

export function byzCross(
  size = 22,
  color = "currentColor",
  stroke = 2.2,
): string {
  return `<svg width="${size}" height="${size * 1.5}" viewBox="0 0 20 30" fill="none"
    stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" aria-hidden="true">
    <line x1="10" y1="2" x2="10" y2="28"/><line x1="6" y1="6.5" x2="14" y2="6.5"/>
    <line x1="3" y1="12" x2="17" y2="12"/><line x1="5.5" y1="21" x2="14.5" y2="18.5"/></svg>`;
}

export function searchGlyph(size = 22, color = "currentColor"): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}"
    stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/>
    <line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>`;
}

export function domeMark(w = 200, color = "#D4AF37"): string {
  let domes = "";
  [40, 100, 160].forEach((cx, i) => {
    const s = i === 1 ? 1.25 : 1;
    const top = i === 1 ? 6 : 22;
    domes += `<path d="M${cx} ${top - 6} v8" stroke="${color}" stroke-width="2.5"/>
      <path d="M${cx - 5} ${top} h10 M${cx} ${top - 4} v8" stroke="${color}" stroke-width="2.2" fill="none"/>
      <path d="M${cx - 16 * s} 100 C ${cx - 16 * s} ${72 - 8 * s}, ${cx - 18 * s} ${60 - 10 * s}, ${cx} ${top + 6}
        C ${cx + 18 * s} ${60 - 10 * s}, ${cx + 16 * s} ${72 - 8 * s}, ${cx + 16 * s} 100 Z"/>`;
  });
  return `<svg width="${w}" height="${w * 0.5}" viewBox="0 0 200 100" fill="${color}"
    style="width:100%;height:auto" aria-hidden="true">${domes}</svg>`;
}

/* The "reviewed dove" — a quiet seal that an entry has been fully reviewed by
   a human (profile status === "reviewed"). The emblem (a descending dove on a
   deep-indigo disc) is self-hosted vector at static/dove-emblem.svg; it appears
   beside a saint's name wherever a reviewed saint is shown. Returned as an HTML
   string so it composes into both .astro (set:html) and the client islands. */
export function reviewedDove(size = 22): string {
  return `<img class="reviewed-dove" src="${esc(withBase("dove-emblem.svg"))}" width="${size}" height="${size}" alt="Reviewed entry" title="This entry has been fully reviewed" loading="lazy" decoding="async" />`;
}

/* ---- Production tiered saint avatar (the design's SaintAvatar) ----
   Real icon when `image` is set; otherwise an auto monogram — the saint's
   given-name initial under a small cross, on a ground colour-coded by rank/type.
   `opts.awaiting` renders the not-yet-glorified treatment (neutral ground, no
   cross) so such figures stay visually distinct from canonised saints. This
   replaces the old repeating-figure `SaintIcon`, which is retired. */

const AVATAR_FRAME = "#a9852a";
const AVATAR_ARCH =
  "M6 24 a54 54 0 0 1 108 0 V144 a6 6 0 0 1 -6 6 H12 a6 6 0 0 1 -6 -6 Z";

interface AvatarColor {
  bg: string;
  ink: string;
}

/* Rank/type term → colour family, mirroring the `.tag.t-*` groupings in
   global.css so a saint's monogram and category chip share one colour. Martyr
   is checked before the monastic family so e.g. "Venerable-Martyr" reads red. */
function avatarColors(type: string, awaiting: boolean): AvatarColor {
  if (awaiting) return { bg: "#e7e2d6", ink: "#6a6256" };
  const t = (type || "").toLowerCase();
  const has = (...xs: string[]) => xs.some((x) => t.includes(x));
  if (
    has("apostle", "prophet", "evangelist", "confessor", "enlightener", "equal")
  )
    return { bg: "#f3ead2", ink: "#7a5a14" };
  if (has("martyr", "passion-bearer")) return { bg: "#f1e2dd", ink: "#8d3a2f" };
  if (
    has("hierarch", "bishop", "archbishop", "patriarch", "metropolitan", "pope")
  )
    return { bg: "#e8eef4", ink: "#234c7a" };
  if (
    has("unmercenary", "fool", "wonderworker", "missionary", "priest", "deacon")
  )
    return { bg: "#e6edf2", ink: "#4a6f96" };
  if (
    has(
      "monastic",
      "righteous",
      "venerable",
      "ascetic",
      "abbot",
      "abbess",
      "nun",
      "monk",
      "elder",
      "hermit",
      "stylite",
    )
  )
    return { bg: "#e3ece6", ink: "#3d6157" };
  return { bg: "#efe3cb", ink: "#234c7a" };
}

export interface AvatarSaint {
  name: string;
  rank?: string[];
  /** primary rank/type override (e.g. America `cat`) */
  type?: string;
  /** optional real-icon URL; absent → monogram */
  image?: string;
  /** optional ~200px thumb of `image` (build.py emits it only when the file
      exists); small renderings prefer it over the full-size portrait */
  imageThumb?: string;
}

export function saintAvatar(
  s: AvatarSaint,
  w = 88,
  h = 108,
  opts: { type?: string; awaiting?: boolean } = {},
): string {
  const type = opts.type ?? s.type ?? (s.rank && s.rank[0]) ?? "";
  const awaiting = !!opts.awaiting;

  // Real-icon tier: cover-fit image inside the arched gold frame. A self-hosted
  // path (static/-relative) is base-prefixed; an absolute URL is used as-is.
  // The value is build-generated, but it still gets the full treatment —
  // URL-breaking chars stripped, then HTML-escaped via esc() — so the markup
  // is inert even if the data channel were ever attacker-controlled (and so
  // CodeQL can prove the innerHTML flows in the islands are sanitized).
  if (s.image) {
    // Small renderings (every avatar ≤ 92px wide except the 286px detail-page
    // hero) use the ~200px ingest thumb when one exists — crisp at 2x DPR,
    // ~10 KB instead of a ~100 KB original.
    const chosen = w <= 200 && s.imageThumb ? s.imageThumb : s.image;
    const raw = String(chosen).replace(/['"\\)\s<>]/g, "");
    const url = esc(/^(https?:)?\/\//.test(raw) ? raw : withBase(raw));
    const clip = `path('${AVATAR_ARCH}')`;
    return `<div style="width:${w}px;height:${h}px;flex-shrink:0;border-radius:6px;padding:2px;background:${AVATAR_FRAME};box-sizing:border-box" aria-hidden="true"><div style="width:100%;height:100%;clip-path:${clip};-webkit-clip-path:${clip};background:#efe3cb center top/cover no-repeat url('${url}')"></div></div>`;
  }

  // Monogram tier. monogramLetter already returns a single [A-Za-z?] char;
  // esc() makes that guarantee visible to the HTML sink (and to CodeQL).
  const c = avatarColors(type, awaiting);
  const letter = esc(monogramLetter(s.name));
  const id =
    "sa" + Math.round(w) + Math.round(h) + letter + (awaiting ? "a" : "");
  const cross = awaiting
    ? ""
    : `<line x1="60" y1="28" x2="60" y2="44" stroke="${AVATAR_FRAME}" stroke-width="2.2"/>
       <line x1="52" y1="36" x2="68" y2="36" stroke="${AVATAR_FRAME}" stroke-width="2.2"/>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 120 150" style="display:block;flex-shrink:0" aria-hidden="true">
    <defs><clipPath id="${id}"><path d="${AVATAR_ARCH}"/></clipPath></defs>
    <rect x="1.5" y="1.5" width="117" height="147" rx="6" fill="${c.bg}" stroke="${AVATAR_FRAME}" stroke-width="2.5"/>
    <g clip-path="url(#${id})"><rect x="6" y="0" width="108" height="150" fill="${c.bg}"/>
    ${cross}
    <text x="60" y="108" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="600" font-size="78" fill="${c.ink}">${letter}</text></g></svg>`;
}
