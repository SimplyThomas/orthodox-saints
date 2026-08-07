/* The daily lectionary — the scripture appointed to be read on a given day.

   Pure and client-safe (no fs, no DOM): the /calendar island fetches a year
   shard emitted by lectionarylib.py and asks "what is read today". The Python
   side owns the reckoning (see lectionarylib.py and docs/lectionary.md); this
   file only shapes it for the page.

   EDITORIAL FRAME (do not drift): there is no single Orthodox lectionary.
   Byzantine-Greek and Slavic usage diverge on roughly two days in three —
   Greek usage layers the commemorated saint's readings onto ordinary weekdays
   far more often, the Julian reckoning puts a different saint on the day to
   begin with, and the two traditions replay the Sunday Gospels displaced by
   the Lukan jump differently. We therefore NAME the tradition we are showing
   and defer to the parish, rather than presenting one usage as "the"
   readings. A parish's own bulletin outranks this page, always.

   REFERENCES ONLY — never scripture text. Which pericope is appointed on
   which day is a fact of the Church's ordering; a translation is somebody's
   copyright (§9). We cite and link out. */

import type { CalendarStyle } from "./liturgical";

/* ================= the shipped shape ================= */

/** One appointed reading. */
export interface Reading {
  /** The citation as the books print it, e.g. "Micah 4.6-7; 5.2-4". */
  ref: string;
  /** The commemoration it belongs to; absent means the continuous daily cycle. */
  for?: string;
  /** The service it is read at, where that is not implied by the group
      (e.g. "6th Hour", "3rd Matins Gospel"). */
  service?: string;
}

/** One day, in one tradition. */
export interface DayReadings {
  /** Where the day sits in the cycle, e.g. "Monday of the 25th week after
      Pentecost" — the reader's bearing on the liturgical year. */
  title?: string;
  epistle?: Reading[];
  gospel?: Reading[];
  matins?: Reading[];
  vespers?: Reading[];
  other?: Reading[];
}

export type LectionaryTradition = "greek" | "slavic";

/** A year shard: /lectionary-data/<year>.json, keyed "MM-DD". */
export interface LectionaryYear {
  year: number;
  days: Record<string, Partial<Record<LectionaryTradition, DayReadings>>>;
}

/* ================= tradition ================= */

/** How the calendar page's New/Old toggle selects a usage.

   This is a real correlation, not an identity: most New-calendar Orthodox in
   the English-speaking world keep Greek usage, and the Old calendar goes with
   Slavic usage. The notable exception is the OCA — Slavic usage on the New
   calendar — which is why `TRADITIONS[].note` says so on the page instead of
   letting a reader assume the toggle knows their parish. */
export const TRADITIONS: Record<
  LectionaryTradition,
  { key: LectionaryTradition; label: string; note: string }
> = {
  greek: {
    key: "greek",
    label: "Byzantine-Greek usage",
    note: "Greek, Antiochian and other New-calendar parishes. Slavic-usage parishes on the New calendar (the OCA among them) follow the Old-calendar column's readings on their own dates.",
  },
  slavic: {
    key: "slavic",
    label: "Slavic usage",
    note: "Russian, Serbian and other Old-calendar parishes, reckoned on the Julian calendar.",
  },
};

export function traditionFor(style: CalendarStyle): LectionaryTradition {
  return style === "old" ? "slavic" : "greek";
}

/* ================= lookup ================= */

const pad = (n: number): string => String(n).padStart(2, "0");

