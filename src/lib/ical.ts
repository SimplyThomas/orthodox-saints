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

/** Fold a content line to <=75 octets with CRLF + single leading space. */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  // First segment 75, continuations 74 (a leading space costs one octet).
  parts.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
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

export function eventToVevent(e: IcalEvent): string {
  const lines: string[] = ["BEGIN:VEVENT", `UID:${e.uid}`];
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
  const body = opts.events.map(eventToVevent);
  return [...head, ...body, "END:VCALENDAR"].join("\r\n") + "\r\n";
}
