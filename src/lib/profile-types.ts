/* Shared types for the rich saint-profile layer. Kept value-free so the
   aggregator (saint-profiles.ts) can import this AND glob the per-saint files
   without an import cycle. */
import type { TimelineEntry, RelatedFigure } from "./ephraim";

/** A headed block of prose — Major Contributions, Legacy, "Why the Great". */
export interface ProfileSection {
  heading: string;
  body: string[]; // one entry per paragraph
}

export interface ProfileWork {
  title: string;
  desc: string;
  date?: string; // optional "Title · Date · Description" column (spec §10.5)
}

export interface ReadingItem {
  title: string;
  author?: string;
  type?: string; // optional "Title · Author · Type" column (spec §10.5)
}

export interface ReadingGroup {
  heading: string;
  items: ReadingItem[];
}

export interface FamilyGroup {
  heading: string;
  intro?: string;
  figures: RelatedFigure[]; // RelatedFigure.note carries the relation
}

/** Review state for a profile (Grounded Generation spec §6). */
export type ProfileStatus = "draft" | "reviewed" | "flagged";

export interface SaintProfile {
  id: string; // must match a row in data/saints.csv
  lifespan?: string;
  overview: string[]; // expanded biography — presence triggers the rich render
  timeline?: TimelineEntry[];
  sections?: ProfileSection[]; // incl. a "Relics & Shrines" section (spec §10.4)
  family?: FamilyGroup;
  related?: RelatedFigure[];
  patronage?: string[];
  works?: ProfileWork[];
  reading?: ReadingGroup[];

  // Authoring / provenance metadata (spec §6). Hand-authored profiles use
  // "reviewed"; the generation pipeline (Plan 2) writes "draft"/"flagged".
  status?: ProfileStatus;
  sources?: string[]; // provenance URLs the dossier drew on
  generated?: string; // ISO date stamp (passed in; never Date.now())
}
