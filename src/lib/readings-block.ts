/* The "Readings for the day" block, shared by the two surfaces that show it:
   the /calendar day panel and the home page's "Today" band.

   Client-safe DOM (no fs, no Astro): both callers are islands. The pure
   lookup/display logic lives in lib/lectionary — this file is only the markup
   built from it, kept in ONE place so the two surfaces cannot drift on the
   editorial frame (docs/lectionary.md): citations only, never scripture text
   (§9); the usage is always named, because there is no single Orthodox
   lectionary; the parish's own bulletin is authoritative; and the harvested
   table is credited to orthocal.info, whose MIT notice travels with it.

   The class names keep the `cal-read-*` prefix they were born with on the
   calendar — the styles in global.css are no longer scoped to that page, and
   renaming them would only churn the CSS and the e2e selectors. */

import type { CalendarStyle } from "./liturgical";
import type { LectionaryYear, Reading } from "./lectionary";
import {
  LECTIONARY_SOURCE,
  PARISH_CAVEAT,
  TRADITIONS,
  passageNote,
  passageUrl,
  readingGroups,
  readingsFor,
  traditionFor,
} from "./lectionary";

/** Small element builder: tag + class (+ optional text), all via safe DOM APIs. */
function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One citation: a link out to the passage, plus why it is read today. */
function readingRow(reading: Reading): HTMLElement {
  const row = el("li", "cal-read-item");
  const url = passageUrl(reading.ref);
  if (url) {
    const a = document.createElement("a");
    a.className = "cal-read-ref";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = reading.ref;
    row.append(a);
  } else {
    row.append(el("span", "cal-read-ref", reading.ref));
  }
  // A named commemoration means this is the saint's or feast's own reading
  // rather than the continuous daily cycle — the reader should see which.
  const aside = [reading.service, reading.for].filter(Boolean).join(" · ");
  if (aside) row.append(el("span", "cal-read-for", aside));
  const note = passageNote(reading.ref);
  if (note) row.append(el("span", "cal-read-note", note));
  return row;
}

/** The day's readings as a block, or null when the day has none (a year
    outside the harvested range resolves to no shard, and the caller simply
    shows nothing rather than a guess). */
export function readingsBlock(
  shard: LectionaryYear | null,
  date: Date,
  style: CalendarStyle,
): HTMLElement | null {
  const day = readingsFor(shard, date, style);
  const groups = readingGroups(day);
  if (!groups.length) return null;

  const box = el("div", "cal-read");
  box.append(el("h3", "cal-read-head", "Readings for the day"));
  if (day?.title) box.append(el("p", "cal-read-title", day.title));

  const primary = groups.filter((g) => g.primary);
  const rest = groups.filter((g) => !g.primary);

  for (const group of primary) {
    box.append(el("h4", "cal-read-label", group.label));
    const ul = el("ul", "cal-read-list");
    for (const r of group.readings) ul.append(readingRow(r));
    box.append(ul);
  }

  if (rest.length) {
    const count = rest.reduce((n, g) => n + g.readings.length, 0);
    const details = document.createElement("details");
    details.className = "cal-read-more";
    const summary = document.createElement("summary");
    summary.textContent = `Also read this day (${count})`;
    details.append(summary);
    for (const group of rest) {
      details.append(el("h4", "cal-read-label", group.label));
      const ul = el("ul", "cal-read-list");
      for (const r of group.readings) ul.append(readingRow(r));
      details.append(ul);
    }
    box.append(details);
  }

  // Name the usage. There is no single Orthodox lectionary, and a reader
  // whose parish reads something else deserves to know why rather than
  // conclude the page is wrong.
  const tradition = TRADITIONS[traditionFor(style)];
  box.append(el("p", "cal-read-trad", tradition.label));
  box.append(el("p", "cal-read-note", tradition.note));
  box.append(el("p", "cal-read-note", PARISH_CAVEAT));

  // Whose reckoning this is. The table is harvested, not ours (§5d), and
  // its MIT licence asks the notice to travel with it.
  const credit = el("p", "cal-read-src");
  credit.append(document.createTextNode(LECTIONARY_SOURCE.before));
  const srcLink = document.createElement("a");
  srcLink.href = LECTIONARY_SOURCE.href;
  srcLink.target = "_blank";
  srcLink.rel = "noopener noreferrer";
  srcLink.textContent = LECTIONARY_SOURCE.name;
  credit.append(srcLink, document.createTextNode(LECTIONARY_SOURCE.after));
  box.append(credit);

  return box;
}

/** A per-year shard fetcher, cached, reading the year list and URL template a
    page ships as data attributes. A year the harvest never covered, a missing
    shard, or an offline visitor all resolve to null — no readings, never a
    guess. */
export function shardFetcher(
  template: string,
  years: string,
): (year: number) => Promise<LectionaryYear | null> {
  const known = new Set(
    years
      .split(",")
      .map((y) => Number(y.trim()))
      .filter(Boolean),
  );
  const cache = new Map<number, Promise<LectionaryYear | null>>();
  return (year: number) => {
    if (!template || !known.has(year)) return Promise.resolve(null);
    let shard = cache.get(year);
    if (!shard) {
      shard = fetch(template.replace("{year}", String(year)))
        .then((r) => (r.ok ? (r.json() as Promise<LectionaryYear>) : null))
        .catch(() => null);
      cache.set(year, shard);
    }
    return shard;
  };
}
