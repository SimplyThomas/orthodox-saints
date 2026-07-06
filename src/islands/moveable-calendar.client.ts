/* The Moveable Calendar island — the two things a static build can't do (a
   build-time new Date() freezes to deploy day):

   1. Show the NEXT several years of Pascha (past years hidden, the next one
      badged) against the visitor's clock.
   2. Resolve every movable feast & fast to a concrete date for the SELECTED
      year, then group the pre-rendered rows into collapsible month accordions
      (one open at a time) in that year's date order — the months a movable
      feast falls in shift year to year, so the grouping is built client-side.

   With JS off, the year chips still list Pascha's date per year and the list
   shows each feast's Pascha-relative label as one flat list — fully readable,
   just not year-resolved or grouped. */

import {
  type DateToken,
  type PaschaTable,
  DOW_SHORT,
  resolveToken,
} from "../lib/feast-dates";
import { MONTHS, MONTHS_FULL, WEEKDAYS } from "../lib/format";

interface MoveFeast {
  id: string;
  begins: DateToken;
  ends?: DateToken;
}

const root = document.getElementById("mc-page");
const dataEl = document.getElementById("mc-data");
const yearsEl = document.getElementById("mc-years");
const listEl = document.getElementById("mc-list");
const titleEl = document.getElementById("mc-year-title");
const subEl = document.getElementById("mc-year-sub");

if (root && dataEl && yearsEl && listEl) {
  const { feasts, pascha } = JSON.parse(dataEl.textContent || "{}") as {
    feasts: MoveFeast[];
    pascha: PaschaTable;
  };
  const byId = new Map(feasts.map((f) => [f.id, f]));

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const paschaTime = (year: number): number => {
    const iso = pascha[String(year)];
    if (!iso) return NaN;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  const fmt = (d: Date): string => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

  /** A collapsible month block: <details> with a summary bar + empty row list. */
  function makeMonth(name: string): HTMLDetailsElement {
    const d = document.createElement("details");
    d.className = "ff-cal-mo";
    d.innerHTML =
      `<summary class="ff-cal-mo-sum">` +
      `<span class="ff-cal-mo-name">${name}</span>` +
      `<span class="ff-cal-mo-rule"></span>` +
      `<span class="ff-cal-mo-count"></span>` +
      `<svg class="ff-cal-mo-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>` +
      `</summary><div class="ff-cal-list"></div>`;
    return d;
  }

  /* ── the year chips: show this year onward, cap 6, badge the next Pascha ── */
  const buttons = Array.from(
    yearsEl.querySelectorAll<HTMLButtonElement>(".mc-year"),
  );
  const currentYear = now.getFullYear();
  const shown = buttons.filter((b) => Number(b.dataset.year) >= currentYear);
  buttons.forEach((b) => {
    b.hidden = !shown.includes(b);
  });
  const visible = shown.slice(0, 6);
  shown.slice(6).forEach((b) => (b.hidden = true));

  // Next Pascha = first visible year whose Pascha is today or later.
  const nextBtn =
    visible.find((b) => paschaTime(Number(b.dataset.year)) >= today) ??
    visible[0];
  if (nextBtn) {
    const badge = document.createElement("span");
    badge.className = "yr-next";
    badge.textContent = "Next";
    nextBtn.append(badge);
  }

  /* ── resolve + render the selected year ── */
  function selectYear(year: number): void {
    if (!listEl) return;
    buttons.forEach((b) =>
      b.setAttribute(
        "aria-selected",
        Number(b.dataset.year) === year ? "true" : "false",
      ),
    );

    const rows = Array.from(
      listEl.querySelectorAll<HTMLElement>(".ff-cal-row"),
    );
    const dated = rows.map((row) => {
      const f = byId.get(row.dataset.id || "");
      const begins = f ? resolveToken(f.begins, year, pascha) : null;
      const ends = f && f.ends ? resolveToken(f.ends, year, pascha) : null;
      const dateEl = row.querySelector<HTMLElement>(".ff-cal-date");
      if (dateEl && begins) {
        dateEl.textContent = "";
        dateEl.append(document.createTextNode(fmt(begins)));
        const small = document.createElement("small");
        // A span across days shows "→ end"; a single-day span (e.g. the
        // Apostles' Fast in a late-Pascha year) falls back to the weekday.
        small.textContent =
          ends && ends.getTime() !== begins.getTime()
            ? `→ ${fmt(ends)}`
            : DOW_SHORT[begins.getDay()];
        dateEl.append(small);
      }
      return { row, date: begins };
    });
    dated.sort(
      (a, b) =>
        (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity),
    );

    // Group the date-ordered rows into one collapsible <details> per month.
    listEl.replaceChildren();
    const months: HTMLDetailsElement[] = [];
    let curMonth = -1;
    let curList: HTMLElement | null = null;
    for (const { row, date } of dated) {
      const m = date ? date.getMonth() : -1;
      if (m !== curMonth || !curList) {
        curMonth = m;
        const det = makeMonth(date ? MONTHS_FULL[m] : "Date unavailable");
        listEl.append(det);
        months.push(det);
        curList = det.querySelector<HTMLElement>(".ff-cal-list");
      }
      curList?.append(row);
    }
    months.forEach((det) => {
      const count = det.querySelectorAll(".ff-cal-row").length;
      const countEl = det.querySelector(".ff-cal-mo-count");
      if (countEl) countEl.textContent = String(count);
      det.addEventListener("toggle", () => {
        if (det.open) months.forEach((o) => o !== det && (o.open = false));
      });
    });
    // Open the current month when viewing this year, else the first month.
    let openTarget: HTMLDetailsElement | undefined;
    if (year === now.getFullYear()) {
      const curName = MONTHS_FULL[now.getMonth()];
      openTarget = months.find(
        (d) => d.querySelector(".ff-cal-mo-name")?.textContent === curName,
      );
    }
    (openTarget ?? months[0])?.setAttribute("open", "");

    // Header: name the year and the concrete date of its Pascha.
    const pt = paschaTime(year);
    if (titleEl) titleEl.textContent = `Movable Feasts & Fasts of ${year}`;
    if (subEl && !Number.isNaN(pt)) {
      const p = new Date(pt);
      subEl.textContent = `Pascha falls on ${WEEKDAYS[p.getDay()]}, ${
        MONTHS[p.getMonth()]
      } ${p.getDate()}, ${year} — ${rows.length} movable observances`;
    }
  }

  buttons.forEach((b) =>
    b.addEventListener("click", () => selectYear(Number(b.dataset.year))),
  );

  // Boot on the next Pascha's year.
  if (nextBtn) selectYear(Number(nextBtn.dataset.year));
}
