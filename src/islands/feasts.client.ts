/* Feasts & Fasts island — adds the clock-dependent features a static build
   can't pre-render (a build-time new Date() freezes to deploy day):

   1. Today's commemorations — the feasts and fasts KEPT today (resolved
      through the shared lib/liturgical layer, so this page and the home
      "Today" card never word the same day differently), plus the saints whose
      feast string carries today's "Mon D" (from the same content-hashed card
      payload the home cloud-band uses, browser-cached across pages).
   2. The "coming up next" card — resolves every feast's date tokens against
      the visitor's clock (lib/feast-dates + the Pascha table shipped in the
      inline #ff-data payload) and renders the nearest feast/fast STILL AHEAD,
      data-driven from the CSV fields (no hand-authored copy to go stale).
      It deliberately looks only forward; today belongs to (1).
   3. Tab filtering for the pre-rendered sections.

   With JS disabled the pre-rendered lists stay fully readable; the today
   section shows its calendar link fallback and the kept-today and upcoming
   cards stay hidden. */

import {
  type DateToken,
  type PaschaTable,
  daysUntil,
  nextOccurrence,
} from "../lib/feast-dates";
import {
  activeObservances,
  dayLiturgics,
  observanceLabel,
  observanceName,
  sortObservances,
} from "../lib/liturgical";
import { MONTHS, MONTHS_FULL, WEEKDAYS, withBase } from "../lib/format";
import { monogramLetter, splitName } from "../lib/names";

interface IslandFeast {
  id: string;
  name: string;
  kind: "great" | "feast" | "fast" | "observance";
  category: string;
  dedication?: string;
  fasting?: string;
  fastingNotes?: string;
  brief: string;
  begins: DateToken;
  ends?: DateToken;
  forefeast?: DateToken;
  apodosis?: DateToken;
}

interface CardSaint {
  id: string;
  name: string;
  rank: string[];
  feast: string;
}

const root = document.getElementById("feasts-page");
const dataEl = document.getElementById("ff-data");
const todaySec = document.getElementById("ff-today");
const todayDateEl = document.getElementById("ff-today-date");
const todayKeptEl = document.getElementById("ff-today-kept");
const todaySaintsEl = document.getElementById("ff-today-saints");
const upcomingSec = document.getElementById("ff-upcoming");

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* The fasting-discipline vocab → the global .ff-fast--* badge tone. Mirrors
   fastTone() in lib/feasts, which an island can't import (it reads
   feasts.json off disk at build time). */
const FAST_TONE: Record<string, string> = {
  "Fast-Free": "free",
  "Strict Fast": "strict",
  "Fish Allowed": "fish",
  "Dairy Allowed": "dairy",
  "Wine & Oil": "wine",
};

function fastPill(tone: string, label: string, extra = ""): HTMLElement {
  return el("span", `ff-fast ff-fast--${tone}${extra}`, label);
}

/** Pill for a feast's own recorded `Fasting Discipline` vocab term. */
function disciplinePill(discipline: string, extra = ""): HTMLElement {
  return fastPill(FAST_TONE[discipline] ?? "varies", discipline, extra);
}

/** A feast's own page — built from the id's integer part so the href never
    carries raw DOM text (#ff-data is DOM-sourced; CodeQL js/xss-through-dom).
    Returns "" for an id that isn't a well-formed FF-####. */
function feastHref(id: string): string {
  const n = Number(id.replace(/^FF-/, ""));
  if (!id.startsWith("FF-") || !Number.isInteger(n) || n < 0) return "";
  return withBase(`feast/FF-${String(n).padStart(4, "0")}`);
}

