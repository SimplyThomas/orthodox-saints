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
