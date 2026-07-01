/* Header quick-search: a whole-site typeahead.

   Lazily fetches the lightweight /search-index.json on first use, then filters
   saints (AND-of-tokens substring over a name/aka/variant haystack) and section
   pages, rendering a dropdown of jump-to results. Enter with no highlighted
   result submits the form natively to /search?q=… (the full faceted finder), so
   the box degrades gracefully without JS. */

import { withBase } from "../lib/format";

interface IndexSaint {
  id: string;
  name: string;
  meta: string;
  hay: string;
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

const form = document.querySelector<HTMLFormElement>(".header-search");
const input = form?.querySelector<HTMLInputElement>(".hs-input");
const panel = form?.querySelector<HTMLElement>(".hs-panel");

if (form && input && panel) {
  const MAX_SAINTS = 7;
  const MAX_PAGES = 4;

  let index: SearchIndex | null = null;
  let loading: Promise<void> | null = null;
  let active = -1;

  const load = (): Promise<void> => {
    if (index) return Promise.resolve();
    if (loading) return loading;
    loading = fetch(withBase("search-index.json"))
      .then((r) => r.json())
      .then((data: SearchIndex) => {
        index = data;
      })
      .catch(() => {
        index = { saints: [], pages: [] };
      });
    return loading;
  };

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

  const scoreSaint = (s: IndexSaint, tokens: string[], q: string): number => {
    const nl = s.name.toLowerCase();
    if (nl === q) return 100;
    if (nl.startsWith(tokens[0])) return 60;
    if (nl.includes(tokens[0])) return 40;
    return 10;
  };

  const render = (q: string): void => {
    if (!index || !q) {
      close();
      return;
    }
    const ql = q.toLowerCase();
    const tokens = ql.split(/\s+/).filter(Boolean);

    const saints = index.saints
      .filter((s) => tokens.every((t) => s.hay.includes(t)))
      .map((s) => ({ s, score: scoreSaint(s, tokens, ql) }))
      .sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name))
      .slice(0, MAX_SAINTS)
      .map((x) => x.s);

    const pages = index.pages
      .filter((p) => p.title.toLowerCase().includes(ql))
      .slice(0, MAX_PAGES);

    let html = "";
    let i = 0;
    const opt = (href: string, body: string, extra = ""): string =>
      `<a role="option" id="hs-opt-${i++}" class="hs-opt${extra}" href="${href}" tabindex="-1">${body}</a>`;

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
}
