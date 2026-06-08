/* Small formatting / escaping helpers + the base-path URL helper. */

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/* HTML-escape for strings interpolated into innerHTML inside the islands. */
export function esc(s: unknown): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Escape a value for use inside a CSS attribute selector. */
export function cssEscape(s: string): string {
  const C = (globalThis as { CSS?: { escape?: (s: string) => string } }).CSS;
  return C && C.escape ? C.escape(s) : String(s).replace(/["\\\]]/g, "\\$&");
}

/* Base-path-correct internal URL. Astro does NOT prefix `base` onto hand-written
   href/src strings, so every internal link must pass through this. BASE_URL is
   "/" on the custom domain (Vite-inlined at build time; was "/orthodox-saints/"
   on the project site — keep routing through here so a base change stays cheap). */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base + "/" + String(path).replace(/^\//, "");
}
