/* Finder island: faceted client-side search over the inlined finder data on
   the /search page. Ported from app.js (render/row/pager/chips/facets wiring).
   Rows are real links to the full /saint/[id] page. Arriving with ?q= seeds
   the query (the home hero search submits
   here); ?browse= opens that facet group; the typed query is mirrored back
   into the URL so results are shareable. */

import type { FinderSaint } from "../lib/types";
import {
  FACETS,
  PER_PAGE,
  matches,
  sortSaints,
  activeCount,
  emptySelected,
  type Selected,
  type SortMode,
} from "../lib/filter";
import {
  valuesOf,
  rankSlug,
  primaryRank,
  firstFeast,
  centuryLabel,
} from "../lib/saints";
import { splitName } from "../lib/names";
import { esc, cssEscape, withBase } from "../lib/format";
import { byzCross, saintAvatar } from "../lib/icons";
import { track } from "../lib/analytics";
import { matchThemeAlias } from "../lib/theme-aliases";
import { themeBySlug } from "../lib/themes";

const dataEl = document.getElementById("finder-data");
if (dataEl) {
  const SAINTS: FinderSaint[] = JSON.parse(dataEl.textContent || "[]");

  const $ = <T extends Element = Element>(sel: string) =>
    document.querySelector<T>(sel);
  const $$ = (sel: string) => [...document.querySelectorAll(sel)];

  const selected: Selected = emptySelected();
  let query = "";
  let sortMode: SortMode = "feast";
  let page = 0;
  // How many results per page. Defaults to PER_PAGE; the "Show" control lets the
  // reader widen it (Infinity = show all on one page).
  let perPage: number = PER_PAGE;

  // When a saint surfaced via a name variant (nickname / other-language form)
  // rather than their displayed name, name that variant.
  function matchedVia(s: FinderSaint): string {
    if (!query || !s.variants || !s.variants.length) return "";
    const q = query.toLowerCase();
    const visible = (s.name + " " + (s.aka || []).join(" ")).toLowerCase();
    if (visible.includes(q)) return "";
    return s.variants.find((v) => v.toLowerCase().includes(q)) || "";
  }

  function row(s: FinderSaint): HTMLLIElement {
    const sn = splitName(s.name);
    const li = document.createElement("li");
    const place = valuesOf(s, "origin").join(" · ");
    const via = matchedVia(s);
    li.innerHTML = `
      <a class="saint-row" data-saint="${esc(s.id)}" href="${esc(withBase(`saint/${s.id}`))}">
        <div class="portrait">${saintAvatar(s, 58, 72, { type: primaryRank(s) })}</div>
        <div class="main">
          <div class="title-line"><h3>${esc(sn.title)}</h3>${
            sn.epithet ? `<span class="epithet">${esc(sn.epithet)}</span>` : ""
          }</div>
          ${via ? `<div class="match-via">matched &ldquo;${esc(via)}&rdquo;</div>` : ""}
          <p class="bio">${esc(s.brief || s.notes || "")}</p>
          <div class="row-tags">
            <span class="tag ${rankSlug(s)}"><i></i>${esc(primaryRank(s))}</span>
            ${place ? `<span class="place">${esc(place)}</span>` : ""}
          </div>
        </div>
        <div class="aside">
          <div class="feast">${esc(firstFeast(s))}</div>
          <div class="century">${esc(centuryLabel(s))}</div>
          ${s.era ? `<div class="rank">${esc(s.era)}</div>` : ""}
        </div>
      </a>`;
    return li;
  }

  function scrollToFinder() {
    $("#finder")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderActiveChips() {
    const host = $("#active-chips");
    if (!host) return;
    host.innerHTML = "";
    for (const facet of FACETS) {
      for (const v of selected[facet.key]) {
        // Theme facet values are slugs; show the human label on the chip.
        const label =
          facet.key === "themes" ? (themeBySlug.get(v)?.label ?? v) : v;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ac";
        b.append(label);
        const x = document.createElement("span");
        x.className = "x";
        x.setAttribute("aria-hidden", "true");
        x.textContent = "×";
        b.append(x);
        b.setAttribute("aria-label", `Remove filter ${label}`);
        b.addEventListener("click", () => {
          selected[facet.key].delete(v);
          const cb = $<HTMLInputElement>(
            `#facets input[data-key="${facet.key}"][value="${cssEscape(v)}"]`,
          );
          if (cb) cb.checked = false;
          page = 0;
          render();
        });
        host.appendChild(b);
      }
    }
  }

  function renderPager(pages: number) {
    const host = $("#pager");
    if (!host) return;
    host.innerHTML = "";
    if (pages <= 1) return;
    const prev = document.createElement("button");
    prev.className = "nav";
    prev.textContent = "‹ Prev";
    prev.disabled = page === 0;
    prev.addEventListener("click", () => {
      page = Math.max(0, page - 1);
      render();
      scrollToFinder();
    });
    host.appendChild(prev);

    const items: (number | "ell")[] = [];
    for (let i = 0; i < pages; i++) {
      if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) items.push(i);
      else if (items[items.length - 1] !== "ell") items.push("ell");
    }
    for (const it of items) {
      if (it === "ell") {
        const e = document.createElement("span");
        e.className = "ell";
        e.textContent = "…";
        host.appendChild(e);
        continue;
      }
      const b = document.createElement("button");
      b.className = "pg" + (it === page ? " on" : "");
      b.textContent = String(it + 1);
      b.addEventListener("click", () => {
        page = it;
        render();
        scrollToFinder();
      });
      host.appendChild(b);
    }
    const next = document.createElement("button");
    next.className = "nav";
    next.textContent = "Next ›";
    next.disabled = page === pages - 1;
    next.addEventListener("click", () => {
      page = Math.min(pages - 1, page + 1);
      render();
      scrollToFinder();
    });
    host.appendChild(next);
  }

  function renderThemeSuggest() {
    const el = document.getElementById("theme-suggest");
    if (!el) return;
    const slug = query.trim() ? matchThemeAlias(query) : null;
    const meta = slug ? themeBySlug.get(slug) : null;
    el.textContent = "";
    if (slug && meta && meta.count > 0) {
      el.append("Looking for a theme? ");
      const a = document.createElement("button");
      a.type = "button";
      a.className = "link-btn";
      a.textContent = `Browse the ${meta.label} theme →`;
      // Themes now live in the Refine rail; toggle the matching facet checkbox
      // inline (the #facets change handler updates state + re-renders).
      a.addEventListener("click", () => selectTheme(slug));
      el.append(a);
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  // Check a theme facet checkbox by slug, open its group, and scroll to results.
  // Routes through the same #facets change handler a manual click would.
  function selectTheme(slug: string) {
    const box = $<HTMLInputElement>(
      `#facets input[data-key="themes"][value="${cssEscape(slug)}"]`,
    );
    if (!box) return;
    box.closest("details")?.setAttribute("open", "");
    if (!box.checked) {
      box.checked = true;
      box.dispatchEvent(new Event("change", { bubbles: true }));
    }
    scrollToFinder();
  }

  function clearAll() {
    query = "";
    const q = $<HTMLInputElement>("#q");
    if (q) q.value = "";
    FACETS.forEach((f) => selected[f.key].clear());
    $$("#facets input:checked").forEach(
      (cb) => ((cb as HTMLInputElement).checked = false),
    );
    page = 0;
    render();
    syncURL();
  }

  // Mirror the query into ?q= (replace, not push) so results are shareable
  // and survive a refresh. Other params (e.g. the modal's ?s=) are preserved.
  function syncURL() {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    if (selected.themes.size)
      url.searchParams.set("theme", [...selected.themes].join(","));
    else url.searchParams.delete("theme");
    url.searchParams.delete("browse");
    history.replaceState(history.state, "", url);
  }

  function render() {
    const anyActive = !!query || activeCount(selected) > 0;
    const clearBtn = $<HTMLButtonElement>("#clear-all");
    if (clearBtn) clearBtn.hidden = !anyActive;

    const matched = sortSaints(
      SAINTS.filter((s) => matches(s, query, selected)),
      sortMode,
    );
    // Mirror the active-filter count onto the mobile "Filters" toggle badge.
    const badge = $("#filter-count");
    if (badge) {
      const n = activeCount(selected);
      badge.textContent = n ? String(n) : "";
    }

    const title = $("#results-title");
    if (title)
      title.textContent = query ? `Results for “${query}”` : "All saints";
    const count = $("#count");
    if (count)
      count.innerHTML =
        `<b>${matched.length}</b> commemoration${matched.length === 1 ? "" : "s"}` +
        (activeCount(selected) > 0
          ? ` · ${activeCount(selected)} filter${activeCount(selected) === 1 ? "" : "s"} active`
          : "");

    renderActiveChips();
    renderThemeSuggest();

    const size = perPage === Infinity ? Math.max(matched.length, 1) : perPage;
    const pages = Math.max(1, Math.ceil(matched.length / size));
    if (page >= pages) page = pages - 1;
    const ol = $("#results");
    if (!ol) return;
    ol.innerHTML = "";
    if (matched.length === 0) {
      const li = document.createElement("li");
      li.className = "empty";
      li.innerHTML =
        `${byzCross(20, "var(--line-gold)")}No saints match these filters. ` +
        `<button type="button" class="link-btn" id="empty-clear">Clear filters</button>`;
      ol.appendChild(li);
      $("#pager")!.innerHTML = "";
      $("#empty-clear")?.addEventListener("click", clearAll);
      return;
    }
    const frag = document.createDocumentFragment();
    for (const s of matched.slice(page * size, page * size + size))
      frag.appendChild(row(s));
    ol.appendChild(frag);
    renderPager(pages);
  }

  // Debounce the analytics ping so a typed query reports once, not per keystroke.
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function trackSearch(q: string) {
    clearTimeout(searchTimer);
    if (!q) return;
    searchTimer = setTimeout(() => track("Search", { query: q }), 600);
  }

  function wireEvents() {
    $<HTMLInputElement>("#q")?.addEventListener("input", (e) => {
      query = (e.target as HTMLInputElement).value.trim();
      page = 0;
      render();
      syncURL();
      trackSearch(query);
    });
    $("#q")?.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") scrollToFinder();
    });
    $("#clear-all")?.addEventListener("click", clearAll);
    $<HTMLSelectElement>("#sort")?.addEventListener("change", (e) => {
      sortMode = (e.target as HTMLSelectElement).value as SortMode;
      render();
    });
    $<HTMLSelectElement>("#per-page")?.addEventListener("change", (e) => {
      const v = (e.target as HTMLSelectElement).value;
      perPage = v === "all" ? Infinity : Number(v);
      page = 0;
      render();
      scrollToFinder();
    });

    // Facet checkbox changes (delegated).
    $("#facets")?.addEventListener("change", (e) => {
      const t = e.target as HTMLInputElement;
      if (t.tagName !== "INPUT" || !t.dataset.key) return;
      const set = selected[t.dataset.key];
      if (t.checked) {
        set.add(t.value);
        track("Filter", { facet: t.dataset.key, value: t.value });
      } else set.delete(t.value);
      page = 0;
      render();
      // Themes deep-link via ?theme=; keep the URL in sync when they change.
      if (t.dataset.key === "themes") syncURL();
    });

    // Deep-link: focus the search box when arriving at #q.
    if (location.hash === "#q") {
      const q = $<HTMLInputElement>("#q");
      q?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => q?.focus(), 300);
    }
  }

  // Seed state from the URL: ?q= from the home hero search, ?browse= from the
  // home "Browse by" chips (opens that facet group).
  function initFromURL() {
    const params = new URL(window.location.href).searchParams;
    const q = (params.get("q") || "").trim();
    if (q) {
      query = q;
      const input = $<HTMLInputElement>("#q");
      if (input) input.value = q;
      trackSearch(q);
    }
    // ?theme=slug[,slug] — seed theme filters (from saint-page chips / shares).
    const themeParam = params.get("theme");
    if (themeParam) {
      for (const slug of themeParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)) {
        const box = $<HTMLInputElement>(
          `#facets input[data-key="themes"][value="${cssEscape(slug)}"]`,
        );
        if (!box) continue;
        box.checked = true;
        selected.themes.add(slug);
        box.closest("details")?.setAttribute("open", "");
      }
    }
    const browse = params.get("browse");
    if (browse) {
      const d = $<HTMLDetailsElement>(`#facets details[data-key="${browse}"]`);
      if (d) {
        d.open = true;
        d.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  wireEvents();
  initFromURL();
  render();
}
