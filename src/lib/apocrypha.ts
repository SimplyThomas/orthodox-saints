/* Loader for the `apocrypha` content collection — the apocryphal / Second
   Temple *works* (1 Enoch, the Shepherd of Hermas, …) surfaced from the
   /extra-biblical-angels hub. Mirrors lib/hosts' review-gate contract: in
   production only `reviewed` works ship; dev / PUBLIC_SHOW_DRAFTS loads all.
   Each work's entity collections reference host records by HH-#### id, which the
   work page resolves against lib/hosts for the entry cards. */
import { getCollection, type CollectionEntry } from "astro:content";

export type Work = CollectionEntry<"apocrypha">["data"];

const SHOW_DRAFTS =
  import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_DRAFTS === "true";

/** All visible works, sorted by `order` then `slug` (the hub + getStaticPaths). */
export async function loadWorks(): Promise<Work[]> {
  const all = (await getCollection("apocrypha")).map((e) => e.data);
  return all
    .filter((w) => SHOW_DRAFTS || w.status === "reviewed")
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

/** slug -> work, gated by review status. */
export async function loadWorkMap(): Promise<Record<string, Work>> {
  return Object.fromEntries((await loadWorks()).map((w) => [w.slug, w]));
}
