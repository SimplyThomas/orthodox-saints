/* Build-time group taxonomy. Astro/Vite inlines public/groups.json (emitted by
   build.py from data/groups.csv + data/saint_groups.csv) at build time — the
   Python build MUST run first. Mirrors lib/themes.ts. */

import catalogRaw from "../../public/groups.json";

export interface Group {
  slug: string;
  /** the group's own OS-#### — its /saint/[id] group profile */
  saint_id: string;
  name: string;
  type: string;
  description: string;
  feast: string;
  sort: number;
  /** member Saint IDs (file order) */
  members: string[];
}

export const GROUPS = catalogRaw as unknown as Group[];

export const groupBySlug: Map<string, Group> = new Map(
  GROUPS.map((g) => [g.slug, g]),
);

/** Human label for a group `type` (the enumerated set in build.py). */
export const GROUP_TYPE_LABEL: Record<string, string> = {
  synaxis: "Synaxis",
  "feast-companions": "Feast Companions",
  household: "Household",
};
