/* Calendar island. The month/day grid is fully pre-rendered (see
   pages/calendar.astro); this only adds the things that depend on the
   visitor's real clock or scroll position:
     1. highlight today's day cell + a "Jump to today" button, and
     2. mark the month rail link for the section currently in view.
   A build-time `new Date()` would freeze "today" to the deploy day, so it must
   run client-side. */

import { MONTHS_FULL, WEEKDAYS } from "../lib/format";

const now = new Date();
const m = now.getMonth() + 1;
const d = now.getDate();

/* ---------- today ---------- */
const todayCell = document.getElementById(`d-${m}-${d}`);
const label = document.getElementById("cal-today-label");
const btn = document.getElementById(
  "cal-today-btn",
) as HTMLButtonElement | null;
const dateText = `${WEEKDAYS[now.getDay()]}, ${MONTHS_FULL[m - 1]} ${d}`;

if (todayCell) {
  todayCell.classList.add("is-today");
  const ribbon = document.createElement("span");
  ribbon.className = "cal-today-ribbon";
  ribbon.textContent = "Today";
  todayCell.querySelector(".cal-date")?.appendChild(ribbon);

  if (label) label.textContent = `Today is ${dateText}.`;
  if (btn) {
    btn.hidden = false;
    btn.addEventListener("click", () =>
      todayCell.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }
} else if (label) {
  // No fixed commemoration loaded for today — still orient the reader.
  label.textContent = `Today is ${dateText}.`;
}

/* ---------- active month in the rail ---------- */
const links = [...document.querySelectorAll<HTMLAnchorElement>(".cal-nav a")];
const sections = [...document.querySelectorAll<HTMLElement>(".cal-month")];
const linkFor = new Map<string, HTMLAnchorElement>(
  links.map((a) => [a.getAttribute("href") || "", a]),
);

if ("IntersectionObserver" in window && sections.length) {
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const a = linkFor.get(`#${e.target.id}`);
        if (!a) continue;
        links.forEach((l) => l.classList.remove("is-on"));
        a.classList.add("is-on");
        a.scrollIntoView({ block: "nearest", inline: "center" });
      }
    },
    // Trip when a month heading reaches the top band under the sticky rail.
    { rootMargin: "-56px 0px -80% 0px", threshold: 0 },
  );
  sections.forEach((s) => obs.observe(s));
}
