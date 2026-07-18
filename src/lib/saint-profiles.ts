/* Profile accessor over the `profiles` Content Collection. Loads all entries,
   applies the review-status gate (production = reviewed only; dev /
   PUBLIC_SHOW_DRAFTS = all), and keys by the explicit `id` field. Only the
   per-saint page (SaintView) consumes profiles. */
import { getCollection, type CollectionEntry } from "astro:content";
import { selectProfiles } from "./profile-select";

export type SaintProfile = CollectionEntry<"profiles">["data"];

const SHOW_DRAFTS =
  import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_DRAFTS === "true";

export async function loadProfileMap(): Promise<Record<string, SaintProfile>> {
  const all = (await getCollection("profiles")).map((e) => e.data);
  return selectProfiles(all, SHOW_DRAFTS);
}

/* The set of saint IDs a person has personally reviewed against the sources
   (`humanReviewed: true`). Independent of the `status` visibility gate — most
   profiles now ship (status: reviewed) so they are readable, but only the
   human-vetted ones earn the dove seal, in dev and production alike. Pages that
   inline the finder index (search, quiz) use this to flag those records so the
   islands can render the seal beside the name. */
export async function humanReviewedIds(): Promise<Set<string>> {
  const all = await getCollection("profiles");
  return new Set(
    all.filter((e) => e.data.humanReviewed === true).map((e) => e.data.id),
  );
}
