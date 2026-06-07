/* Saints-of-America carousels: scroll-snap tracks with gold prev/next arrows
   that fade in/out at the edges. Pure progressive enhancement — without JS the
   tracks still scroll natively (trackpad / touch). */

for (const carousel of document.querySelectorAll<HTMLElement>(
  ".pga-carousel",
)) {
  const track = carousel.querySelector<HTMLElement>(".pga-track");
  const prev = carousel.querySelector<HTMLButtonElement>(".pga-arrow.prev");
  const next = carousel.querySelector<HTMLButtonElement>(".pga-arrow.next");
  if (!track || !prev || !next) continue;

  const update = () => {
    prev.classList.toggle("show", track.scrollLeft > 6);
    next.classList.toggle(
      "show",
      track.scrollLeft + track.clientWidth < track.scrollWidth - 6,
    );
  };
  const scroll = (dir: number) =>
    track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: "smooth" });

  prev.addEventListener("click", () => scroll(-1));
  next.addEventListener("click", () => scroll(1));
  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}
