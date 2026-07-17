/* Calendar island — progressively enhances the pre-rendered day-lists
   (.cal-source) into a real, navigable month grid with a day panel.
   Everything that needs the visitor's real clock (weekday alignment of the
   grid, "today") runs here; a build-time new Date() would freeze to the deploy
   day. With JS disabled, .cal-source stays visible as the full fallback.

   New/Old Calendar toggle: the pre-rendered lists are keyed by CHURCH date,
   which is identical under both reckonings (St. Nicholas is Dec 6 for
   everyone). The toggle only changes which church date a civil grid day maps
   to — identity (New / Revised Julian) vs. 13 days earlier (Old / Julian; see
   civilToChurch in lib/calendar-grid). The grid always shows the visitor's
   civil month; the mode rides the URL (?style=old) so views are shareable and
   nothing touches browser storage. The movable (Paschal) cycle is the same on
   both calendars, so it never shifts.

   Liturgical layer: each day is tinted with a commonly-used liturgical color
   and badged with the recorded fasting rule (lib/liturgical — rules attach to
   feast records, so they follow the toggle). Color, fasting, and feast rank
   are separate visual layers, each with a text equivalent (aria-label,
   tooltip, day panel, legend) — never color alone. */

import { MONTHS, MONTHS_FULL, WEEKDAYS } from "../lib/format";
import {
  monthMatrix,
  civilToChurch,
  type ChurchDate,
} from "../lib/calendar-grid";
import type { DayLiturgics, LitFeast, CalendarStyle } from "../lib/liturgical";
import {
  activeObservances,
  dayLiturgics,
  LITURGICAL_COLORS,
} from "../lib/liturgical";
import type { PaschaTable } from "../lib/feast-dates";

const root = document.getElementById("calendar-page");
const app = document.querySelector<HTMLElement>(".cal-app");
const source = document.getElementById("cal-source");
const grid = document.getElementById("cal-grid");
const panel = document.getElementById("cal-panel");
const monthLabel = document.getElementById("cal-month-label");
const picker = document.getElementById(
  "cal-month-picker",
) as HTMLSelectElement | null;
const todayLabel = document.getElementById("cal-today-label");
const movableBtn = document.getElementById("cal-movable-btn");
const styleNote = document.getElementById("cal-style-note");
const litDataEl = document.getElementById("cal-lit-data");
const styleBtns: Record<"new" | "old", HTMLElement | null> = {
  new: document.getElementById("cal-style-new"),
  old: document.getElementById("cal-style-old"),
};

/** Small element builder: tag + class (+ optional text), all via safe DOM APIs. */
function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function panelHead(title: string, label: string): HTMLElement {
  const head = el("div", "cal-panel-head");
  head.append(el("span", "d", title), el("span", "lbl", label));
  return head;
}

