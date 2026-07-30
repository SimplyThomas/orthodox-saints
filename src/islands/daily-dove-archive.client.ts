/* The /news/archive facet rail.
   Five groups, one active value each, combined with AND. Clicking an active
   facet clears it. Every row is already in the DOM — this only hides the ones
   that don't match, so the archive reads fine with JavaScript off. */

type Facet =
  "wonder" | "cat" | "verify" | "era" | "century" | "region" | "saint";
const FACETS: Facet[] = [
  "wonder",
  "cat",
  "verify",
  "era",
  "century",
  "region",
  "saint",
];
/* An article reports several kinds of help, so this one facet holds a token
   list rather than a single value and has to be matched accordingly. */
const MULTI: Facet[] = ["wonder"];

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
    wonder: "",
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
      const ok = FACETS.every((f) => {
        if (active[f] === "") return true;
        const v = row.dataset[f] ?? "";
        return MULTI.includes(f)
          ? v.split(" ").includes(active[f])
          : v === active[f];
      });
      row.hidden = !ok;
      if (ok) shown++;
    }

    if (countEl) countEl.textContent = String(shown);
    if (nounEl) nounEl.textContent = shown === 1 ? "dispatch" : "dispatches";
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

  /* Arriving from the front page with a facet already chosen.
     The front page offers editorial ways in — "Browse the Archive by Age",
     "Browse by What Was Asked For" — and each of those links here with a
     #<facet>-<value> hash. Without this the reader would land on an unfiltered
     archive and have to make the choice a second time, which is exactly the
     dead end the front page was trying to spare them.

     Only facets the rail actually offers are honoured, so a stale or hand-typed
     hash falls through to the full archive rather than emptying it. */
  const fromHash = () => {
    const raw = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!raw) return;
    const facet = FACETS.find((f) => raw.startsWith(`${f}-`));
    if (!facet) return;
    const value = raw.slice(facet.length + 1);
    const known = facetBtns.some(
      (b) => b.dataset.facet === facet && b.dataset.value === value,
    );
    if (!known) return;
    for (const f of FACETS) active[f] = "";
    active[facet] = value;
    apply();
  };
  window.addEventListener("hashchange", fromHash);

  apply();
  fromHash();
}
