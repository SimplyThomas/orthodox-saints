/* "Giving Icons as Gifts" interactivity (progressive enhancement).

   The only thing that needs JS is the "Finding the right icon" picker — one
   chip-and-panel widget whose chips span two groups (by occasion, for a
   person). The page renders EVERY panel visible, so with JS off the section
   stays a complete, readable list; this island's first act is to collapse it
   to the one whose chip was pre-selected in the markup. */

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

    // Collapse to the markup's pre-selected chip (aria-expanded="true"), or the
    // first chip if none was marked, now that the picker works.
    const initial =
      tabs.find((t) => t.getAttribute("aria-expanded") === "true") ?? tabs[0];
    if (initial) select(initial.dataset.whoTab!);
  }
}
