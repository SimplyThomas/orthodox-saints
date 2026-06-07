/* Home-landing island: saint of the day + the "From the Cloud" shuffle deck.
   Build-time `new Date()` would freeze "today" to the build day, so the saint
   of the day runs client-side using the visitor's real date. The shuffle deck
   re-deals a random handful of saints on load and on every Shuffle click —
   the spot where lesser-known saints get their moment. Reads the light
   card-data payload (id/name/rank/feast/brief/image…), not the finder index. */

import type { CardSaint } from "../lib/types";
import {
  feastDates,
  primaryRank,
  rankSlug,
  firstFeast,
  centuryLabel,
} from "../lib/saints";
import { splitName } from "../lib/names";
import { esc, withBase, MONTHS_FULL, WEEKDAYS } from "../lib/format";
import { saintAvatar } from "../lib/icons";

const dataEl = document.getElementById("card-data");
if (dataEl) {
  const SAINTS: CardSaint[] = JSON.parse(dataEl.textContent || "[]");

  function notableFeatured(n: number): CardSaint[] {
    const enriched = SAINTS.filter(
      (s) => s.brief && (s.intercession || []).length,
    );
    const poolList =
      enriched.length >= n ? enriched : SAINTS.filter((s) => s.brief);
    return poolList.slice(0, n);
  }

  /* ---------- saint of the day ---------- */
  const host = document.getElementById("sotd");
  if (host) {
    const now = new Date();
    const tm = now.getMonth() + 1;
    const td = now.getDate();
    const dateLabel = `${MONTHS_FULL[tm - 1]} ${td}`;
    const todays = SAINTS.filter((s) =>
      feastDates(s).some((f) => f.m === tm && f.d === td),
    );

    let primary: CardSaint;
    let kicker: string;
    let foot: string;
    if (todays.length) {
      primary = todays[0];
      kicker = `${WEEKDAYS[now.getDay()]} · Commemorated today`;
      const others = todays.slice(1, 4).map((s) => s.name);
      foot = others.length
        ? `<span>Also today:</span><span class="also">${others.map(esc).join(" · ")}</span>`
        : "";
    } else {
      // Fall back gracefully without claiming a feast (e.g. a date not yet loaded).
      const poolList = notableFeatured(30);
      primary = poolList[(tm * 31 + td) % poolList.length] || SAINTS[0];
      kicker = `${WEEKDAYS[now.getDay()]} · From the cloud`;
      foot = `<span class="also">${esc(
        "No commemoration is loaded for today yet — meet a saint from the cloud.",
      )}</span>`;
    }

    const sn = splitName(primary.name);
    host.innerHTML = `
      <div class="eyebrow" style="margin-bottom:14px">Today · ${esc(dateLabel)}</div>
      <a class="sotd-card" data-saint="${esc(primary.id)}" href="${esc(withBase(`saint/${primary.id}`))}">
        <div class="sotd-top">
          ${saintAvatar(primary, 92, 116, { type: primaryRank(primary) })}
          <div>
            <div class="kicker">${esc(kicker)}</div>
            <h3>${esc(sn.title)}${
              sn.epithet
                ? ` <span style="font-style:italic;font-weight:500">${esc(sn.epithet)}</span>`
                : ""
            }</h3>
            <p>${esc(primary.brief || primary.notes || "")}</p>
          </div>
        </div>
        <div class="sotd-foot">${foot}</div>
      </a>`;
  }

  /* ---------- "From the Cloud" shuffle deck ---------- */
  const grid = document.getElementById("featured");
  const shuffleBtn = document.getElementById("shuffle");
  if (grid) {
    const featCard = (s: CardSaint): string => {
      const sn = splitName(s.name);
      return `
        <a class="feat-card" data-saint="${esc(s.id)}" href="${esc(withBase(`saint/${s.id}`))}">
          <div class="portrait">${saintAvatar(s, 84, 104, { type: primaryRank(s) })}</div>
          <div class="body">
            <h4>${esc(sn.title)}</h4>
            <div class="epithet">${esc(sn.epithet || (s.aka && s.aka[0]) || "")}</div>
            <span class="tag ${esc(rankSlug(s))}"><i></i>${esc(primaryRank(s))}</span>
            <div class="feat-meta">
              <span>${esc(firstFeast(s))}</span><span>${esc(centuryLabel(s))}</span>
            </div>
          </div>
        </a>`;
    };

    function deal() {
      // A true random draw across the whole cloud — this is the discovery
      // spot, so the long tail (stubs included) gets surfaced too.
      const picks: CardSaint[] = [];
      const seen = new Set<number>();
      while (picks.length < Math.min(4, SAINTS.length)) {
        const i = Math.floor(Math.random() * SAINTS.length);
        if (seen.has(i)) continue;
        seen.add(i);
        picks.push(SAINTS[i]);
      }
      grid!.innerHTML = picks.map(featCard).join("");
    }

    let spin = 0;
    shuffleBtn?.addEventListener("click", () => {
      spin += 1;
      const ico = shuffleBtn.querySelector("svg");
      if (ico) (ico as SVGElement).style.transform = `rotate(${spin * 360}deg)`;
      deal();
    });
    deal();
  }
}
