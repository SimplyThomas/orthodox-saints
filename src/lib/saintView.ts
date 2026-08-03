/* Derives the rich saint-VIEW model (the Claude Design "SaintViewA" shape) from
   the real Saint record. Everything is mapped from existing columns — sections
   the data can't support (a fuller second "life", related-saint web) are simply
   omitted, so the layout degrades gracefully from a full Father to a long-tail
   stub. No facts are invented here; we only re-present what the record holds. */

import type { Saint, SaintDepiction } from "./types";
import { splitName, cleanName } from "./names";
import { primaryRank, firstFeast, feastDates, centuryLabel } from "./saints";
import { oldCalendarDay } from "./calendar-grid";
import { MONTHS, MONTHS_FULL } from "./format";

/** The label for the hymns collapsible and the tile that jumps to it: the
    kinds actually present, in the order they are sung — "Troparion &
    Kontakion" for the usual pair, plain "Troparion" for a saint who has only
    that one. Naming a kontakion on a page carrying none would be a small lie
    in a section whose whole point is verbatim text. */
export function hymnLabel(hymns: { kind: string }[] | undefined): string {
  const kinds = [...new Set((hymns ?? []).map((h) => h.kind))];
  if (kinds.length === 0) return "Hymns";
  if (kinds.length === 1) return kinds[0];
  return `${kinds.slice(0, -1).join(", ")} & ${kinds[kinds.length - 1]}`;
}

export interface SaintViewLink {
  label: string;
  href: string;
  kind: "hymn" | "icon";
}

export interface SaintViewModel {
  id: string;
  name: string;
  /** displayed heading head + italic epithet */
  title: string;
  epithet: string;
  /** "St Basil the Great" — breadcrumb / share label */
  honorificName: string;
  also: string[];
  type: string;
  typeSlug: string;
  eyebrow: string;
  /** the liturgical address (the Short Prayer) */
  address: string;
  brief: string;
  /** primary feast, e.g. "January 1" */
  feast: string;
  /** civil day the primary feast is kept by Old Calendar (Julian) churches,
      e.g. "January 14"; empty when no fixed date parses */
  feastOld: string;
  /** any further feast dates, e.g. "Also Jan 30 (Old Calendar Feb 12)" */
  feastNote: string;
  /** further feast dates, structured as New/Old calendar pairs (primary excluded) */
  feastMore: { neu: string; old: string }[];
  intercessions: string[];
  virtues: string[];
  vocation: string[];
  experience: string[];
  /** demoted taxonomy as aligned [label, value] rows */
  facts: [string, string][];
  customs: string;
  notes: string;
  quote?: {
    text: string;
    cite: string;
    source?: string;
    translation?: string;
  };
  works: { t: string; u: string }[];
  about: { t: string; u: string }[];
  links: SaintViewLink[];
  sources: string;
  image?: string;
  imageLicense?: string;
  imageCredit?: string;
  imageSource?: string;
  imagePermission?: boolean;
  imageVendor?: string;
  imageAttribution?: string;
  imageVendorHome?: string;
  /** "Depictions & Icons" carousel cards (omitted when none) */
  depictions: SaintDepiction[];
}

/* "January 1" from a "Jan 1; Jan 30" feast string — expand the abbreviated
   month of the primary date to its full name for the feast highlight. */
function primaryFeast(s: Saint): string {
  const first = firstFeast(s);
  const m = first.match(/^([A-Z][a-z]{2})\s+(\d{1,2})$/);
  if (m) {
    const mi = MONTHS.indexOf(m[1]);
    if (mi >= 0) return `${MONTHS_FULL[mi]} ${m[2]}`;
  }
  return first;
}

/* "January 14" — the civil day the primary fixed feast is kept by Old
   Calendar (Julian) churches; empty when the saint has no parseable fixed
   date (movable-only or featless stubs). */
function primaryFeastOld(s: Saint): string {
  const dates = feastDates(s);
  if (!dates.length) return "";
  const oc = oldCalendarDay(dates[0].m, dates[0].d);
  return `${MONTHS_FULL[oc.month - 1]} ${oc.day}`;
}

function furtherFeasts(s: Saint): string {
  const dates = feastDates(s);
  if (dates.length <= 1) return "";
  const rest = dates
    .slice(1)
    .map((d) => {
      const oc = oldCalendarDay(d.m, d.d);
      return `${MONTHS[d.m - 1]} ${d.d} (Old Calendar ${MONTHS[oc.month - 1]} ${oc.day})`;
    })
    .join(", ");
  return rest ? `Also ${rest}` : "";
}

