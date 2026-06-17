/* Calendar island — progressively enhances the pre-rendered day-lists
   (.cal-source) into a real, navigable month grid with a day panel.
   Everything that needs the visitor's real clock (weekday alignment of the
   grid, "today") runs here; a build-time new Date() would freeze to the deploy
   day. With JS disabled, .cal-source stays visible as the full fallback. */

import { MONTHS_FULL, WEEKDAYS } from "../lib/format";
import { monthMatrix } from "../lib/calendar-grid";

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

  let viewY = TODAY_Y;
  let viewM = TODAY_M;

  const countFor = (m: number, d: number): number =>
    dayLists.get(`${m}-${d}`)?.childElementCount ?? 0;

  const plural = (n: number): string =>
    `${n} commemoration${n === 1 ? "" : "s"}`;

  function renderPanel(key: string): void {
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
    const ul = dayLists.get(key);
    const n = ul?.childElementCount ?? 0;
    const wd = WEEKDAYS[new Date(viewY, m - 1, d).getDay()];
    panel!.replaceChildren(
      panelHead(`${MONTHS_FULL[m - 1]} ${d}`, `${wd} · ${plural(n)}`),
    );
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
      cell.setAttribute(
        "aria-label",
        `${MONTHS_FULL[viewM - 1]} ${d}, ${plural(n)}`,
      );
      cell.append(el("span", "cn", String(d)));
      if (n) cell.append(el("span", "cc", String(n)));
      if (n > 0) cell.addEventListener("click", () => renderPanel(key));
      cells.push(cell);
    }
    grid!.replaceChildren(...cells);
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

  if (todayLabel) {
    todayLabel.textContent = `Today is ${WEEKDAYS[now.getDay()]}, ${MONTHS_FULL[TODAY_M - 1]} ${TODAY_D}.`;
  }

  // Enhance: reveal the interactive app, hide the no-JS source.
  root.classList.add("is-enhanced");
  app.hidden = false;
  show(TODAY_Y, TODAY_M);
}
