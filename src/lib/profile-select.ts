import type { SaintProfile } from "./profile-types";

/** Apply the review-status gate (spec §6): in production only `reviewed`
   profiles ship; in dev (or with the show-drafts flag) all profiles load.
   Pure so it can be unit-tested without Vite's import.meta.env. */
export function selectProfiles(
  all: SaintProfile[],
  showDrafts: boolean,
): Record<string, SaintProfile> {
  return Object.fromEntries(
    all
      .filter((p) => showDrafts || p.status === "reviewed")
      .map((p) => [p.id, p]),
  );
}
