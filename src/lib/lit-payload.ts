/* The trimmed Feasts & Fasts payload that the liturgical layer (lib/liturgical)
   needs to resolve a day: just the cycle-bearing fields of each feast plus the
   Pascha table. Both the /calendar page and the home "Today" card inline this
   as JSON for their islands, so the two surfaces resolve the same feast/color/
   fast for a date. Server-only (reads feasts.json via lib/feasts). ~12 KB. */

import type { LitFeast } from "./liturgical";
import type { PaschaTable } from "./feast-dates";
import { FEASTS, PASCHA } from "./feasts";

export interface LitPayload {
  feasts: LitFeast[];
  pascha: PaschaTable;
}

/** `customs: true` includes each feast's Customs & Traditions text — needed
    only by the /calendar customs panel, ~10 KB extra, so the lean home-page
    surfaces (Today card, cloud band) omit it. */
export function litPayload(opts: { customs?: boolean } = {}): LitPayload {
  return {
    feasts: FEASTS.map((f) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      ...(f.dedication ? { dedication: f.dedication } : {}),
      ...(f.fasting ? { fasting: f.fasting } : {}),
      ...(opts.customs && f.customs ? { customs: f.customs } : {}),
      begins: f.begins,
      ...(f.ends ? { ends: f.ends } : {}),
      ...(f.forefeast ? { forefeast: f.forefeast } : {}),
      ...(f.apodosis ? { apodosis: f.apodosis } : {}),
    })),
    pascha: PASCHA,
  };
}
