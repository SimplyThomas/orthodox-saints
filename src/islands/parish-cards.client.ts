/* Parish Resources — QR-card gallery controls.
   Progressive enhancement over the SSR'd gallery (color, 3 per row):
   segmented color / per-row controls, per-card download links that follow
   the color mode, a staggered download-all, and a print-sheet button. */

type Mode = "color" | "bw";

const FILE_SUFFIX: Record<Mode, string> = {
  color: "Color",
  bw: "black-and-white",
};

const root = document.querySelector<HTMLElement>(".pc-gallery");

function cardFile(base: string, mode: Mode): string {
  const dir = root?.dataset.cardDir ?? "";
  return `${dir}QR-${base}-${FILE_SUFFIX[mode]}.png`;
}

function cardThumb(base: string, mode: Mode): string {
  const dir = root?.dataset.cardDir ?? "";
  return `${dir}thumbs/QR-${base}-${FILE_SUFFIX[mode]}.png`;
}

function downloadName(base: string, mode: Mode): string {
  return `CloudOfWitnesses-${base}-${mode}.png`;
}

if (root) {
  const grid = root.querySelector<HTMLElement>(".pc-grid");
  const cards = Array.from(root.querySelectorAll<HTMLElement>(".pc-card"));
  let mode: Mode = "color";

  const applyMode = (next: Mode) => {
    mode = next;
    for (const card of cards) {
      const base = card.dataset.base ?? "";
      const img = card.querySelector<HTMLImageElement>("img");
      const dl = card.querySelector<HTMLAnchorElement>("a.dl");
      if (img) img.src = cardThumb(base, mode);
      if (dl) {
        dl.href = cardFile(base, mode);
        dl.setAttribute("download", downloadName(base, mode));
        const label = dl.querySelector<HTMLElement>(".dl-label");
        if (label)
          label.textContent =
            mode === "color" ? "Download color" : "Download B&W";
      }
    }
  };

  const wireSegment = (group: HTMLElement, onPick: (value: string) => void) => {
    const buttons = Array.from(
      group.querySelectorAll<HTMLButtonElement>("button"),
    );
    for (const btn of buttons) {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => (b.dataset.on = String(b === btn)));
        onPick(btn.dataset.value ?? "");
      });
    }
  };

  const colorSeg = root.querySelector<HTMLElement>('[data-seg="color"]');
  if (colorSeg) wireSegment(colorSeg, (v) => applyMode(v as Mode));

  const colsSeg = root.querySelector<HTMLElement>('[data-seg="cols"]');
  if (colsSeg)
    wireSegment(colsSeg, (v) => {
      if (grid) grid.dataset.cols = v;
    });

  root
    .querySelector<HTMLButtonElement>("#pc-download-all")
    ?.addEventListener("click", () => {
      cards.forEach((card, i) => {
        const base = card.dataset.base ?? "";
        window.setTimeout(() => {
          const a = document.createElement("a");
          a.href = cardFile(base, mode);
          a.download = downloadName(base, mode);
          document.body.appendChild(a);
          a.click();
          a.remove();
        }, i * 450);
      });
    });

  root
    .querySelector<HTMLButtonElement>("#pc-print")
    ?.addEventListener("click", () => window.print());
}
