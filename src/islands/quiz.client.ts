/* Patron-quiz island. Wires the SSR'd chips, scores saints by weighted facet
   overlap, and renders the patron + runners-up cards. Ported from app.js
   buildQuiz wiring + renderQuizResults. Cards are real /saint links; the
   detail-modal island handles the quick-look. */

import type { FinderSaint } from "../lib/types";
import { QUIZ, emptyQuizSelected, quizMatches } from "../lib/quiz";
import { rankSlug, primaryRank, firstFeast, centuryLabel } from "../lib/saints";
import { splitName } from "../lib/names";
import { esc, withBase } from "../lib/format";
import { saintIcon } from "../lib/icons";

const dataEl = document.getElementById("finder-data");
const questionsEl = document.getElementById("quiz-questions");
if (dataEl && questionsEl) {
  const SAINTS: FinderSaint[] = JSON.parse(dataEl.textContent || "[]");
  const quizSel = emptyQuizSelected();

  // Chip toggles (delegated).
  questionsEl.addEventListener("click", (e) => {
    const chip = (e.target as Element).closest<HTMLButtonElement>(".chip");
    if (!chip || !chip.dataset.key) return;
    const set = quizSel[chip.dataset.key];
    const val = chip.dataset.val || chip.textContent || "";
    if (set.has(val)) {
      set.delete(val);
      chip.classList.remove("on");
    } else {
      set.add(val);
      chip.classList.add("on");
    }
  });

  function renderQuizResults() {
    const box = document.getElementById("quiz-results");
    if (!box) return;
    box.innerHTML = "";
    if (!QUIZ.some((g) => quizSel[g.key].size)) {
      box.innerHTML =
        "<p class='quiz-hint'>Pick at least one answer above, then try again.</p>";
      return;
    }
    const matched = quizMatches(SAINTS, quizSel);
    if (!matched.length) {
      box.innerHTML =
        "<p class='quiz-hint'>No saints matched those answers yet — try broadening your choices.</p>";
      return;
    }
    const top = matched[0];
    const runners = matched.slice(1, 4);
    const sn = splitName(top.s.name);
    const reasons = [...new Set(top.reasons)].slice(0, 8);

    // Build cards as fully-escaped HTML strings (every interpolation passes
    // through esc(), including hrefs and the rank slug) rather than assigning
    // .href/.dataset from data — this is the same safe pattern the finder uses.
    const cardHtml = `
      <a class="patron-card" data-saint="${esc(top.s.id)}" href="${esc(withBase(`saint/${top.s.id}`))}">
        <div class="frame">${saintIcon(170, 210, "gold", true, true)}</div>
        <div>
          <h2>${esc(sn.title)}</h2>
          <div class="epithet">${esc(sn.epithet || (top.s.aka && top.s.aka[0]) || "")}</div>
          <div class="pmeta">
            <span class="tag ${esc(rankSlug(top.s))}" style="background:rgba(212,175,55,.18);color:var(--gold-soft)"><i></i>${esc(primaryRank(top.s))}</span>
            <span>Feast · ${esc(firstFeast(top.s))}</span><span>${esc(centuryLabel(top.s))}</span>
          </div>
          <p class="bio">${esc(top.s.brief || top.s.notes || "")}</p>
          <div class="why">
            <span class="why-label">Why</span>
            ${reasons.map((r) => `<span class="tag intercession">${esc(r)}</span>`).join("")}
          </div>
        </div>
      </a>`;

    let runnersHtml = "";
    if (runners.length) {
      const cards = runners
        .map(({ s }) => {
          const rsn = splitName(s.name);
          return `<a class="runner" data-saint="${esc(s.id)}" href="${esc(withBase(`saint/${s.id}`))}">${saintIcon(40, 50, "blue")}<div>
            <div class="rn-name">${esc(rsn.title)}</div>
            <div class="rn-sub">${esc(rsn.epithet || "")}${rsn.epithet ? " · " : ""}${esc(firstFeast(s))}</div></div></a>`;
        })
        .join("");
      runnersHtml = `<div class="runners-label">You also walk closely with</div><div class="runners">${cards}</div>`;
    }

    const wrap = document.createElement("div");
    wrap.innerHTML =
      `<div class="eyebrow quiz-results-h" style="border:0;padding:0;margin-bottom:18px">Your patron saint</div>` +
      cardHtml +
      runnersHtml;
    box.appendChild(wrap);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document
    .getElementById("quiz-submit")
    ?.addEventListener("click", renderQuizResults);
  document.getElementById("quiz-reset")?.addEventListener("click", () => {
    QUIZ.forEach((g) => quizSel[g.key].clear());
    questionsEl!
      .querySelectorAll(".chip.on")
      .forEach((c) => c.classList.remove("on"));
    const box = document.getElementById("quiz-results");
    if (box) box.innerHTML = "";
  });
}
