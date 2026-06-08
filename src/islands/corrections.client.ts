/* Corrections island: chip selection + validation, then build a pre-filled
   GitHub "new issue" URL and open it in a new tab. No backend or secrets — the
   visitor reviews the issue and presses "Submit new issue". Mirrors the Claude
   Design "Corrections" mock. */

const REPO = "SimplyThomas/orthodox-saints";

const form = document.getElementById("cr-form") as HTMLFormElement | null;
if (form) {
  const chips = [
    ...document
      .getElementById("cr-types")!
      .querySelectorAll<HTMLButtonElement>(".chip"),
  ];
  const thanks = document.getElementById("cr-thanks")!;
  const alt = document.getElementById("cr-alt")!;
  const again = document.getElementById("cr-again")!;
  const reopen = document.getElementById("cr-reopen") as HTMLAnchorElement;

  const get = (id: string) =>
    document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
  const subject = get("cr-subject");
  const desc = get("cr-desc");
  const suggest = get("cr-suggest");
  const source = get("cr-source");
  const name = get("cr-name");

  let typeId = chips[0]?.dataset.type ?? "feast";
  let typeLabel = chips[0]?.dataset.label ?? "Correction";
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("on"));
      chip.classList.add("on");
      typeId = chip.dataset.type ?? typeId;
      typeLabel = chip.dataset.label ?? typeLabel;
    });
  }

  const showErr = (id: string, on: boolean) => {
    const el = form.querySelector<HTMLElement>(`.err[data-for="${id}"]`);
    if (el) el.hidden = !on;
  };

  const buildIssueUrl = () => {
    const subj = subject.value.trim() || "a page";
    const title = `[Correction] ${typeLabel} — ${subj}`.slice(0, 120);
    const lines = [
      `**Saint / page:** ${subject.value.trim() || "—"}`,
      `**Type of correction:** ${typeLabel}`,
      "",
      "**What needs fixing**",
      desc.value.trim() || "—",
    ];
    if (suggest.value.trim())
      lines.push("", "**Suggested correction**", suggest.value.trim());
    if (source.value.trim())
      lines.push("", "**Source / citation**", source.value.trim());
    lines.push(
      "",
      "---",
      `_Submitted via the Corrections form${
        name.value.trim() ? ` by ${name.value.trim()}` : ""
      }._`,
    );
    const params = new URLSearchParams({
      title,
      body: lines.join("\n"),
      labels: "correction",
    });
    return `https://github.com/${REPO}/issues/new?${params.toString()}`;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const okSubject = !!subject.value.trim();
    const okDesc = !!desc.value.trim();
    showErr("cr-subject", !okSubject);
    showErr("cr-desc", !okDesc);
    if (!okSubject || !okDesc) return;

    const url = buildIssueUrl();
    window.open(url, "_blank", "noopener");
    reopen.href = url;
    form.hidden = true;
    alt.hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  again.addEventListener("click", () => {
    form.reset();
    chips.forEach((c, i) => c.classList.toggle("on", i === 0));
    typeId = chips[0]?.dataset.type ?? "feast";
    typeLabel = chips[0]?.dataset.label ?? "Correction";
    showErr("cr-subject", false);
    showErr("cr-desc", false);
    thanks.hidden = true;
    alt.hidden = false;
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  void typeId;
}
