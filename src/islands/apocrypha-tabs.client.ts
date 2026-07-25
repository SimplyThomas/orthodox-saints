/* Tab switcher for the apocryphal work pages (/extra-biblical-angels/[slug]).
   Shows one panel at a time — the same one-panel-at-a-time pattern as the
   /feasts index. Progressive enhancement: with no JS every panel is visible
   (see the page's <noscript> style), so content is never hidden from crawlers
   or no-JS visitors. */
const root = document.getElementById("work-tabs-root");
if (root) {
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>(".work-tab"),
  );
  const panels = Array.from(root.querySelectorAll<HTMLElement>(".work-panel"));

  function activate(key: string, scroll = false): void {
    if (!panels.some((p) => p.dataset.panel === key)) return;
    panels.forEach((p) =>
      p.classList.toggle("is-hidden", p.dataset.panel !== key),
    );
    tabs.forEach((t) =>
      t.setAttribute("aria-selected", t.dataset.tab === key ? "true" : "false"),
    );
    // Reflect the open tab in the URL so it is shareable / back-navigable.
    if (window.history.replaceState) {
      window.history.replaceState(null, "", `#${key}`);
    }
    if (scroll) {
      root
        ?.querySelector(".work-tabs")
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  tabs.forEach((t) =>
    t.addEventListener("click", () => activate(t.dataset.tab || "book", true)),
  );

  // Deep-link: open the tab named in the URL hash on load (e.g. #watchers).
  const initial = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (initial) activate(initial);
}
