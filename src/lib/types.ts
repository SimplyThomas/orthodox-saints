/* The Saint record shape, mirroring build.py `to_record()` / `JSON_KEYS`.
   This is the contract between the Python data pipeline (source of truth) and
   the Astro frontend. Keep keys in sync with build.py if the pipeline changes. */

export interface WorkLink {
  /** title */
  t: string;
  /** search URL */
  u: string;
}

export interface VendorLink {
  vendor: string;
  url: string;
}

/** One "Depictions & Icons" carousel card (data/saint_depictions.csv).
   `permission` cards (active vendor) carry vendor/attribution; open-license
   cards carry license/credit. `source` is the per-card outbound link. */
export interface SaintDepiction {
  image: string;
  /** card tone: museum (default) | iconographer | shop */
  kind: "museum" | "iconographer" | "shop";
  title: string;
  tag?: string;
  era?: string;
  by?: string;
  source?: string;
  permission?: boolean;
  vendor?: string;
  attribution?: string;
  license?: string;
  credit?: string;
}

export interface Saint {
  id: string;
  name: string;
  aka: string[];
  gender: string;
  rank: string[];
  church: string[];
  family: string[];
  vocation: string[];
  experience: string[];
  virtue: string[];
  intercession: string[];
  origin: string[];
  tradition: string[];
  era: string;
  century: string;
  feast: string;
  prayer: string;
  hymn: string;
  icon: string;
  brief: string;
  notes: string;
  customs: string;
  works: WorkLink[];
  about: WorkLink[];
  video: string;
  sources: string;
  themes: string[];
  months: string[];
  feastSort: number;
  search: string;
  /** present only when name-variant expansion added forms */
  variants?: string[];
  vendors: VendorLink[];
  /** self-hosted real portrait (static/-relative path); absent → monogram */
  image?: string;
  /** ~200px avatar thumb (icons/thumbs/…); present only when the file exists */
  imageThumb?: string;
  /** image attribution, present only when `image` is */
  imageLicense?: string;
  imageCredit?: string;
  imageSource?: string;
  /** vendor-permission image (data/image_permissions.csv); absent for open-license */
  imagePermission?: boolean;
  imageVendor?: string;
  imageAttribution?: string;
  imageVendorHome?: string;
  /** "Depictions & Icons" carousel cards (data/saint_depictions.csv); absent → no carousel */
  depictions?: SaintDepiction[];
  /** verified public-domain quote from the saint; absent → no quote block */
  quote?: string;
  /** quote citation, present only when `quote` is */
  quoteWork?: string;
  quoteLocus?: string;
  quoteTranslation?: string;
  quoteSource?: string;
  /** group-taxonomy memberships (data/saint_groups.csv); absent → no groups */
  groups?: GroupMembership[];
  /** group names (mirror of groups[].name) — keys the finder's Group facet */
  groupNames?: string[];
  /** "group" marks a collective-commemoration profile (a synaxis / household /
      feast-companions set) rather than an individual saint; steers /saint/[id]
      to the GroupSaintProfile layout. Absent on individual saints. */
  profile_type?: "group";
  /** the group's slug (present only on profile_type==="group" records) */
  groupSlug?: string;
  /** the group's taxonomy type (present only on profile_type==="group") */
  groupType?: string;
  /** the group's members in display order (profile_type==="group" only) */
  members?: GroupMember[];
}

/** A saint's membership in a group, joined into the record by build.py.
    `id` is the group profile's own OS-#### (its /saint/[id] page). */
export interface GroupMembership {
  slug: string;
  id: string;
  name: string;
  type: string;
}

/** One member of a group profile. `saint_id` links to the individual's page;
    when absent the member is listed by name only (no individual profile yet). */
export interface GroupMember {
  saint_id?: string;
  name: string;
  role?: string;
}

/** The light projection shipped to the home landing page (saint-of-the-day +
    "From the Cloud" shuffle cards). No search haystack, no facet lists beyond
    intercession — keeps the landing payload far smaller than the finder's. */
export interface CardSaint {
  id: string;
  name: string;
  aka: string[];
  rank: string[];
  intercession: string[];
  era: string;
  century: string;
  feast: string;
  brief: string;
  notes: string;
  image?: string;
  imageThumb?: string;
}

/** The trimmed projection shipped to the finder island (no heavy detail fields). */
export interface FinderSaint {
  id: string;
  name: string;
  aka: string[];
  rank: string[];
  church: string[];
  family: string[];
  vocation: string[];
  experience: string[];
  virtue: string[];
  intercession: string[];
  origin: string[];
  tradition: string[];
  gender: string;
  era: string;
  century: string;
  feast: string;
  feastSort: number;
  brief: string;
  notes: string;
  search: string;
  /** curated theme slugs (themes.py); drives the "Browse by Theme" facet */
  themes: string[];
  /** group names the saint belongs to; drives the finder's "Group" facet */
  groupNames?: string[];
  /** "group" for collective-commemoration records; the quiz drops these */
  profile_type?: "group";
  variants?: string[];
  /** self-hosted real portrait (static/-relative path); absent → monogram */
  image?: string;
  /** ~200px avatar thumb (icons/thumbs/…); present only when the file exists */
  imageThumb?: string;
  /** true when a human has personally reviewed this profile */
  humanReviewed?: boolean;
  /** data-derived prominence tiebreak for search ranking (see prominence.ts) */
  prom?: number;
}
