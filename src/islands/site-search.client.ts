/* Quick-search typeahead, shared by the header pill and the home hero box.

   Attaches to every form marked [data-typeahead]. Lazily fetches the
   lightweight /search-index.json on first use, then filters saints
   (AND-of-tokens substring over a name/aka/variant haystack) and section
   pages, rendering a dropdown of jump-to results. Enter with no highlighted
   result submits the form natively to /search?q=… (the full faceted finder),
   so the box degrades gracefully without JS. */

import { withBase } from "../lib/format";
import { buildNameSearch, type NameSearchIndex } from "../lib/search";

interface IndexSaint {
  id: string;
  name: string;
  meta: string;
  aka?: string[];
  variants?: string[];
  prom?: number;
}
interface IndexPage {
  title: string;
  href: string;
  section?: string;
}
interface SearchIndex {
  saints: IndexSaint[];
  pages: IndexPage[];
}

const MAX_SAINTS = 7;
const MAX_PAGES = 4;

// One fetch + one built index, shared across every typeahead instance on the
// page. The name search uses the same MiniSearch engine + prominence tiebreak
// as the finder (lib/search), so results rank identically across all boxes.
let index: SearchIndex | null = null;
let saintSearch: NameSearchIndex<IndexSaint> | null = null;
let loading: Promise<void> | null = null;

const load = (): Promise<void> => {
  if (index) return Promise.resolve();
  if (loading) return loading;
  loading = fetch(withBase("search-index.json"))
    .then((r) => r.json())
    .then((data: SearchIndex) => {
      index = data;
      saintSearch = buildNameSearch(data.saints);
    })
    .catch(() => {
      index = { saints: [], pages: [] };
      saintSearch = buildNameSearch([]);
    });
  return loading;
};

// Wire one typeahead instance. `prefix` namespaces the generated option ids so
// the header and hero boxes never collide when both are on the home page.
const attach = (form: HTMLFormElement, prefix: string): void => {
  const input = form.querySelector<HTMLInputElement>(".hs-input");
  const panel = form.querySelector<HTMLElement>(".hs-panel");
  if (!input || !panel) return;

  let active = -1;

  const esc = (s: string): string =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        (
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          }) as Record<string, string>
        )[c],
    );

  const close = (): void => {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  };

  const render = (q: string): void => {
    if (!index || !saintSearch || !q) {
      close();
      return;
    }
    const ql = q.toLowerCase();

    // Same engine + prominence ranking as the finder, capped to the panel size.
    const saints = saintSearch.search(q).slice(0, MAX_SAINTS);

    const pages = index.pages
      .filter((p) => p.title.toLowerCase().includes(ql))
      .slice(0, MAX_PAGES);

    let html = "";
    let i = 0;
    const opt = (href: string, body: string, extra = ""): string =>
      `<a role="option" id="${prefix}-opt-${i++}" class="hs-opt${extra}" href="${href}" tabindex="-1">${body}</a>`;

    if (saints.length) {
      html += `<div class="hs-group" role="presentation">Saints</div>`;
      for (const s of saints) {
        html += opt(
          withBase("saint/" + s.id),
          `<span class="hs-ic" aria-hidden="true">☩</span>` +
            `<span class="hs-txt"><span class="hs-name">${esc(s.name)}</span>` +
            `<span class="hs-meta">${esc(s.meta)}</span></span>`,
        );
      }
    }

    if (pages.length) {
      html += `<div class="hs-group" role="presentation">Pages</div>`;
      for (const p of pages) {
        html += opt(
          p.href,
          `<span class="hs-ic hs-ic--page" aria-hidden="true">›</span>` +
            `<span class="hs-txt"><span class="hs-name">${esc(p.title)}</span>` +
            `<span class="hs-meta">${p.section ? esc(p.section) + " · " : ""}Page</span></span>`,
        );
      }
    }

    if (!saints.length && !pages.length)
      html += `<div class="hs-empty" role="presentation">No matches for &ldquo;${esc(q)}&rdquo;</div>`;

    const seeAll = withBase("search") + "?q=" + encodeURIComponent(q);
    html += opt(
      seeAll,
      `<span class="hs-seeall-lbl">See all results &rarr;</span>`,
      " hs-seeall",
    );

    panel.innerHTML = html;
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
    active = -1;
    input.removeAttribute("aria-activedescendant");
  };

  const options = (): HTMLElement[] =>
    Array.from(panel.querySelectorAll<HTMLElement>(".hs-opt"));

  const setActive = (n: number): void => {
    const opts = options();
    opts.forEach((o) => o.classList.remove("active"));
    if (n >= 0 && n < opts.length) {
      active = n;
      opts[n].classList.add("active");
      opts[n].scrollIntoView({ block: "nearest" });
      input.setAttribute("aria-activedescendant", opts[n].id);
    } else {
      active = -1;
      input.removeAttribute("aria-activedescendant");
    }
  };

  let debounce: ReturnType<typeof setTimeout> | undefined;
  input.addEventListener("input", () => {
    const q = input.value.trim();
    clearTimeout(debounce);
    if (!q) {
      close();
      return;
    }
    debounce = setTimeout(() => {
      void load().then(() => {
        // Guard against a stale render if the box was cleared meanwhile.
        if (input.value.trim()) render(input.value.trim());
      });
    }, 120);
  });

  input.addEventListener("focus", () => {
    void load();
    if (input.value.trim() && panel.innerHTML) {
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }
  });

  input.addEventListener("keydown", (e) => {
    const opts = options();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (panel.hidden && input.value.trim()) {
        void load().then(() => render(input.value.trim()));
        return;
      }
      setActive(Math.min(active + 1, opts.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(active <= 0 ? -1 : active - 1);
    } else if (e.key === "Enter") {
      if (!panel.hidden && active >= 0 && opts[active]) {
        e.preventDefault();
        window.location.assign((opts[active] as HTMLAnchorElement).href);
      }
      // Otherwise the form submits natively to /search?q=…
    } else if (e.key === "Escape") {
      if (!panel.hidden) {
        e.preventDefault();
        close();
      }
    }
  });

  // A click anywhere in the pill (icon/padding) focuses the input.
  form.addEventListener("click", (e) => {
    if (e.target === form || (e.target as Element).classList?.contains("ico"))
      input.focus();
  });

  // Close on outside click.
  document.addEventListener("click", (e) => {
    if (!form.contains(e.target as Node)) close();
  });

  // Don't submit an empty query.
  form.addEventListener("submit", (e) => {
    if (!input.value.trim()) e.preventDefault();
  });
};

document
  .querySelectorAll<HTMLFormElement>("form[data-typeahead]")
  .forEach((form, i) => attach(form, form.id ? "hs-" + form.id : "hs-" + i));
