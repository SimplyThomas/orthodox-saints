/* Finder island: faceted client-side search over the inlined finder data.
   Ported from app.js (render/row/pager/chips/facets wiring). Rows are real
   links to /saint/[id]; the detail-modal island intercepts clicks. */

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
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ac";
        b.innerHTML = `${esc(v)}<span class="x" aria-hidden="true">×</span>`;
        b.setAttribute("aria-label", `Remove filter ${v}`);
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
  }

  function render() {
    const anyActive = !!query || activeCount(selected) > 0;
    const clearBtn = $<HTMLButtonElement>("#clear-all");
    if (clearBtn) clearBtn.hidden = !anyActive;
    // Hide the editorial "today/featured" band while actively searching.
    const band = $("#cloud-band");
    if (band) (band as HTMLElement).hidden = anyActive;

    const matched = sortSaints(
      SAINTS.filter((s) => matches(s, query, selected)),
      sortMode,
    );
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

    const pages = Math.max(1, Math.ceil(matched.length / PER_PAGE));
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
    for (const s of matched.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE))
      frag.appendChild(row(s));
    ol.appendChild(frag);
    renderPager(pages);
  }

  function wireEvents() {
    $<HTMLInputElement>("#q")?.addEventListener("input", (e) => {
      query = (e.target as HTMLInputElement).value.trim();
      page = 0;
      render();
    });
    $("#hero-search-btn")?.addEventListener("click", () => scrollToFinder());
    $("#q")?.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") scrollToFinder();
    });
    $("#clear-all")?.addEventListener("click", clearAll);
    $<HTMLSelectElement>("#sort")?.addEventListener("change", (e) => {
      sortMode = (e.target as HTMLSelectElement).value as SortMode;
      render();
    });

    // Facet checkbox changes (delegated).
    $("#facets")?.addEventListener("change", (e) => {
      const t = e.target as HTMLInputElement;
      if (t.tagName !== "INPUT" || !t.dataset.key) return;
      const set = selected[t.dataset.key];
      if (t.checked) set.add(t.value);
      else set.delete(t.value);
      page = 0;
      render();
    });

    // Browse-by chips open the matching facet group and scroll to the finder.
    $$(".browse-by .chip").forEach((c) =>
      c.addEventListener("click", () => {
        const key = (c as HTMLElement).dataset.browse;
        const d = $<HTMLDetailsElement>(`#facets details[data-key="${key}"]`);
        if (d) d.open = true;
        scrollToFinder();
      }),
    );

    // Deep-link: focus the search box when arriving at #q.
    if (location.hash === "#q") {
      const q = $<HTMLInputElement>("#q");
      q?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => q?.focus(), 300);
    }
  }

  wireEvents();
  render();
}
