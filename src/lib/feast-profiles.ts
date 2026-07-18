/* Profile accessor over the `feasts` Content Collection (the rich history +
   meaning prose for each FF-#### feast/fast). Loads all entries, applies the
   review-status gate (production = reviewed only; dev / PUBLIC_SHOW_DRAFTS =
   all), and keys by the explicit `id` field. Mirrors saint-profiles.ts /
   hosts.ts so the feast detail page (/feast/[id]) consumes it the same way. */
import { getCollection, type CollectionEntry } from "astro:content";
import { selectProfiles } from "./profile-select";

export type FeastProfile = CollectionEntry<"feasts">["data"];

const SHOW_DRAFTS =
  import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_DRAFTS === "true";

export async function loadFeastProfileMap(): Promise<
  Record<string, FeastProfile>
> {
  const all = (await getCollection("feasts")).map((e) => e.data);
  return selectProfiles(all, SHOW_DRAFTS);
}