/* Structured form of furtherFeasts — each additional fixed feast as a New/Old
   calendar pair, for the feast card's "also commemorated" rows. */
function furtherFeastList(s: Saint): { neu: string; old: string }[] {
  const dates = feastDates(s);
  if (dates.length <= 1) return [];
  return dates.slice(1).map((d) => {
    const oc = oldCalendarDay(d.m, d.d);
    return {
      neu: `${MONTHS_FULL[d.m - 1]} ${d.d}`,
      old: `${MONTHS_FULL[oc.month - 1]} ${oc.day}`,
    };
  });
}

export function toSaintView(s: Saint): SaintViewModel {
  const sn = splitName(s.name);
  const type = primaryRank(s);
  const typeSlug =
    "t-" +
    type
      .toLowerCase()
      .replace(/[^a-z]+/g, "-")
      .replace(/^-|-$/g, "");

  const facts: [string, string][] = [];
  if (s.rank.length) facts.push(["Rank", s.rank.join(" · ")]);
  if (s.church.length) facts.push(["Office", s.church.join(" · ")]);
  if (s.family.length) facts.push(["Life state", s.family.join(" · ")]);
  if (s.origin.length) facts.push(["Region", s.origin.join(" · ")]);
  const eraBits = [s.era, s.century ? `${s.century} c.` : ""].filter(Boolean);
  if (eraBits.length) facts.push(["Era", eraBits.join(" · ")]);
  else if (centuryLabel(s)) facts.push(["Era", centuryLabel(s)]);
  if (s.tradition.length) facts.push(["Veneration", s.tradition.join(" · ")]);
  if (s.gender) facts.push(["Gender", s.gender]);

  // Columns 18 and 19 are derived Google searches — ways to go LOOK for a
  // troparion or an icon somewhere else. Once we hold the thing itself, the
  // search offers strictly less than what is already on the page, so the tile
  // is dropped rather than left to compete with it: the hymns collapsible for
  // `hymn`, and a hero portrait or a depictions carousel for `icon`. Decided
  // here, not in the component, so every consumer of the model agrees on when
  // a link is worth showing.
  //
  // Column 25 (the YouTube search) is not offered at all. It was never a link
  // to anything we had vetted — it handed a reader an unfiltered search on a
  // saint's name, which is the one place this site cannot vouch for what comes
  // back. The column stays in the data; the page just stops pointing at it.
  const hasImagery = !!s.image || (s.depictions?.length ?? 0) > 0;
  const links: SaintViewLink[] = (
    [
      ["Hymn / Apolytikion", s.hymns?.length ? "" : s.hymn, "hymn"],
      ["Icon gallery", hasImagery ? "" : s.icon, "icon"],
    ] as [string, string, SaintViewLink["kind"]][]
  )
    .filter(([, href]) => href)
    .map(([label, href, kind]) => ({ label, href, kind }));

  const quote = s.quote
    ? {
        text: s.quote,
        cite: [s.quoteWork, s.quoteLocus].filter(Boolean).join(", "),
        source: s.quoteSource,
        translation: s.quoteTranslation,
      }
    : undefined;

  return {
    id: s.id,
    name: s.name,
    title: sn.title,
    epithet: sn.epithet,
    honorificName: `St ${cleanName(s.name)}`,
    also: s.aka,
    type,
    typeSlug,
    eyebrow: s.century ? `${s.century} century` : (s.era ?? ""),
    address: s.prayer,
    brief: s.brief,
    feast: primaryFeast(s),
    feastOld: primaryFeastOld(s),
    feastNote: furtherFeasts(s),
    feastMore: furtherFeastList(s),
    intercessions: s.intercession,
    virtues: s.virtue,
    vocation: s.vocation,
    experience: s.experience,
    facts,
    customs: s.customs,
    notes: s.notes,
    quote,
    works: s.works,
    about: s.about,
    links,
    sources: s.sources,
    image: s.image,
    imageLicense: s.imageLicense,
    imageCredit: s.imageCredit,
    imageSource: s.imageSource,
    imagePermission: s.imagePermission,
    imageVendor: s.imageVendor,
    imageAttribution: s.imageAttribution,
    imageVendorHome: s.imageVendorHome,
    depictions: s.depictions ?? [],
  };
}
