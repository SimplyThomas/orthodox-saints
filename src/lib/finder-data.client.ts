/* Client-side loader for the finder dataset. The page embeds the payload's
   content-hashed URL as data-finder-src (see lib/finder-payload); the islands
   call loadFinderData() and render when it resolves. The promise is memoized
   at module level and the URL is fingerprinted, so /search and /quiz share a
   single download per session (module cache within a page, HTTP cache across
   pages). */

import type { FinderSaint } from "./types";

let promise: Promise<FinderSaint[]> | undefined;

async function fetchData(): Promise<FinderSaint[]> {
  const src =
    document.querySelector<HTMLElement>("[data-finder-src]")?.dataset.finderSrc;
  if (!src) throw new Error("no [data-finder-src] on this page");
  const res = await fetch(src);
  if (!res.ok) throw new Error(`finder data: HTTP ${res.status}`);
  return (await res.json()) as FinderSaint[];
}

export function loadFinderData(): Promise<FinderSaint[]> {
  return (promise ??= fetchData());
}
