/* Patron-quiz island — the one-question-per-screen pilgrimage. The intro,
   question steps, and result shell are SSR'd (QuizForm.astro); this island
   reveals one screen at a time, tallies multi-select picks per question,
   scores saints by weighted facet overlap (lib/quiz), and renders the
   illuminated result panel. Cards are real links to the full /saint page. */

import type { FinderSaint } from "../lib/types";
import {
  QUIZ,
  emptyQuizSelected,
  quizMatches,
  tierMatches,
  exploreLinks,
  type QuizReason,
  type QuizMatch,
  type ExploreLink,
} from "../lib/quiz";
import { rankSlug, primaryRank, firstFeast, centuryLabel } from "../lib/saints";
import { splitName } from "../lib/names";
import { esc, withBase } from "../lib/format";
import { saintAvatar, reviewedDove } from "../lib/icons";
import { track } from "../lib/analytics";

const dataEl = document.getElementById("finder-data");
const root = document.getElementById("quiz");
if (dataEl && root) {
  const SAINTS: FinderSaint[] = JSON.parse(dataEl.textContent || "[]");
  const quizSel = emptyQuizSelected();
  const resultsBox = document.getElementById("quiz-results")!;

  const screens = [...root.querySelectorAll<HTMLElement>("[data-qstep]")];
  type Step = "intro" | number | "result";

  function show(step: Step) {
    const key = String(step);
    for (const s of screens) s.hidden = s.dataset.qstep !== key;
    // Each step is its own page-like screen — start it at the top.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Flat list of distinct matched values (for the compact companion line).
  const sharedValues = (reasons: QuizReason[]) => [
    ...new Set(reasons.map((r) => r.value)),
  ];

  const eyebrowRule = (label: string) => `
    <div class="eyebrow-rule">
      <span class="ln" aria-hidden="true"></span><span class="dm" aria-hidden="true"></span>
      <span class="lbl">${esc(label)}</span>
      <span class="dm" aria-hidden="true"></span><span class="ln" aria-hidden="true"></span>
    </div>`;

  // Tier 1 card — a richer, equally-weighted recommendation (no single "patron").
  // The whole card is a link to the saint's full page; the "why" line names what
  // the seeker matched on (transparency), not the saint's full patronage.
  function cardHTML(m: QuizMatch<FinderSaint>) {
    const s = m.s;
    const sn = splitName(s.name);
    const epithet = sn.epithet || (s.aka && s.aka[0]) || "";
    const shared = sharedValues(m.reasons).join(" · ");
    return `
      <a class="qz-card" data-saint="${esc(s.id)}" href="${esc(withBase(`saint/${s.id}`))}">
        <div class="qz-card-portrait">${saintAvatar(s, 76, 94, { type: primaryRank(s) })}</div>
        <div class="qz-card-body">
          <div class="qz-card-nameline"><h3 class="qz-card-name">${esc(sn.title)}</h3>${s.humanReviewed ? reviewedDove(25) : ""}</div>
          ${epithet ? `<div class="qz-card-epithet">${esc(epithet)}</div>` : ""}
          <div class="qz-card-meta">
            <span class="tag ${esc(rankSlug(s))}"><i></i>${esc(primaryRank(s))}</span>
            <span>Feast · ${esc(firstFeast(s))}</span>
            <span>${esc(centuryLabel(s))}</span>
          </div>
          ${s.brief || s.notes ? `<p class="qz-card-bio">${esc(s.brief || s.notes || "")}</p>` : ""}
          ${shared ? `<div class="qz-card-why"><span class="lbl">Why</span><span class="vals">${esc(shared)}</span></div>` : ""}
        </div>
      </a>`;
  }

  // Tier 2 row — a compact companion (same shape as before).
  function rowHTML(m: QuizMatch<FinderSaint>) {
    const s = m.s;
    const rsn = splitName(s.name);
    const epithet = rsn.epithet || (s.aka && s.aka[0]) || "";
    const shared = sharedValues(m.reasons).slice(0, 3).join(" · ");
    return `
      <a class="qz-comp" data-saint="${esc(s.id)}" href="${esc(withBase(`saint/${s.id}`))}">
        ${saintAvatar(s, 42, 52, { type: primaryRank(s) })}
        <div>
          <div class="nm">${esc(rsn.title)}${s.humanReviewed ? reviewedDove(18) : ""}</div>
          <div class="sub">${esc(epithet)}${epithet ? " · " : ""}${esc(firstFeast(s))}</div>
          ${shared ? `<div class="shared">${esc(shared)}</div>` : ""}
        </div>
      </a>`;
  }

  // Tier 3 chip — deep-links into the finder pre-filtered by one facet value, so
  // the seeker can keep exploring the whole catalog along that dimension.
  function chipHTML(link: ExploreLink) {
    const href = `${withBase("search")}?${encodeURIComponent(link.facet)}=${encodeURIComponent(link.value)}`;
    return `
      <a class="qz-explore-chip" href="${esc(href)}">
        <span class="ex-kind">${esc(link.kind)}</span>
        <span class="ex-val">${esc(link.value)}</span>
      </a>`;
  }

  function tierSection(label: string, inner: string, mod: string) {
    return inner
      ? `<div class="qz-tier qz-tier--${mod}">${eyebrowRule(label)}${inner}</div>`
      : "";
  }

  function renderResult() {
    const anyPicked = QUIZ.some((g) => quizSel[g.key].size);
    const matched = anyPicked ? quizMatches(SAINTS, quizSel) : [];

    if (!matched.length) {
      resultsBox.innerHTML = `
        <div class="qz-empty">
          ${eyebrowRule("A Gentle Word")}
          <h2>Nothing yet to match</h2>
          <p class="qz-lede">Make a few selections along the way, and
            we&rsquo;ll introduce you to saints whose lives echo your own.</p>
          <button type="button" class="btn btn--gold" id="quiz-again">Begin again</button>
        </div>`;
      document
        .getElementById("quiz-again")
        ?.addEventListener("click", () => show(0));
      return;
    }

    const { especially, alsoLike } = tierMatches(matched);
    track("Quiz Completed", {
      top_match: especially[0].s.name,
      matches: matched.length,
    });

    const topGrid = `<div class="qz-card-grid">${especially.map(cardHTML).join("")}</div>`;
    const moreRow = alsoLike.length
      ? `<div class="qz-comp-row">${alsoLike.map(rowHTML).join("")}</div>`
      : "";
    // Explore chips are drawn from the lead matches' real facet values.
    const explore = exploreLinks(especially.map((m) => m.s));
    const exploreRow = explore.length
      ? `<p class="qz-explore-lede">Wander deeper into the cloud of witnesses &mdash; saints who share your&hellip;</p>
         <div class="qz-explore-row">${explore.map(chipHTML).join("")}</div>`
      : "";

    resultsBox.innerHTML = `
      <div class="qz-result-head">
        ${eyebrowRule("A Circle of Companions")}
        <h1 class="qz-result-title">We think you&rsquo;ll want to get to know these saints.</h1>
        <p class="qz-result-lede">Patronage isn&rsquo;t a single right answer &mdash; here are the
          witnesses whose lives most echo your own.</p>
      </div>

      ${tierSection("Especially Recommended for You", topGrid, "top")}
      ${tierSection("You May Also Like", moreRow, "more")}
      ${tierSection("Explore Similar Saints", exploreRow, "explore")}

      <div class="qz-actions">
        <a class="btn btn--ghost qz-read" href="${esc(withBase("search"))}">
          Browse all saints
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
        <button type="button" class="btn btn--gold" id="quiz-retake">Retake the quiz</button>
      </div>`;

    document.getElementById("quiz-retake")?.addEventListener("click", restart);
  }

  function restart() {
    QUIZ.forEach((g) => quizSel[g.key].clear());
    root!.querySelectorAll(".qz-opt.on").forEach((b) => {
      b.classList.remove("on");
      b.setAttribute("aria-pressed", "false");
    });
    resultsBox.innerHTML = "";
    show("intro");
  }

  // ---- wiring (delegated) ----
  document
    .getElementById("quiz-begin")
    ?.addEventListener("click", () => show(0));

  root.addEventListener("click", (e) => {
    const t = e.target as Element;

    const opt = t.closest<HTMLButtonElement>(".qz-opt");
    if (opt && opt.dataset.key) {
      const set = quizSel[opt.dataset.key];
      const val = opt.dataset.val || "";
      if (set.has(val)) {
        set.delete(val);
        opt.classList.remove("on");
        opt.setAttribute("aria-pressed", "false");
      } else {
        set.add(val);
        opt.classList.add("on");
        opt.setAttribute("aria-pressed", "true");
      }
      return;
    }

    const stepEl = t.closest<HTMLElement>(".qz-step");
    const stepIdx = stepEl ? Number(stepEl.dataset.qstep) : NaN;

    if (t.closest("[data-continue]") && !Number.isNaN(stepIdx)) {
      if (stepIdx + 1 < QUIZ.length) show(stepIdx + 1);
      else {
        renderResult();
        show("result");
      }
      return;
    }

    if (t.closest("[data-back]") && !Number.isNaN(stepIdx)) {
      show(stepIdx > 0 ? stepIdx - 1 : "intro");
    }
  });
}