if (root && dataEl && todaySec && upcomingSec) {
  const { feasts, pascha } = JSON.parse(dataEl.textContent || "{}") as {
    feasts: IslandFeast[];
    pascha: PaschaTable;
  };
  const now = new Date();

  /* ── Pascha dates card: hide past years, mark the next Pascha ── */
  const pdList = document.getElementById("ff-pascha-dates");
  if (pdList) {
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    let shown = 0;
    let markedNext = false;
    for (const li of pdList.querySelectorAll<HTMLLIElement>(".ff-pd")) {
      const iso = pascha[li.dataset.year || ""];
      const [y, m, d] = (iso || "").split("-").map(Number);
      const date = iso ? new Date(y, m - 1, d).getTime() : NaN;
      if (!iso || date < today || shown >= 8) {
        li.hidden = true;
        continue;
      }
      shown++;
      if (!markedNext) {
        li.classList.add("is-next");
        li.append(el("span", "ff-pd-next", "Next"));
        markedNext = true;
      }
    }
  }

  /* ── coming up next ── */
  interface Next {
    feast: IslandFeast;
    date: Date;
    days: number;
  }
  const upcoming: Next[] = feasts
    .map((f) => {
      const date = nextOccurrence(f.begins, now, pascha);
      return date ? { feast: f, date, days: daysUntil(date, now) } : null;
    })
    .filter((n): n is Next => n !== null)
    .sort((a, b) => a.days - b.days);

  const nextOf = (kinds: string[]): Next | undefined =>
    upcoming.find((n) => kinds.includes(n.feast.kind) && n.days > 0);

  const fmtDate = (d: Date): string => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

  function renderUpcoming(eyebrow: string, next: Next | undefined): void {
    if (!upcomingSec) return;
    upcomingSec.replaceChildren();
    if (!next) {
      upcomingSec.hidden = true;
      return;
    }
    const { feast, date, days } = next;

    // The whole card links through to the feast's detail page (the highest-
    // traffic path into it).
    const top = el("a", "ff-up-top") as HTMLAnchorElement;
    const href = feastHref(feast.id);
    if (href) top.href = href;
    const left = el("div", "");
    const eb = el("div", "ff-up-eb");
    eb.append(el("span", "pulse"));
    eb.append(el("span", "eyebrow", eyebrow));
    if (feast.fasting) eb.append(disciplinePill(feast.fasting, " on-ivory"));
    left.append(eb);
    left.append(el("h2", "ff-up-name", feast.name));
    left.append(el("div", "ff-up-leads", feast.brief));
    if (feast.fastingNotes)
      left.append(el("p", "ff-up-lead", feast.fastingNotes));

    const when = el("div", "ff-up-when");
    const count = el("div", "ff-up-count");
    count.append(el("b", "", String(days)));
    count.append(el("span", "", days === 1 ? "day away" : "days away"));
    when.append(count);
    const beginsRow = el("div", "ff-up-dates", feast.ends ? "Begins " : "");
    beginsRow.append(el("b", "", fmtDate(date)));
    when.append(beginsRow);
    if (feast.ends) {
      const end = nextOccurrence(feast.ends, date, pascha);
      if (end) {
        const endRow = el("div", "ff-up-dates", "Ends ");
        endRow.append(el("b", "", fmtDate(end)));
        when.append(endRow);
      }
    }

    top.append(left, when);
    upcomingSec.append(top);
    upcomingSec.hidden = false;
  }

  function updateUpcoming(filter: string): void {
    if (!upcomingSec) return;
    if (filter === "observances") {
      upcomingSec.hidden = true;
      return;
    }
    if (filter === "feasts") {
      renderUpcoming("The next feast", nextOf(["great", "feast"]));
    } else if (filter === "fasts") {
      renderUpcoming("The next fast", nextOf(["fast"]));
    } else {
      renderUpcoming(
        "Coming up next in the Church year",
        nextOf(["great", "feast", "fast"]),
      );
    }
  }

  /* ── tabs ── */
  const tabs = root.querySelectorAll<HTMLButtonElement>(".ff-tab");
  const secs = root.querySelectorAll<HTMLElement>(".ff-idx-sec");
  function applyFilter(filter: string): void {
    tabs.forEach((t) =>
      t.setAttribute(
        "aria-selected",
        t.dataset.filter === filter ? "true" : "false",
      ),
    );
    if (todaySec) todaySec.hidden = filter !== "all";
    updateUpcoming(filter);
    secs.forEach((s) => {
      s.classList.toggle("is-hidden", s.dataset.cat !== filter);
    });
  }
  tabs.forEach((t) =>
    t.addEventListener("click", () => applyFilter(t.dataset.filter || "all")),
  );

  /* ── month accordions (Summary + Full Calendar): open one month at a time,
     current month first. The <details> toggle without JS; this just adds
     exclusivity + a sensible default. ── */
  function wireAccordion(sec: HTMLElement | null): void {
    if (!sec) return;
    const months = Array.from(
      sec.querySelectorAll<HTMLDetailsElement>(".ff-cal-mo"),
    );
    months.forEach((d) =>
      d.addEventListener("toggle", () => {
        if (d.open) months.forEach((o) => o !== d && (o.open = false));
      }),
    );
    const curName = MONTHS_FULL[now.getMonth()];
    const current = months.find(
      (d) => d.querySelector(".ff-cal-mo-name")?.textContent === curName,
    );
    (current ?? months[0])?.setAttribute("open", "");
  }
  wireAccordion(root.querySelector<HTMLElement>('[data-cat="all"]'));
  wireAccordion(root.querySelector<HTMLElement>('[data-cat="calendar"]'));

  /* ── today's commemorations ── */
  if (todayDateEl) {
    todayDateEl.textContent = `Today · ${WEEKDAYS[now.getDay()]}, ${
      MONTHS_FULL[now.getMonth()]
    } ${now.getDate()}`;
  }

  /* ── the feasts & fasts KEPT today ──
     Resolved through lib/liturgical, the same layer the /calendar day panel
     and the home "Today" card use, so a day is never described two ways. The
     page follows the New (Revised Julian) reckoning, like the rest of the
     feasts data. */
  if (todayKeptEl) {
    // sortObservances is the same order the home card's lead comes off, so
    // the first card here and the home ribbon always name the same thing
    const kept = sortObservances(activeObservances(feasts, pascha, now, "new"));

    if (kept.length) {
      // activeObservances narrows to the shared LitFeast, so the page's own
      // fields (kind, brief) come back off the payload by id
      const byId = new Map(feasts.map((f) => [f.id, f]));
      const lit = dayLiturgics(kept, now, "new");

      const head = el("div", "ff-kept-head");
      head.append(el("h3", "ff-kept-title", "Kept today"));
      // the resolved fasting rule for the day — the reason most visitors are
      // on this page at all
      if (lit.fasting)
        head.append(fastPill(lit.fasting.key, lit.fasting.label, " on-ivory"));
      todayKeptEl.append(head);

      const list = el("ul", "ff-kept-list");
      for (const o of kept) {
        const full = byId.get(o.feast.id);
        const li = el("li", `ff-kept ff-kept--${full?.kind ?? "observance"}`);
        const href = feastHref(o.feast.id);
        const a = el(href ? "a" : "div", "ff-kept-link");
        if (href) (a as HTMLAnchorElement).href = href;
        a.append(el("span", "ff-kept-kick", observanceLabel(o.feast, o.role)));
        const name = el("span", "ff-kept-name", observanceName(o.feast));
        name.append(el("span", "arr", "→"));
        a.append(name);
        if (full?.brief) a.append(el("p", "ff-kept-brief", full.brief));
        li.append(a);
        list.append(li);
      }
      todayKeptEl.append(list);
      todayKeptEl.hidden = false;
    }
  }
  const AVATAR_TONE = (rank: string[]): string => {
    const r = rank.join(" ");
    if (/Martyr|Passion-Bearer/i.test(r)) return "t-martyr";
    if (/Hierarch|Apostle|Enlightener|Equal-to-the-Apostles/i.test(r))
      return "t-hierarch";
    return "t-monastic";
  };
  const cardSrc = root.dataset.cardSrc;
  if (cardSrc && todaySaintsEl) {
    const token = `${MONTHS[now.getMonth()]} ${now.getDate()}`;
    const re = new RegExp(`\\b${token}\\b`);
    fetch(cardSrc)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((saints: CardSaint[]) => {
        const todays = saints.filter((s) => re.test(s.feast)).slice(0, 8);
        if (!todays.length) return; // keep the calendar-link fallback
        todaySaintsEl.replaceChildren(
          ...todays.map((s) => {
            const { title, epithet } = splitName(s.name);
            const a = document.createElement("a");
            a.className = "ff-today-saint";
            a.href = withBase(`saint/${s.id}`);
            const av = el("span", `ff-today-av ${AVATAR_TONE(s.rank)}`);
            av.textContent = monogramLetter(s.name);
            const text = el("span", "");
            const name = el("span", "ff-today-name", title);
            name.append(el("span", "arr", "→"));
            const role = el("span", "ff-today-role");
            if (s.rank[0]) role.append(el("span", "tag", s.rank[0]));
            if (epithet) role.append(` · ${epithet}`);
            text.append(name, role);
            a.append(av, text);
            return a;
          }),
        );
      })
      .catch(() => {
        /* fallback copy stays */
      });
  }

  /* boot: honor the SSR-selected tab */
  applyFilter(root.dataset.initialTab || "all");
}
