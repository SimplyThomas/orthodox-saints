/* Saints-of-America carousels: scroll-snap tracks with gold prev/next arrows
   that fade in/out at the edges. Pure progressive enhancement — without JS the
   tracks still scroll natively (trackpad / touch). */

for (const carousel of document.querySelectorAll<HTMLElement>(".am-carousel")) {
  const track = carousel.querySelector<HTMLElement>(".am-track");
  const prev = carousel.querySelector<HTMLButtonElement>(".am-arrow.prev");
  const next = carousel.querySelector<HTMLButtonElement>(".am-arrow.next");
  if (!track || !prev || !next) continue;

  const update = () => {
    prev.classList.toggle("show", track.scrollLeft > 6);
    next.classList.toggle(
      "show",
      track.scrollLeft + track.clientWidth < track.scrollWidth - 6,
    );
  };
  // Advance by a full page: how many whole cards are visible (3 on desktop,
  // 2 on tablet, 1 on phone — derived from the live card width + gap), so each
  // arrow press reveals that many brand-new saints and lands on a card edge.
  const pageScroll = (dir: number) => {
    const card = track.querySelector<HTMLElement>(".am-card");
    const gap = parseFloat(getComputedStyle(track).columnGap) || 20;
    const cardW = card ? card.getBoundingClientRect().width : track.clientWidth;
    const stride = cardW + gap;
    const perView = Math.max(1, Math.round(track.clientWidth / stride));
    track.scrollBy({ left: dir * perView * stride, behavior: "smooth" });
  };

  prev.addEventListener("click", () => pageScroll(-1));
  next.addEventListener("click", () => pageScroll(1));
  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}
