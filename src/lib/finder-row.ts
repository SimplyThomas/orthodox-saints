/* The finder result row — one saint as a linked reading-list entry. Shared by
   the finder island (client-side re-renders) and Finder.astro (build-time SSR
   of the first page) so the two renderings cannot drift. Returns the <li>
   inner HTML; `via` names the matched name-variant, when any (client-only —
   SSR has no query). */

import type { FinderSaint } from "./types";
import {
  valuesOf,
  rankSlug,
  primaryRank,
  firstFeast,
  centuryLabel,
} from "./saints";
import { splitName } from "./names";
import { esc, withBase } from "./format";
import { saintAvatar, reviewedDove } from "./icons";

export function finderRowHTML(s: FinderSaint, via = ""): string {
  const sn = splitName(s.name);
  const place = valuesOf(s, "origin").join(" · ");
  return `
      <a class="saint-row" data-saint="${esc(s.id)}" href="${esc(withBase(`saint/${s.id}`))}">
        <div class="portrait">${saintAvatar(s, 58, 72, { type: primaryRank(s) })}</div>
        <div class="main">
          <div class="title-line"><h3>${esc(sn.title)}</h3>${
            sn.epithet ? `<span class="epithet">${esc(sn.epithet)}</span>` : ""
          }${s.humanReviewed ? reviewedDove(20) : ""}</div>
          ${via ? `<div class="match-via">matched &ldquo;${esc(via)}&rdquo;</div>` : ""}
          <p class="bio">${esc(s.brief || s.notes || "")}</p>
          <div class="row-tags">
            <span class="tag ${rankSlug(s)}"><i></i>${esc(primaryRank(s))}</span>
            ${place ? `<span class="place">${esc(place)}</span>` : ""}
          </div>
        </div>
        <div class="aside">
          <div class="feast">${esc(firstFeast(s))}</div>
          <div class="century">${esc(centuryLabel(s))}</div>
          ${s.era ? `<div class="rank">${esc(s.era)}</div>` : ""}
        </div>
      </a>`;
}
