/* Home-landing island: saint of the day + the "From the Cloud" shuffle deck.
   Build-time `new Date()` would freeze "today" to the build day, so the saint
   of the day runs client-side using the visitor's real date. The shuffle deck
   re-deals a random handful of saints on load and on every Shuffle click —
   the spot where lesser-known saints get their moment. The light card dataset
   (id/name/rank/feast/brief/image…, not the finder index) is fetched from the
   content-hashed static JSON named by data-card-src (see lib/card-payload);
   until it lands, the SSR'd placeholder card and fallback deck stand in. */

import type { CardSaint } from "../lib/types";
import {
  feastDates,
  primaryRank,
  rankSlug,
  firstFeast,
  centuryLabel,
  byProminence,
} from "../lib/saints";
import { splitName } from "../lib/names";
import { esc, withBase, MONTHS_FULL, WEEKDAYS } from "../lib/format";
import { saintAvatar } from "../lib/icons";
import { civilToChurch } from "../lib/calendar-grid";
import type { PaschaTable } from "../lib/feast-dates";
import type {
  CalendarStyle,
  DayHighlight,
  DayLiturgics,
  LitFeast,
} from "../lib/liturgical";
import {
  activeObservances,
  dayHighlight,
  dayLiturgics,
  LITURGICAL_COLORS,
} from "../lib/liturgical";

const home = document.getElementById("home");
if (home && home.dataset.cardSrc) {
  fetch(home.dataset.cardSrc)
    .then((res) => {
      if (!res.ok) throw new Error(`card data: HTTP ${res.status}`);
      return res.json() as Promise<CardSaint[]>;
    })
    .then(initCloudBand, () => {
      const status = document.querySelector("#sotd .sotd-loading");
      if (status)
        status.textContent =
          "Couldn’t load today’s commemoration — please refresh.";
    });
}

