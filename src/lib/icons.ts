/* SVG motif builders (ported verbatim from app.js). Returned as SVG strings so
   they can be used both at build time (.astro via set:html) and inside the
   client islands (innerHTML). Thin .astro wrappers live in components/icons/. */

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

export function saintIcon(
  w = 120,
  h = 150,
  tone: "blue" | "gold" = "blue",
  halo = true,
  round = false,
): string {
  const T = {
    blue: {
      bg: "#efe3cb",
      frame: "#a9852a",
      halo: "#D4AF37",
      fig: "#234C7A",
      face: "#cdb98f",
    },
    gold: {
      bg: "#1b3a5c",
      frame: "#D4AF37",
      halo: "#D4AF37",
      fig: "#9bb6d4",
      face: "#e6cd7e",
    },
  }[tone];
  const cid = "arch" + tone + w + h + (halo ? "h" : "") + (round ? "r" : "");
  const haloEls = halo
    ? `<circle cx="60" cy="66" r="30" fill="none" stroke="${T.halo}" stroke-width="3"/>
       <line x1="60" y1="40" x2="60" y2="92" stroke="${T.halo}" stroke-width="2.4"/>
       <line x1="36" y1="66" x2="84" y2="66" stroke="${T.halo}" stroke-width="2.4"/>
       <line x1="60" y1="112" x2="60" y2="132" stroke="${T.halo}" stroke-width="2.4"/>
       <line x1="52" y1="120" x2="68" y2="120" stroke="${T.halo}" stroke-width="2.4"/>`
    : `<circle cx="60" cy="66" r="30" fill="none" stroke="${T.frame}" stroke-width="1.5" opacity=".5"/>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><clipPath id="${cid}"><path d="M6 ${round ? 70 : 24} a54 54 0 0 1 108 0 V144 a6 6 0 0 1 -6 6 H12 a6 6 0 0 1 -6 -6 Z"/></clipPath></defs>
    <rect x="1.5" y="1.5" width="117" height="147" rx="6" fill="${T.bg}" stroke="${T.frame}" stroke-width="2.5"/>
    <g clip-path="url(#${cid})"><rect x="6" y="0" width="108" height="150" fill="${T.bg}"/>
    ${haloEls}
    <path d="M22 150 C24 116 38 100 60 100 C82 100 96 116 98 150 Z" fill="${T.fig}"/>
    <circle cx="60" cy="66" r="19" fill="${T.face}"/>
    <path d="M60 47 a19 19 0 0 0 -19 19 q19 6 38 0 a19 19 0 0 0 -19 -19" fill="${T.fig}" opacity=".55"/></g></svg>`;
}
