/* The Daily Dove archive's search box and facet rail.

   Seven facet groups, one active value each, plus a free-text query — all
   combined with AND, so every control narrows what the others already left.
   Clicking an active facet clears it. Every row is already in the DOM and this
   only hides the ones that don't match, so the archive reads fine with
   JavaScript off: unfiltered, and the search box simply does nothing. */

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
/* A dispatch reports several kinds of help, so this one facet holds a token
   list rather than a single value and has to be matched accordingly. */
const MULTI: Facet[] = ["wonder"];

const rows = [...document.querySelectorAll<HTMLElement>(".arc-row")];
const facetBtns = [...document.querySelectorAll<HTMLElement>(".arc-facet")];
const qInput = document.getElementById("arc-q") as HTMLInputElement | null;
const sortSel = document.getElementById("arc-sort") as HTMLSelectElement | null;
const listEl = document.getElementById("arc-list");
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

  /* The query is ANDed with the facets, not a mode of its own: typing narrows
     whatever is already selected rather than throwing it away. Matched against
     the row's own data-search haystack (headline, saint, place, summary, desk),
     every term having to appear somewhere in it — so "xenia petersburg" finds
     the row that "petersburg xenia" finds. */
  const terms = () =>
    (qInput?.value ?? "").toLowerCase().split(/\s+/).filter(Boolean);

  const apply = () => {
    const q = terms();
    const filtering = FACETS.some((f) => active[f] !== "") || q.length > 0;

    for (const btn of facetBtns) {
      const facet = btn.dataset.facet as Facet | undefined;
      const on = !!facet && active[facet] === btn.dataset.value;
      btn.classList.toggle("on", on);
      /* A group holding an active facet unfolds itself. The groups start mostly
         shut, so without this a facet chosen from a #century-4 deep link would
         be applied and highlighted inside a group the reader cannot see — the
         list narrows and the rail gives no account of why. Never folds a group
         back up: which groups are open is the reader's business once they have
         touched the rail. */
      if (on) btn.closest("details")?.setAttribute("open", "");
    }

    let shown = 0;
    for (const row of rows) {
      const hay = row.dataset.search ?? "";
      const ok =
        q.every((t) => hay.includes(t)) &&
        FACETS.every((f) => {
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

  qInput?.addEventListener("input", apply);

  /* ---- sorting ----
     Reorders the rows in place. Every sort falls back to century then headline,
     so ties resolve the same way every time instead of drifting with whatever
     order the rows happened to be in — a list that reshuffles its equal rows on
     each change looks broken even when the sort is right.

     The DOM is reordered rather than the rows re-rendered: the nodes already
     exist, they carry their own keys, and appending an element that is already
     in the parent moves it. Filtering is untouched by this — a hidden row keeps
     its place in the order and reappears where it belongs. */
  const num = (el: HTMLElement, k: string) => Number(el.dataset[k] ?? 0);
  const str = (el: HTMLElement, k: string) => el.dataset[k] ?? "";

  const SORTS: Record<string, (a: HTMLElement, b: HTMLElement) => number> = {
    century: (a, b) => num(a, "century") - num(b, "century"),
    "century-desc": (a, b) => num(b, "century") - num(a, "century"),
    name: (a, b) => str(a, "sortname").localeCompare(str(b, "sortname")),
    place: (a, b) => str(a, "sortplace").localeCompare(str(b, "sortplace")),
    desk: (a, b) => str(a, "sortdesk").localeCompare(str(b, "sortdesk")),
    evidence: (a, b) => num(a, "vrank") - num(b, "vrank"),
    headline: (a, b) => str(a, "sorthead").localeCompare(str(b, "sorthead")),
  };

  const resort = () => {
    const cmp = SORTS[sortSel?.value ?? "century"] ?? SORTS.century;
    const ordered = rows
      .slice()
      .sort(
        (a, b) =>
          cmp(a, b) ||
          num(a, "century") - num(b, "century") ||
          str(a, "sorthead").localeCompare(str(b, "sorthead")),
      );
    for (const row of ordered) listEl?.append(row);
  };
  sortSel?.addEventListener("change", resort);

  const clearAll = () => {
    for (const f of FACETS) active[f] = "";
    if (qInput) qInput.value = "";
    apply();
  };
  clearBtn?.addEventListener("click", clearAll);
  emptyClearBtn?.addEventListener("click", clearAll);

  /* Arriving with a facet already chosen, via a #<facet>-<value> hash.

     This is what makes a filtered view of the archive linkable and shareable —
     /daily-dove/archive#era-martyrs opens on the Age of the Martyrs rather than
     on everything. The dispatch pages' kind-of-help pills link in this way.

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
