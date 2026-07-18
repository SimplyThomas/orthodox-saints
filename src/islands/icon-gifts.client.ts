/* "Giving Icons as Gifts" interactivity (progressive enhancement).

   The only thing that needs JS is the "Finding the right icon" refine menu — a
   dropdown control above one card. The page renders EVERY card visible, so with
   JS off the section stays a complete, readable list; this island's first act is
   to collapse it to the pre-selected card (baptism) and wire the menu:
     • the button toggles the grouped options open/closed;
     • choosing an option swaps the visible card and updates the button label;
     • an outside click or Escape closes the menu. */

const page = document.querySelector<HTMLElement>(".igp");
const who = page?.querySelector<HTMLElement>("[data-who]");
const refine = who?.querySelector<HTMLElement>("[data-refine]");
const btn = refine?.querySelector<HTMLButtonElement>("[data-refine-btn]");
const menu = refine?.querySelector<HTMLElement>("[data-refine-menu]");
const current = refine?.querySelector<HTMLElement>("[data-refine-current]");

if (who && refine && btn && menu && current) {
  const opts = Array.from(
    menu.querySelectorAll<HTMLButtonElement>("[data-refine-opt]"),
  );
  const panels = Array.from(
    who.querySelectorAll<HTMLElement>("[data-who-panel]"),
  );

  const openMenu = () => {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  };
  const closeMenu = () => {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  };

  const select = (id: string) => {
    const opt = opts.find((o) => o.dataset.refineOpt === id) ?? opts[0];
    const chosen = opt.dataset.refineOpt;
    for (const o of opts) {
      o.setAttribute("aria-checked", o === opt ? "true" : "false");
    }
    for (const p of panels) p.hidden = p.dataset.whoPanel !== chosen;
    current.textContent = (opt.textContent ?? "").trim();
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  for (const opt of opts) {
    opt.addEventListener("click", () => {
      select(opt.dataset.refineOpt!);
      closeMenu();
      btn.focus();
    });
  }

  document.addEventListener("click", (e) => {
    if (!menu.hidden && !refine.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      closeMenu();
      btn.focus();
    }
  });

  // Collapse to the markup's pre-checked option (baptism), or the first, now
  // that the menu works.
  const initial =
    opts.find((o) => o.getAttribute("aria-checked") === "true") ?? opts[0];
  select(initial.dataset.refineOpt!);
  closeMenu();
}
