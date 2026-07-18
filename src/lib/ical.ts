/* Minimal, dependency-free RFC 5545 (iCalendar) serializer. Pure functions,
   unit-tested; no project types. Emits CRLF line endings and 75-octet line
   folding as the spec requires. All-day events only (this project has no
   times); DTEND is the exclusive next day. */

export interface IcalEvent {
  /** Globally-unique, STABLE across rebuilds (so subscribers don't get dupes). */
  uid: string;
  /** All-day start date (local Y/M/D; only the date part is used). */
  start: Date;
  allDay: true;
  /** true → one VEVENT with RRULE:FREQ=YEARLY; false → a single dated event. */
  recurYearly: boolean;
  summary: string;
  description?: string;
  url?: string;
}

/** Escape a TEXT value per RFC 5545 §3.3.11 (order matters: backslash first). */
export function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** UTF-8 octet length of a string (RFC 5545 counts octets, not JS chars). */
function octetLen(s: string): number {
  // TextEncoder is available in Node 24 + browsers + Astro's build runtime.
  return new TextEncoder().encode(s).length;
}

/** Fold a content line to <=75 octets with CRLF + single leading space.
    Folds on OCTET boundaries per RFC 5545 §3.1 (a naive char-count fold
    overflows on multi-byte UTF-8 — em dashes, the ☦ ornament, smart quotes)
    and never splits mid-codepoint (each fold segment stays valid UTF-8). */
export function foldLine(line: string): string {
  if (octetLen(line) <= 75) return line;
  const chars = Array.from(line); // iterate by codepoint, not UTF-16 unit
  const parts: string[] = [];
  let seg = "";
  let cap = 75; // first segment 75; continuations 74 (leading space costs one)
  for (const ch of chars) {
    const w = octetLen(ch);
    if (octetLen(seg) + w > cap) {
      parts.push(seg);
      seg = "";
      cap = 74;
    }
    seg += ch;
  }
  if (seg) parts.push(seg);
  return parts.map((p, i) => (i === 0 ? p : " " + p)).join("\r\n");
}

/** Local date → YYYYMMDD (all-day DATE value). */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function addOneDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

/** DTSTAMP is REQUIRED in a VEVENT (RFC 5545 §3.6.1). This is a static,
    republished feed, so we use a FIXED build-agnostic timestamp: deterministic
    output across rebuilds (no diff churn) and — with the stable UIDs — no
    needless "changed" signal to subscribers. */
export const DTSTAMP = "20200101T000000Z";

export function eventToVevent(e: IcalEvent, dtstamp: string = DTSTAMP): string {
  const lines: string[] = ["BEGIN:VEVENT", `UID:${e.uid}`];
  lines.push(`DTSTAMP:${dtstamp}`);
  lines.push(`DTSTART;VALUE=DATE:${formatDate(e.start)}`);
  lines.push(`DTEND;VALUE=DATE:${formatDate(addOneDay(e.start))}`);
  if (e.recurYearly) lines.push("RRULE:FREQ=YEARLY");
  lines.push(`SUMMARY:${escapeText(e.summary)}`);
  if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
  if (e.url) lines.push(`URL:${e.url}`);
  lines.push("TRANSP:TRANSPARENT"); // all-day observances shouldn't block "busy"
  lines.push("END:VEVENT");
  return lines.map(foldLine).join("\r\n");
}

export function buildCalendar(opts: {
  name: string;
  events: IcalEvent[];
}): string {
  const head = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cloud of Witnesses//Orthodox Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.name)}`,
    "X-PUBLISHED-TTL:PT12H", // clients may refresh twice a day
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
  ].map(foldLine);
  const body = opts.events.map((e) => eventToVevent(e));
  return [...head, ...body, "END:VCALENDAR"].join("\r\n") + "\r\n";
}
