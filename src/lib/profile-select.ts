/** Apply the review-status gate (spec §6): production ships only `reviewed`
   profiles; dev (or PUBLIC_SHOW_DRAFTS) loads all. Generic + structural so it
   needs no type import (avoids a cycle with saint-profiles.ts). */
export function selectProfiles<T extends { id: string; status?: string }>(
  all: T[],
  showDrafts: boolean,
): Record<string, T> {
  return Object.fromEntries(
    all
      .filter((p) => showDrafts || p.status === "reviewed")
      .map((p) => [p.id, p]),
  );
}