/** "MM-DD" key for a civil date, matching the shard's day keys. */
export function dayKey(date: Date): string {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The readings for a civil date under the given style, or null when the year
    is outside the harvested range (the caller shows nothing, never a guess). */
export function readingsFor(
  shard: LectionaryYear | null | undefined,
  date: Date,
  style: CalendarStyle = "new",
): DayReadings | null {
  if (!shard || shard.year !== date.getFullYear()) return null;
  return shard.days[dayKey(date)]?.[traditionFor(style)] ?? null;
}

/* ================= display ================= */

export interface ReadingGroup {
  /** Heading shown above the group. */
  label: string;
  readings: Reading[];
  /** Whether the group belongs in the primary block or the folded remainder. */
  primary: boolean;
}

/** The day's readings as display groups, most important first.

   Epistle and Gospel lead because they are what "the readings" means to
   almost everyone asking. Vespers, Matins and the Hours follow, folded away —
   they matter enormously on the days they appear (a Lenten weekday has no
   Liturgy at all, so its Vespers Old-Testament readings ARE the day's
   readings) but they are noise on the other three hundred days. */
export function readingGroups(day: DayReadings | null): ReadingGroup[] {
  if (!day) return [];
  const groups: ReadingGroup[] = [];
  const add = (
    label: string,
    readings: Reading[] | undefined,
    primary: boolean,
  ) => {
    // One pericope, once. A saint listed under two names in the source
    // ("St Matthew" and "Matthew the Apostle") yields the same citation
    // twice; the data keeps both because that is what the source says, but
    // printing "Matthew 9.9-13" on two consecutive lines just looks broken.
    // First occurrence wins, so the annotation shown is the leading one.
    const deduped = readings?.filter(
      (r, i, all) => all.findIndex((o) => o.ref === r.ref) === i,
    );
    if (deduped?.length) groups.push({ label, readings: deduped, primary });
  };
  add("Epistle", day.epistle, true);
  add("Gospel", day.gospel, true);
  // On a day with no Liturgy the Vespers readings are promoted: they are not
  // a supplement then, they are the whole of what is read.
  const noLiturgy = !day.epistle?.length && !day.gospel?.length;
  add("At Vespers", day.vespers, noLiturgy);
  add("At Matins", day.matins, false);
  add("Also appointed", day.other, noLiturgy && !day.vespers?.length);
  return groups;
}

/** Does this day have anything at all to show? */
export function hasReadings(day: DayReadings | null): boolean {
  return readingGroups(day).length > 0;
}

/* ================= links out ================= */

/* We link the citation rather than reproduce the passage (§9). BibleGateway
   takes a free-text reference, tolerates the books' own punctuation once the
   chapter/verse separator is normalized, and is the lookup an enquirer is
   most likely to already know.

   NKJV because it is the translation most widely used from the ambo in
   English-speaking Orthodox parishes. It is a New Testament-friendly choice
   and an Old Testament compromise: the Orthodox Old Testament follows the
   Septuagint, whose versification and text differ from the Masoretic basis of
   every mainstream English Bible. `passageNote()` says so where it matters
   rather than letting the reader trip over it silently. */
const PASSAGE_BASE = "https://www.biblegateway.com/passage/";
const PASSAGE_VERSION = "NKJV";

/** Books whose chapters/verses follow the Septuagint, where a mainstream
    English Bible will not line up (or will not have the book at all). */
const SEPTUAGINT_ONLY =
  /^(Wisdom|Sirach|Baruch|Tobit|Judith|1 Esdras|2 Esdras|[1-4]\s?\[?[1-4]?\]?\s?(Maccabees|Kingdoms))/i;

/** A citation the query string can carry: the books print "Micah 4.6-7" where
    a Bible site expects "Micah 4:6-7", and the Septuagint's dual numbering
    ("4[2] Kings") has to be reduced to the name the site knows. */
export function normalizeRef(ref: string): string {
  return (
    ref
      // "4[2] Kings" / "3 [1] Kings" -> "2 Kings" / "1 Kings": keep the bracketed
      // (Masoretic) numeral, which is the one an English Bible is indexed by.
      .replace(/(\d)\s*\[(\d)\]/g, "$2")
      // chapter.verse -> chapter:verse
      .replace(/(\d)\.(\d)/g, "$1:$2")
      .trim()
  );
}

/** A lookup URL for a citation, or null when there is nothing sensible to
    link — a stitched Composite paremia names several books at once and would
    resolve to the wrong passage, so it is shown as plain text instead. */
export function passageUrl(ref: string): string | null {
  if (/^Composite\s+\d+/i.test(ref)) return null;
  const search = normalizeRef(ref);
  if (!search) return null;
  return `${PASSAGE_BASE}?search=${encodeURIComponent(search)}&version=${PASSAGE_VERSION}`;
}

/** A caveat for this citation, or null. Shown beside the reading, not as a
    page footnote — a reader meets the problem at the link, not at the bottom. */
export function passageNote(ref: string): string | null {
  if (/^Composite\s+\d+/i.test(ref)) {
    return "A composite reading stitched from several passages; look it up in a service book.";
  }
  if (SEPTUAGINT_ONLY.test(ref)) {
    return "Read from the Septuagint; chapter and verse may differ in an English Bible.";
  }
  return null;
}

/** The standing disclaimer. The lectionary is genuinely variable — a parish
    may transfer a feast, keep a patronal commemoration, or serve differently
    — so the page states its own limits rather than implying authority. */
export const PARISH_CAVEAT =
  "Readings vary by jurisdiction and parish, and a parish may transfer or add a commemoration. Your parish's own bulletin is authoritative.";

/** Source credit for the harvested lectionary — see docs/lectionary.md.
    Reckoning the day is a large piece of liturgical computation that we did
    not do: the table is resolved by orthocal.info, which is MIT-licensed, and
    MIT asks that its notice travel with the work. Crediting it in the panel
    that displays it satisfies that and is plain courtesy besides — a reader
    should be able to see whose reckoning they are reading. Naming it here
    rather than in the island keeps it beside PARISH_CAVEAT, the other thing
    the panel says about its own limits. */
export const LECTIONARY_SOURCE = {
  before: "Readings reckoned by ",
  name: "orthocal.info",
  href: "https://orthocal.info",
  after: " (Brian Glass), used under the MIT License.",
} as const;
