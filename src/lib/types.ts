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
  variants?: string[];
  /** self-hosted real portrait (static/-relative path); absent → monogram */
  image?: string;
}
