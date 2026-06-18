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
  /** image attribution, present only when `image` is */
  imageLicense?: string;
  imageCredit?: string;
  imageSource?: string;
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
}

/** A saint's membership in a group, joined into the record by build.py. */
export interface GroupMembership {
  slug: string;
  name: string;
  type: string;
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
  variants?: string[];
  /** self-hosted real portrait (static/-relative path); absent → monogram */
  image?: string;
}
