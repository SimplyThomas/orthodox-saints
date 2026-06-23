/* "Icons in the Home" interactivity (progressive enhancement).
   The page renders every room card up-front (hidden); this island wires the
   interactive house, the card swap, the FAQ accordion, and the two
   room-conditional sections (subject cards for Homeschool, traditions for the
   Icon Corner). Without JS the page is still a readable guide — the empty-state
   prompt and the open first FAQ answer remain visible. */

const page = document.querySelector<HTMLElement>(".ihp");
if (page) {
  const rooms = Array.from(
    page.querySelectorAll<SVGGElement>(".ih-room[data-room]"),
  );
  const cards = Array.from(
    page.querySelectorAll<HTMLElement>(".ih-card-shell[data-card]"),
  );
  const empty = page.querySelector<HTMLElement>(".ih-empty");
  const roomOnly = Array.from(
    page.querySelectorAll<HTMLElement>("[data-room-only]"),
  );

  const select = (id: string) => {
    for (const r of rooms) r.classList.toggle("sel", r.dataset.room === id);
    for (const c of cards) c.hidden = c.dataset.card !== id;
    if (empty) empty.hidden = true;
    for (const s of roomOnly) s.hidden = s.dataset.roomOnly !== id;
  };

  const close = () => {
    for (const r of rooms) r.classList.remove("sel");
    for (const c of cards) c.hidden = true;
    for (const s of roomOnly) s.hidden = true;
    if (empty) empty.hidden = false;
  };

  for (const room of rooms) {
    const id = room.dataset.room!;
    // SVG <g> isn't focusable by default — make each room a real button.
    room.setAttribute("role", "button");
    room.setAttribute("tabindex", "0");
    room.setAttribute("aria-label", id.replace(/-/g, " "));
    room.addEventListener("click", () => select(id));
    room.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(id);
      }
    });
  }

  // Close buttons live inside each pre-rendered card.
  for (const x of page.querySelectorAll<HTMLButtonElement>(".ih-card-x")) {
    x.addEventListener("click", close);
  }

  // FAQ accordion — single-open; clicking the open row collapses it.
  const faqItems = Array.from(
    page.querySelectorAll<HTMLElement>(".ih-faq-item"),
  );
  for (const item of faqItems) {
    const btn = item.querySelector<HTMLButtonElement>(".ih-faq-q");
    const ans = item.querySelector<HTMLElement>(".ih-faq-a");
    if (!btn || !ans) continue;
    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      for (const other of faqItems) {
        const ob = other.querySelector<HTMLButtonElement>(".ih-faq-q");
        const oa = other.querySelector<HTMLElement>(".ih-faq-a");
        if (ob) ob.setAttribute("aria-expanded", "false");
        if (oa) oa.hidden = true;
      }
      if (!isOpen) {
        btn.setAttribute("aria-expanded", "true");
        ans.hidden = false;
      }
    });
  }
}