if (root && app && source && grid && panel && monthLabel) {
  const now = new Date();
  const TODAY_Y = now.getFullYear();
  const TODAY_M = now.getMonth() + 1;
  const TODAY_D = now.getDate();

  // Index the pre-rendered source lists by "m-d", plus the movable list.
  const dayLists = new Map<string, HTMLUListElement>();
  source.querySelectorAll<HTMLElement>(".cal-src-day").forEach((dayEl) => {
    const m = dayEl.closest<HTMLElement>("[data-month]")?.dataset.month;
    const d = dayEl.dataset.day;
    const ul = dayEl.querySelector("ul");
    if (m && d && ul) dayLists.set(`${m}-${d}`, ul as HTMLUListElement);
  });
  const movableList = source.querySelector<HTMLUListElement>(
    ".cal-src-movable ul",
  );

  // Liturgical payload (feasts + Pascha table) inlined by calendar.astro.
  let litFeasts: LitFeast[] = [];
  let litPascha: PaschaTable = {};
  try {
    const parsed = JSON.parse(litDataEl?.textContent || "{}") as {
      feasts?: LitFeast[];
      pascha?: PaschaTable;
    };
    litFeasts = parsed.feasts ?? [];
    litPascha = parsed.pascha ?? {};
  } catch {
    /* no liturgical layer — the calendar still works */
  }

  let viewY = TODAY_Y;
  let viewM = TODAY_M;
  let selectedKey: string | null = null;
  let style: CalendarStyle =
    new URLSearchParams(location.search).get("style") === "old" ? "old" : "new";

  /** Church date shown on the given civil day of the viewed month. */
  const churchOf = (m: number, d: number): ChurchDate =>
    style === "old"
      ? civilToChurch(viewY, m, d)
      : { year: viewY, month: m, day: d };

  const churchAbbr = (c: ChurchDate): string =>
    `${MONTHS[c.month - 1]} ${c.day}`;

  const countFor = (m: number, d: number): number => {
    const c = churchOf(m, d);
    return dayLists.get(`${c.month}-${c.day}`)?.childElementCount ?? 0;
  };

  /* ---- liturgical resolution, cached per viewed month + style ---- */
  const litCache = new Map<string, DayLiturgics>();
  function litFor(m: number, d: number): DayLiturgics | null {
    if (!litFeasts.length) return null;
    const key = `${viewY}-${m}-${d}-${style}`;
    let lit = litCache.get(key);
    if (!lit) {
      const date = new Date(viewY, m - 1, d);
      lit = dayLiturgics(
        activeObservances(litFeasts, litPascha, date, style),
        date,
        style,
      );
      litCache.set(key, lit);
    }
    return lit;
  }

  const plural = (n: number): string =>
    `${n} commemoration${n === 1 ? "" : "s"}`;

  /* ---- the expanded day view's liturgical block ---- */
  function litBlock(lit: DayLiturgics): HTMLElement {
    const box = el("div", "cal-lit");
    const row = el("div", "cal-lit-row");
    const sw = el("span", `cal-lit-swatch`);
    sw.style.setProperty("--sw-bg", LITURGICAL_COLORS[lit.color].background);
    sw.style.setProperty("--sw-ac", LITURGICAL_COLORS[lit.color].accent);
    sw.setAttribute("aria-hidden", "true");
    row.append(
      sw,
      el(
        "span",
        "cal-lit-name",
        lit.color === "neutral"
          ? "No special liturgical color assigned"
          : `Liturgical Color: ${lit.colorLabel}`,
      ),
    );
    box.append(row);
    if (lit.color !== "neutral" || lit.badges.length) {
      box.append(el("p", "cal-lit-reason", lit.reason));
    }
    for (const n of lit.notes) box.append(el("p", "cal-lit-note", n));
    if (lit.serviceColors.length) {
      const svc = el("div", "cal-lit-svc");
      svc.append(el("b", "", "Color changes by service:"));
      for (const s of lit.serviceColors) {
        svc.append(
          el(
            "p",
            "cal-lit-note",
            `${s.service} — ${LITURGICAL_COLORS[s.color].label}. ${s.note}`,
          ),
        );
      }
      box.append(svc);
    }
    if (lit.fasting) {
      box.append(el("p", "cal-lit-fast", `Fasting: ${lit.fasting.label}`));
      if (lit.fasting.note) {
        box.append(el("p", "cal-lit-note", lit.fasting.note));
      }
      // which tradition the rule is attributed to (paired with the toggle)
      box.append(el("p", "cal-lit-note", lit.fastingTradition.note));
    }
    if (lit.badges.length) {
      const chips = el("div", "cal-lit-badges");
      for (const b of lit.badges) chips.append(el("span", "cal-lit-badge", b));
      box.append(chips);
    }
    return box;
  }

  function renderPanel(key: string): void {
    selectedKey = key;
    grid!
      .querySelectorAll(".cal-cell.is-selected")
      .forEach((c) => c.classList.remove("is-selected"));
    movableBtn?.classList.remove("is-active");

    if (key === "movable") {
      movableBtn?.classList.add("is-active");
      const n = movableList?.childElementCount ?? 0;
      panel!.replaceChildren(
        panelHead("Movable", `Paschal cycle · ${plural(n)}`),
        el(
          "p",
          "cal-panel-note",
          "Commemorations tied to Pascha rather than a fixed date — their day shifts each year.",
        ),
      );
      if (movableList) panel!.append(movableList.cloneNode(true));
      return;
    }

    const [m, d] = key.split("-").map(Number);
    grid!.querySelector(`[data-key="${key}"]`)?.classList.add("is-selected");
    const c = churchOf(m, d);
    const ul = dayLists.get(`${c.month}-${c.day}`);
    const n = ul?.childElementCount ?? 0;
    const wd = WEEKDAYS[new Date(viewY, m - 1, d).getDay()];
    const lbl =
      style === "old"
        ? `${wd} · ${churchAbbr(c)} on the Church Calendar · ${plural(n)}`
        : `${wd} · ${plural(n)}`;
    panel!.replaceChildren(panelHead(`${MONTHS_FULL[m - 1]} ${d}`, lbl));
    const lit = litFor(m, d);
    if (lit) panel!.append(litBlock(lit));
    if (ul && n) {
      panel!.append(ul.cloneNode(true));
    } else {
      panel!.append(
        el("p", "cal-panel-empty", "No commemoration recorded for this day."),
      );
    }
  }

  function defaultSelection(): string {
    if (
      viewY === TODAY_Y &&
      viewM === TODAY_M &&
      countFor(viewM, TODAY_D) > 0
    ) {
      return `${viewM}-${TODAY_D}`;
    }
    for (const d of monthMatrix(viewY, viewM).days) {
      if (countFor(viewM, d) > 0) return `${viewM}-${d}`;
    }
    return `${viewM}-1`;
  }

  function renderGrid(): void {
    const { leadingBlanks, days } = monthMatrix(viewY, viewM);
    const small = document.createElement("small");
    small.textContent = String(viewY);
    monthLabel!.replaceChildren(`${MONTHS_FULL[viewM - 1]} `, small);
    if (picker) picker.value = String(viewM);

    const cells: HTMLElement[] = [];
    for (let i = 0; i < leadingBlanks; i++) {
      const blank = el("div", "cal-cell is-blank");
      blank.setAttribute("aria-hidden", "true");
      cells.push(blank);
    }
    for (const d of days) {
      const key = `${viewM}-${d}`;
      const n = countFor(viewM, d);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-cell";
      cell.dataset.key = key;
      if (n === 0) {
        cell.classList.add("is-empty");
        cell.disabled = true;
      }
      if (viewY === TODAY_Y && viewM === TODAY_M && d === TODAY_D) {
        cell.classList.add("is-today");
      }
      let aria = `${MONTHS_FULL[viewM - 1]} ${d}, ${plural(n)}`;
      cell.append(el("span", "cn", String(d)));
      if (style === "old") {
        const c = churchOf(viewM, d);
        cell.append(el("span", "os", churchAbbr(c)));
        aria = `${MONTHS_FULL[viewM - 1]} ${d} (${churchAbbr(c)} on the Church Calendar), ${plural(n)}`;
      }
      // liturgical layers: color tint + strip, fasting badge, service marker
      const lit = litFor(viewM, d);
      if (lit) {
        if (lit.color !== "neutral") {
          const pal = LITURGICAL_COLORS[lit.color];
          cell.classList.add("has-lc", `lc-${lit.color}`);
          cell.style.setProperty("--lc-bg", pal.background);
          cell.style.setProperty("--lc-ac", pal.accent);
          cell.style.setProperty("--lc-tx", pal.text);
          cell.append(el("span", "lc-strip"));
          aria += `, liturgical color ${lit.colorLabel}`;
        }
        if (lit.fasting) {
          const fg = el(
            "span",
            `fast-glyph fg-${lit.fasting.key}`,
            lit.fasting.glyph,
          );
          fg.setAttribute("aria-hidden", "true");
          fg.title = lit.fasting.label;
          cell.append(fg);
          aria += `, ${lit.fasting.label}`;
        }
        if (lit.serviceColors.length) {
          const svc = el("span", "lc-svc-glyph");
          svc.setAttribute("aria-hidden", "true");
          svc.title = "Color changes by service";
          cell.append(svc);
          aria += ", color changes by service";
        }
      }
      cell.setAttribute("aria-label", aria);
      cell.title = aria; // hover answers "what do the numbers mean"
      if (n) cell.append(el("span", "cc", String(n)));
      if (n > 0) cell.addEventListener("click", () => renderPanel(key));
      cells.push(cell);
    }
    grid!.replaceChildren(...cells);
  }

  function renderTodayLabel(): void {
    if (!todayLabel) return;
    const civil = `${WEEKDAYS[now.getDay()]}, ${MONTHS_FULL[TODAY_M - 1]} ${TODAY_D}`;
    if (style === "old") {
      const c = civilToChurch(TODAY_Y, TODAY_M, TODAY_D);
      todayLabel.textContent = `Today is ${civil} — ${MONTHS_FULL[c.month - 1]} ${c.day} on the Church Calendar.`;
    } else {
      todayLabel.textContent = `Today is ${civil}.`;
    }
  }

  function syncStyleUI(): void {
    for (const k of ["new", "old"] as const) {
      styleBtns[k]?.classList.toggle("is-active", k === style);
      styleBtns[k]?.setAttribute("aria-pressed", String(k === style));
    }
    if (styleNote) styleNote.hidden = style !== "old";
  }

  function setStyle(next: "new" | "old"): void {
    if (next === style) return;
    style = next;
    syncStyleUI();
    const url = new URL(location.href);
    if (style === "old") url.searchParams.set("style", "old");
    else url.searchParams.delete("style");
    history.replaceState(null, "", url);
    renderTodayLabel();
    renderGrid();
    // Keep the current selection where it still holds commemorations under
    // the new reckoning; otherwise fall back to the month's default.
    if (selectedKey === "movable") {
      renderPanel("movable");
    } else {
      const [m, d] = (selectedKey ?? "").split("-").map(Number);
      renderPanel(
        m && d && countFor(m, d) > 0 ? selectedKey! : defaultSelection(),
      );
    }
  }

  function show(y: number, m: number, select?: string): void {
    viewY = y;
    viewM = m;
    renderGrid();
    renderPanel(select ?? defaultSelection());
  }

  function step(delta: number): void {
    let y = viewY;
    let m = viewM + delta;
    if (m < 1) {
      m = 12;
      y--;
    } else if (m > 12) {
      m = 1;
      y++;
    }
    show(y, m);
  }

  document
    .getElementById("cal-prev")
    ?.addEventListener("click", () => step(-1));
  document.getElementById("cal-next")?.addEventListener("click", () => step(1));
  document
    .getElementById("cal-today-btn")
    ?.addEventListener("click", () => show(TODAY_Y, TODAY_M));
  movableBtn?.addEventListener("click", () => renderPanel("movable"));
  picker?.addEventListener("change", () => show(viewY, Number(picker.value)));
  styleBtns.new?.addEventListener("click", () => setStyle("new"));
  styleBtns.old?.addEventListener("click", () => setStyle("old"));

  renderTodayLabel();
  syncStyleUI();

  // Enhance: reveal the interactive app, hide the no-JS source.
  root.classList.add("is-enhanced");
  app.hidden = false;
  show(TODAY_Y, TODAY_M);
}
