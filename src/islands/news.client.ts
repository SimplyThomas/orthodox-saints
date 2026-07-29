/* The /news filter bar.
   Both views are server-rendered: the chronological feed (#news-feed) and the
   full card grid (#news-results). This only decides which one is shown and,
   when filtering, which cards inside the grid are visible — so the page is
   fully usable with JavaScript off, just unfiltered. */

const feed = document.getElementById("news-feed");
const results = document.getElementById("news-results");
const cards = [
  ...document.querySelectorAll<HTMLElement>("#news-cards .news-feed-card"),
];
const countEl = document.getElementById("news-count");
const nounEl = document.getElementById("news-noun");
const scopeEl = document.getElementById("news-scope");
const emptyEl = document.getElementById("news-empty");
const clearBtn = document.getElementById("news-clear");
const emptyClearBtn = document.getElementById("news-empty-clear");
const centurySel = document.getElementById(
  "news-century",
) as HTMLSelectElement | null;
const verifySel = document.getElementById(
  "news-verify",
) as HTMLSelectElement | null;
const qInput = document.getElementById("news-q") as HTMLInputElement | null;
const chips = [...document.querySelectorAll<HTMLElement>(".news-chip")];

if (feed && results && cards.length) {
  let cat = "all";

  const state = () => ({
    cat,
    century: centurySel?.value ?? "",
    verify: verifySel?.value ?? "",
    q: (qInput?.value ?? "").trim().toLowerCase(),
  });

  const apply = () => {
    const s = state();
    const filtering =
      s.cat !== "all" || s.century !== "" || s.verify !== "" || s.q !== "";

    // The chip row only ever reflects the desk, not the selects.
    for (const chip of chips) {
      if (!chip.classList.contains("chip")) continue;
      chip.classList.toggle("on", chip.dataset.cat === s.cat);
    }
    if (clearBtn) clearBtn.hidden = !filtering;

    feed.hidden = filtering;
    results.hidden = !filtering;
    if (!filtering) return;

    let shown = 0;
    for (const card of cards) {
      const ok =
        (s.cat === "all" || card.dataset.cat === s.cat) &&
        (s.century === "" || card.dataset.century === s.century) &&
        (s.verify === "" || card.dataset.verify === s.verify) &&
        (s.q === "" || (card.dataset.search ?? "").includes(s.q));
      card.hidden = !ok;
      if (ok) shown++;
    }

    if (countEl) countEl.textContent = String(shown);
    if (nounEl) nounEl.textContent = shown === 1 ? "account" : "accounts";
    if (scopeEl) {
      const chip = chips.find((c) => c.dataset.cat === s.cat);
      scopeEl.textContent =
        s.cat === "all"
          ? "All desks"
          : (chip?.textContent?.trim() ?? "All desks");
    }
    if (emptyEl) emptyEl.hidden = shown > 0;
    const grid = document.getElementById("news-cards");
    if (grid) grid.hidden = shown === 0;
  };

  const clearAll = () => {
    cat = "all";
    if (centurySel) centurySel.value = "";
    if (verifySel) verifySel.value = "";
    if (qInput) qInput.value = "";
    apply();
  };

  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const next = chip.dataset.cat ?? "all";
      // Clicking the active desk again returns to everything.
      cat = cat === next ? "all" : next;
      apply();
      if (chip.closest(".cwn-rail"))
        results.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  centurySel?.addEventListener("change", apply);
  verifySel?.addEventListener("change", apply);
  qInput?.addEventListener("input", apply);
  clearBtn?.addEventListener("click", clearAll);
  emptyClearBtn?.addEventListener("click", clearAll);

  apply();
}
