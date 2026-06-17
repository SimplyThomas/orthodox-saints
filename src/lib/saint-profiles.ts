/* Aggregator for the rich saint-profile layer. Each profile lives in its own
   file under ./profiles/OS-####.ts (export default a SaintProfile); Vite's
   import.meta.glob loads them all at build time. The review-status gate
   (selectProfiles) ships only `reviewed` profiles in production and all
   profiles in dev / when PUBLIC_SHOW_DRAFTS=true (Grounded Generation spec §6).
   data/saints.csv stays the finder/facet source of truth; this layer is
   optional editorial content rendered by SaintProfile.astro when present. */
import type { SaintProfile } from "./profile-types";
import { selectProfiles } from "./profile-select";

export * from "./profile-types"; // re-export types for existing importers

const modules = import.meta.glob<{ default: SaintProfile }>("./profiles/*.ts", {
  eager: true,
});

/** Every profile on disk, unfiltered — used by validation tests. */
export const ALL_PROFILES: SaintProfile[] = Object.values(modules).map(
  (m) => m.default,
);

const SHOW_DRAFTS =
  import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_DRAFTS === "true";

/** Profiles visible in the current build, keyed by Saint ID. */
export const SAINT_PROFILES: Record<string, SaintProfile> = selectProfiles(
  ALL_PROFILES,
  SHOW_DRAFTS,
);
