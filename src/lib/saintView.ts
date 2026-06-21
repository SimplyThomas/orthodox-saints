/* Derives the rich saint-VIEW model (the Claude Design "SaintViewA" shape) from
   the real Saint record. Everything is mapped from existing columns — sections
   the data can't support (a fuller second "life", related-saint web) are simply
   omitted, so the layout degrades gracefully from a full Father to a long-tail
   stub. No facts are invented here; we only re-present what the record holds. */

import type { Saint } from "./types";
import { splitName, cleanName } from "./names";
import { primaryRank, firstFeast, feastDates, centuryLabel } from "./saints";
import { MONTHS, MONTHS_FULL } from "./format";

export interface SaintViewLink {
  label: string;
  href: string;
  kind: "hymn" | "icon" | "video";
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
  crumb: string;
  eyebrow: string;
  /** the liturgical address (the Short Prayer) */
  address: string;
  brief: string;
  /** primary feast, e.g. "January 1" */
  feast: string;
  /** any further feast dates, e.g. "Also Jan 30" */
  feastNote: string;
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

function furtherFeasts(s: Saint): string {
  const dates = feastDates(s);
  if (dates.length <= 1) return "";
  const rest = dates
    .slice(1)
    .map((d) => `${MONTHS[d.m - 1]} ${d.d}`)
    .join(", ");
  return rest ? `Also ${rest}` : "";
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

  const links: SaintViewLink[] = (
    [
      ["Hymn / Apolytikion", s.hymn, "hymn"],
      ["Icon gallery", s.icon, "icon"],
      ["Video / Media", s.video, "video"],
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
    crumb: type.endsWith("s") ? type : `${type}s`,
    eyebrow: [type, s.century ? `${s.century} century` : s.era]
      .filter(Boolean)
      .join(" · "),
    address: s.prayer,
    brief: s.brief,
    feast: primaryFeast(s),
    feastNote: furtherFeasts(s),
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
  };
}
