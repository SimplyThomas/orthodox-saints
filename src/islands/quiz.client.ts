/* Patron-quiz island — the one-question-per-screen pilgrimage. The intro,
   question steps, and result shell are SSR'd (QuizForm.astro); this island
   reveals one screen at a time, tallies multi-select picks per question,
   scores saints by weighted facet overlap (lib/quiz), and renders the
   illuminated result panel. Cards are real /saint links; the detail-modal
   island handles the quick-look on companions. */

import type { FinderSaint } from "../lib/types";
import { QUIZ, emptyQuizSelected, quizMatches } from "../lib/quiz";
import {
  rankSlug,
  primaryRank,
  firstFeast,
  centuryLabel,
  cleanName,
} from "../lib/saints";
import { splitName } from "../lib/names";
import { esc, withBase } from "../lib/format";
import { saintAvatar } from "../lib/icons";
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

  const eyebrowRule = (label: string) => `
    <div class="eyebrow-rule">
      <span class="ln" aria-hidden="true"></span><span class="dm" aria-hidden="true"></span>
      <span class="lbl">${esc(label)}</span>
      <span class="dm" aria-hidden="true"></span><span class="ln" aria-hidden="true"></span>
    </div>`;

  function renderResult() {
    const anyPicked = QUIZ.some((g) => quizSel[g.key].size);
    const matched = anyPicked ? quizMatches(SAINTS, quizSel) : [];

    if (!matched.length) {
      resultsBox.innerHTML = `
        <div class="qz-empty">
          ${eyebrowRule("A Gentle Word")}
          <h2>Nothing yet to match</h2>
          <p class="qz-lede">Make a few selections along the way, and
            we&rsquo;ll point you toward a saint whose life echoes your own.</p>
          <button type="button" class="btn btn--gold" id="quiz-again">Begin again</button>
        </div>`;
      document
        .getElementById("quiz-again")
        ?.addEventListener("click", () => show(0));
      return;
    }

    const top = matched[0];
    track("Quiz Completed", { top_match: top.s.name });
    const others = matched.slice(1, 3);
    const sn = splitName(top.s.name);
    const patronOf = (top.s.intercession || []).length
      ? top.s.intercession.join(" · ")
      : [...new Set(top.reasons)].slice(0, 8).join(" · ");

    const companions = others.length
      ? `
      <div class="qz-companions">
        <p class="qz-comp-label">You also walk closely with</p>
        <div class="qz-comp-row">
          ${others
            .map(({ s }) => {
              const rsn = splitName(s.name);
              return `
              <a class="qz-comp" data-saint="${esc(s.id)}" href="${esc(withBase(`saint/${s.id}`))}">
                ${saintAvatar(s, 42, 52, { type: primaryRank(s) })}
                <div>
                  <div class="nm">${esc(rsn.title)}</div>
                  <div class="sub">${esc(rsn.epithet || (s.aka && s.aka[0]) || "")}${
                    rsn.epithet || (s.aka && s.aka[0]) ? " · " : ""
                  }${esc(firstFeast(s))}</div>
                </div>
              </a>`;
            })
            .join("")}
        </div>
      </div>`
      : "";

    resultsBox.innerHTML = `
      <div class="qz-result-head">${eyebrowRule("Your Patron Saint")}</div>

      <div class="qz-panel qz-patron">
        <span class="corner tl" aria-hidden="true"></span>
        <span class="corner tr" aria-hidden="true"></span>
        <span class="corner bl" aria-hidden="true"></span>
        <span class="corner br" aria-hidden="true"></span>
        <div class="frame">${saintAvatar(top.s, 180, 222, { type: primaryRank(top.s) })}</div>
        <div class="qz-patron-body">
          <h1>${esc(sn.title)}</h1>
          <div class="epithet">${esc(sn.epithet || (top.s.aka && top.s.aka[0]) || "")}</div>
          <div class="pmeta">
            <span class="tag ${esc(rankSlug(top.s))} on-blue"><i></i>${esc(primaryRank(top.s))}</span>
            <span>Feast · ${esc(firstFeast(top.s))}</span>
            <span>${esc(centuryLabel(top.s))}</span>
          </div>
          <p class="bio">${esc(top.s.brief || top.s.notes || "")}</p>
          ${
            patronOf
              ? `<div class="patron-of"><span class="lbl">Patron of </span>${esc(patronOf)}</div>`
              : ""
          }
        </div>
      </div>

      ${companions}

      <div class="qz-actions">
        <a class="btn btn--gold qz-read" href="${esc(withBase(`saint/${top.s.id}`))}">
          Read the full entry
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
        <button type="button" class="btn btn--ghost" id="quiz-retake">Retake the quiz</button>
      </div>

      <div class="rule qz-bene-rule"><span class="dot"></span></div>
      <p class="qz-benediction">Holy ${esc(cleanName(top.s.name))}, pray to God for us.</p>`;

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