function initCloudBand(SAINTS: CardSaint[]) {
  /* ---------- saint of the day (+ liturgical context, Old/New toggle) ----------
     The day always headlines a saint (ranked, so the principal saint leads);
     a Great Feast / fast season resolved from the same Feasts & Fasts payload
     the /calendar page uses rides above it as a colored banner. The Old/New
     toggle re-reckons which church date the visitor's civil "today" maps to. */
  const host = document.getElementById("sotd");
  if (host) {
    const now = new Date();
    const tm = now.getMonth() + 1;
    const td = now.getDate();
    const ty = now.getFullYear();
    const civilLabel = `${MONTHS_FULL[tm - 1]} ${td}`;

    // Liturgical payload inlined by index.astro (feasts + Pascha table).
    let litFeasts: LitFeast[] = [];
    let litPascha: PaschaTable = {};
    try {
      const parsed = JSON.parse(
        document.getElementById("home-lit-data")?.textContent || "{}",
      ) as { feasts?: LitFeast[]; pascha?: PaschaTable };
      litFeasts = parsed.feasts ?? [];
      litPascha = parsed.pascha ?? {};
    } catch {
      /* no liturgical layer — the card still shows the day's saint */
    }

    let style: CalendarStyle =
      new URLSearchParams(location.search).get("style") === "old"
        ? "old"
        : "new";

    // The liturgical context ribbon (Great Feast / fast season), tinted with
    // the day's resolved color. Returns "" when the day carries neither.
    function litRibbon(hl: DayHighlight, lit: DayLiturgics | null): string {
      if (!hl.feast && !hl.season) return "";
      const ck = lit && lit.color !== "neutral" ? lit.color : "gold";
      const pal = LITURGICAL_COLORS[ck];
      const lead = hl.feast ?? hl.season!;
      const trailer =
        hl.feast && hl.season
          ? `<span class="sotd-lit-season">during ${esc(hl.season.name)}</span>`
          : "";
      return `
        <a class="sotd-lit lc-${ck}" href="${esc(withBase(style === "old" ? "calendar?style=old" : "calendar"))}"
           style="--sw-bg:${pal.background};--sw-ac:${pal.accent};--sw-tx:${pal.text}">
          <span class="sotd-lit-bar" aria-hidden="true"></span>
          <span class="sotd-lit-body">
            <span class="sotd-lit-kick">${esc(lead.label)}</span>
            <span class="sotd-lit-name">${esc(lead.name)}</span>
            ${trailer}
          </span>
        </a>`;
    }

    // One saint row: small avatar (real icon when available), name, rank tag,
    // epithet — the whole row links to the saint's profile.
    function saintRow(s: CardSaint): string {
      const sn = splitName(s.name);
      return `
        <a class="sotd-saint" data-saint="${esc(s.id)}" href="${esc(withBase(`saint/${s.id}`))}">
          <span class="sotd-saint-av">${saintAvatar(s, 40, 48, { type: primaryRank(s) })}</span>
          <span class="sotd-saint-text">
            <span class="sotd-saint-name">${esc(sn.title)}<span class="arr" aria-hidden="true">→</span></span>
            <span class="sotd-saint-role">${
              s.rank[0] ? `<span class="tag">${esc(s.rank[0])}</span>` : ""
            }${sn.epithet ? `<span class="ep"> · ${esc(sn.epithet)}</span>` : ""}</span>
          </span>
        </a>`;
    }

    function renderSotd(): void {
      // Church date kept on the visitor's civil "today" under the reckoning
      // (New = the civil date itself; Old = 13 days earlier).
      const church =
        style === "old"
          ? civilToChurch(ty, tm, td)
          : { year: ty, month: tm, day: td };
      const churchLabel = `${MONTHS_FULL[church.month - 1]} ${church.day}`;

      // The day's saints, most-prominent first, so the principal saints of the
      // day lead the list (matching the calendar's day list).
      const todays = SAINTS.filter((s) =>
        feastDates(s).some((f) => f.m === church.month && f.d === church.day),
      ).sort(byProminence);

      // Liturgical context, resolved against the civil date under this style.
      const civilDate = new Date(ty, tm - 1, td);
      let hl: DayHighlight = { feast: null, season: null };
      let lit: DayLiturgics | null = null;
      if (litFeasts.length) {
        const obs = activeObservances(litFeasts, litPascha, civilDate, style);
        hl = dayHighlight(obs);
        lit = dayLiturgics(obs, civilDate, style);
      }

      const LIMIT = 6;
      const shown = todays.slice(0, LIMIT);
      const extra = todays.length - shown.length;
      const calHref = esc(
        withBase(style === "old" ? "calendar?style=old" : "calendar"),
      );
      // "+N more" goes to the Feasts & Fasts page, whose "commemorated today"
      // section lists the full day (saints + feasts + fasts), not just saints.
      const feastsHref = esc(withBase("feasts#ff-today"));

      // The "Saints commemorated today" heading below carries the "today", so
      // the eyebrow is just the date (+ the church date under Old reckoning).
      const dateStr = `${WEEKDAYS[now.getDay()]}, ${civilLabel}`;
      const eyebrow =
        style === "old"
          ? `${esc(dateStr)} <span class="sotd-church">· ${esc(churchLabel)} on the Church Calendar</span>`
          : esc(dateStr);

      const body = todays.length
        ? `<div class="sotd-list">${shown.map(saintRow).join("")}</div>
           ${extra > 0 ? `<a class="sotd-more" href="${feastsHref}">+${extra} more commemorated today<span class="arr" aria-hidden="true"> →</span></a>` : ""}`
        : `<p class="sotd-empty">No saint is recorded for this day. <a href="${calHref}">Open the liturgical calendar →</a></p>`;

      host!.innerHTML = `
        <div class="sotd-head">
          <div class="eyebrow">${eyebrow}</div>
          <div class="sotd-cal" role="group" aria-label="Calendar reckoning">
            <button type="button" data-style="new" aria-pressed="${style === "new"}"
              title="Revised Julian — fixed feasts on the civil date">New</button>
            <button type="button" data-style="old" aria-pressed="${style === "old"}"
              title="Julian — fixed feasts kept 13 days later">Old</button>
          </div>
        </div>
        ${litRibbon(hl, lit)}
        <div class="sotd-card">
          <div class="sotd-card-head">
            <h3>Saints commemorated today</h3>
            <a class="sotd-callink" href="${calHref}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
                ><rect x="3" y="5" width="18" height="16" rx="2"></rect><path
                  d="M3 9h18M8 3v4M16 3v4"></path></svg>
              Liturgical calendar<span class="arr" aria-hidden="true"> →</span>
            </a>
          </div>
          ${body}
        </div>`;

      // Wire the reckoning toggle (re-renders this card; URL rides ?style).
      host!
        .querySelectorAll<HTMLButtonElement>(".sotd-cal button")
        .forEach((btn) =>
          btn.addEventListener("click", () => {
            const next = btn.dataset.style === "old" ? "old" : "new";
            if (next === style) return;
            style = next;
            const url = new URL(location.href);
            if (style === "old") url.searchParams.set("style", "old");
            else url.searchParams.delete("style");
            history.replaceState(null, "", url);
            renderSotd();
          }),
        );
    }

    renderSotd();
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
