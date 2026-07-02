/* The home page's card dataset as one static, content-hashed JSON payload
   (server-only) — the same split as lib/finder-payload: the page embeds only
   the URL (data-card-src) and the cloud-band island fetches it after first
   paint, so the landing page's HTML no longer carries ~1.1 MB of hidden JSON.
   The hash in the filename ties the deployed page to exactly the data it was
   built with. */

import { createHash } from "node:crypto";
import { CARD_SAINTS } from "./data";

export interface CardPayload {
  json: string;
  hash: string;
}

let cached: CardPayload | undefined;

export function cardPayload(): CardPayload {
  if (!cached) {
    const json = JSON.stringify(CARD_SAINTS);
    cached = {
      json,
      hash: createHash("sha256").update(json).digest("hex").slice(0, 10),
    };
  }
  return cached;
}

/** Site-relative path of the payload (pass through withBase() for hrefs). */
export function cardDataPath(): string {
  return `card-data/${cardPayload().hash}.json`;
}
