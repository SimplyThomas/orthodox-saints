/* Saint-of-the-day island. Build-time `new Date()` would freeze "today" to the
   build day, so this runs client-side to use the visitor's real date. Reads the
   same inlined finder data and renders into #sotd. Ported from app.js
   buildSaintOfDay(). */

import type { FinderSaint } from "../lib/types";
import { feastDates, primaryRank } from "../lib/saints";
import { splitName } from "../lib/names";
import { esc, withBase, MONTHS_FULL, WEEKDAYS } from "../lib/format";
import { saintAvatar } from "../lib/icons";

const host = document.getElementById("sotd");
const dataEl = document.getElementById("finder-data");
if (host && dataEl) {
  const SAINTS: FinderSaint[] = JSON.parse(dataEl.textContent || "[]");

  function notableFeatured(n: number): FinderSaint[] {
    const enriched = SAINTS.filter(
      (s) => s.brief && (s.intercession || []).length,
    );
    const poolList =
      enriched.length >= n ? enriched : SAINTS.filter((s) => s.brief);
    return poolList.slice(0, n);
  }

  const now = new Date();
  const tm = now.getMonth() + 1;
  const td = now.getDate();
  const dateLabel = `${MONTHS_FULL[tm - 1]} ${td}`;
  const todays = SAINTS.filter((s) =>
    feastDates(s).some((f) => f.m === tm && f.d === td),
  );

  let primary: FinderSaint;
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
