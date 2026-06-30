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

/* The set of saint IDs whose profile has been fully reviewed (status ===
   "reviewed"). Independent of the draft-visibility gate — a reviewed entry
   earns the dove in every context, in dev and in production alike. Pages that
   inline the finder index (search, quiz) use this to flag reviewed records so
   the islands can render the seal beside the name. */
export async function reviewedIds(): Promise<Set<string>> {
  const all = await getCollection("profiles");
  return new Set(
    all.filter((e) => e.data.status === "reviewed").map((e) => e.data.id),
  );
}
