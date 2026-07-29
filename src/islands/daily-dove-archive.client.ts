/* The /news/archive facet rail.
   Five groups, one active value each, combined with AND. Clicking an active
   facet clears it. Every row is already in the DOM — this only hides the ones
   that don't match, so the archive reads fine with JavaScript off. */

type Facet = "cat" | "verify" | "era" | "century" | "region" | "saint";
const FACETS: Facet[] = ["cat", "verify", "era", "century", "region", "saint"];

const rows = [...document.querySelectorAll<HTMLElement>(".arc-row")];
const facetBtns = [...document.querySelectorAll<HTMLElement>(".arc-facet")];
const countEl = document.getElementById("arc-count");
const nounEl = document.getElementById("arc-noun");
const shownEl = document.getElementById("arc-shown");
const chipsEl = document.getElementById("arc-chips");
const emptyEl = document.getElementById("arc-empty");
const clearBtn = document.getElementById("arc-clear");
const emptyClearBtn = document.getElementById("arc-empty-clear");

if (rows.length && facetBtns.length) {
  const active: Record<Facet, string> = {
    cat: "",
    verify: "",
    era: "",
    century: "",
    region: "",
    saint: "",
  };

  /* The chip's own label, taken from the facet button so the two never drift. */
  const labelFor = (facet: Facet, value: string) =>
    facetBtns
      .find((b) => b.dataset.facet === facet && b.dataset.value === value)
      ?.querySelector(".arc-flabel")
      ?.textContent?.trim() ?? value;

  const renderChips = () => {
    if (!chipsEl) return;
    chipsEl.textContent = "";
    for (const facet of FACETS) {
      const value = active[facet];
      if (!value) continue;
      const chip = document.createElement("span");
      chip.className = "arc-chip";
      chip.append(labelFor(facet, value));
      const x = document.createElement("button");
      x.type = "button";
      x.setAttribute("aria-label", `Clear ${labelFor(facet, value)}`);
      x.textContent = "×";
      x.addEventListener("click", () => {
        active[facet] = "";
        apply();
      });
      chip.append(x);
      chipsEl.append(chip);
    }
  };

  const apply = () => {
    const filtering = FACETS.some((f) => active[f] !== "");

    for (const btn of facetBtns) {
      const facet = btn.dataset.facet as Facet | undefined;
      btn.classList.toggle(
        "on",
        !!facet && active[facet] === btn.dataset.value,
      );
    }

    let shown = 0;
    for (const row of rows) {
      const ok = FACETS.every(
        (f) => active[f] === "" || row.dataset[f] === active[f],
      );
      row.hidden = !ok;
      if (ok) shown++;
    }

    if (countEl) countEl.textContent = String(shown);
    if (nounEl) nounEl.textContent = shown === 1 ? "account" : "accounts";
    if (shownEl) shownEl.textContent = String(shown);
    if (emptyEl) emptyEl.hidden = shown > 0;
    if (clearBtn) clearBtn.hidden = !filtering;
    renderChips();
  };

  for (const btn of facetBtns) {
    btn.addEventListener("click", () => {
      const facet = btn.dataset.facet as Facet | undefined;
      const value = btn.dataset.value ?? "";
      if (!facet) return;
      // Clicking the active facet clears it.
      active[facet] = active[facet] === value ? "" : value;
      apply();
    });
  }

  const clearAll = () => {
    for (const f of FACETS) active[f] = "";
    apply();
  };
  clearBtn?.addEventListener("click", clearAll);
  emptyClearBtn?.addEventListener("click", clearAll);

  apply();
}
