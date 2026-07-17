/* "Giving Icons as Gifts" interactivity (progressive enhancement).

   The only thing that needs JS is the "Who are you buying for?" picker. The
   page renders EVERY recipient panel visible, so with JS off the section stays
   a complete, readable list — this island's first act is to collapse it down to
   one. The occasion cards use native <details> and need no JS at all. */

const page = document.querySelector<HTMLElement>(".igp");
if (page) {
  const who = page.querySelector<HTMLElement>("[data-who]");
  if (who) {
    const tabs = Array.from(
      who.querySelectorAll<HTMLButtonElement>("[data-who-tab]"),
    );
    const panels = Array.from(
      who.querySelectorAll<HTMLElement>("[data-who-panel]"),
    );

    const select = (id: string) => {
      for (const t of tabs) {
        t.setAttribute(
          "aria-expanded",
          t.dataset.whoTab === id ? "true" : "false",
        );
      }
      for (const p of panels) p.hidden = p.dataset.whoPanel !== id;
    };

    for (const tab of tabs) {
      tab.addEventListener("click", () => select(tab.dataset.whoTab!));
    }

    // Collapse to the first recipient now that the picker works.
    if (tabs.length) select(tabs[0].dataset.whoTab!);
  }
}
