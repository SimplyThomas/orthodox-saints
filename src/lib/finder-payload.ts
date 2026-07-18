/* The finder dataset as one static, content-hashed JSON payload (server-only).
   /search and /quiz used to inline this JSON (~3.4 MB of HTML each); now they
   embed only its URL (data-finder-src) and the islands fetch it on demand —
   one browser-cached download shared by both pages. The hash in the filename
   ties each deployed page to exactly the data it was built with, so GitHub
   Pages' short cache TTL can never serve a page against mismatched data. */

import { createHash } from "node:crypto";
import { FINDER_SAINTS } from "./data";
import { reviewedIds } from "./saint-profiles";
import { prominence } from "./prominence";

export interface FinderPayload {
  /** The serialized finder dataset (FinderSaint[] + humanReviewed flags). */
  json: string;
  /** First 10 hex chars of the payload's sha256 — the filename fingerprint. */
  hash: string;
}

let cached: Promise<FinderPayload> | undefined;

async function build(): Promise<FinderPayload> {
  const reviewed = await reviewedIds();
  const data = FINDER_SAINTS.map((s) => {
    const withProm = { ...s, prom: prominence(s) };
    return reviewed.has(s.id) ? { ...withProm, humanReviewed: true } : withProm;
  });
  const json = JSON.stringify(data);
  const hash = createHash("sha256").update(json).digest("hex").slice(0, 10);
  return { json, hash };
}

/* Memoized: the payload is built once per astro build, shared by the JSON
   endpoint and every page that embeds the URL. */
export function finderPayload(): Promise<FinderPayload> {
  return (cached ??= build());
}

/** Site-relative path of the payload (pass through withBase() for hrefs). */
export async function finderDataPath(): Promise<string> {
  const { hash } = await finderPayload();
  return `finder-data/${hash}.json`;
}
