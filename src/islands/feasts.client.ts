/* Feasts & Fasts island — adds the two clock-dependent features a static
   build can't pre-render (a build-time new Date() freezes to deploy day):

   1. Today's commemorations — fetches the same content-hashed card payload
      the home cloud-band uses (browser-cached across pages) and lists the
      saints whose feast string carries today's "Mon D".
   2. The "coming up next" card — resolves every feast's date tokens against
      the visitor's clock (lib/feast-dates + the Pascha table shipped in the
      inline #ff-data payload) and renders the nearest feast/fast,
      data-driven from the CSV fields (no hand-authored copy to go stale).
   3. Tab filtering for the pre-rendered sections.

   With JS disabled the pre-rendered lists stay fully readable; the today
   section shows its calendar link fallback and the upcoming card stays
   hidden. */

import {
  type DateToken,
  type PaschaTable,
  daysUntil,
  nextOccurrence,
} from "../lib/feast-dates";
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
const todaySaintsEl = document.getElementById("ff-today-saints");
const upcomingSec = document.getElementById("ff-upcoming");

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

if (root && dataEl && todaySec && upcomingSec) {
  const { feasts, pascha } = JSON.parse(dataEl.textContent || "{}") as {
    feasts: IslandFeast[];
    pascha: PaschaTable;
  };
  const now = new Date();

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

    const top = el("div", "ff-up-top");
    const left = el("div", "");
    const eb = el("div", "ff-up-eb");
    eb.append(el("span", "pulse"));
    eb.append(el("span", "eyebrow", eyebrow));
    if (feast.fasting) {
      const pill = el(
        "span",
        `ff-fast ff-fast--${
          {
            "Fast-Free": "free",
            "Strict Fast": "strict",
            "Fish Allowed": "fish",
            "Dairy Allowed": "dairy",
            "Wine & Oil": "wine",
          }[feast.fasting] ?? "varies"
        } on-ivory`,
        feast.fasting,
      );
      eb.append(pill);
    }
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
      const show =
        filter === "all"
          ? s.dataset.cat !== "calendar"
          : s.dataset.cat === filter;
      s.classList.toggle("is-hidden", !show);
    });
  }
  tabs.forEach((t) =>
    t.addEventListener("click", () => applyFilter(t.dataset.filter || "all")),
  );

  /* ── today's commemorations ── */
  if (todayDateEl) {
    todayDateEl.textContent = `Today · ${WEEKDAYS[now.getDay()]}, ${
      MONTHS_FULL[now.getMonth()]
    } ${now.getDate()}`;
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
