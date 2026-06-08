/* Contribute island: chip selection + validation, then build a pre-filled
   mailto: and open the visitor's mail app. No backend or secrets — the mail
   client does the sending. Mirrors the Claude Design "Contribute" mock. */

const CONTACT = "shelby.e.krug@gmail.com";

const form = document.getElementById("cb-form") as HTMLFormElement | null;
if (form) {
  const typeWrap = document.getElementById("cb-types")!;
  const chips = [...typeWrap.querySelectorAll<HTMLButtonElement>(".chip")];
  const thanks = document.getElementById("cb-thanks")!;
  const again = document.getElementById("cb-again")!;

  const get = (id: string) =>
    document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
  const name = get("cb-name");
  const email = get("cb-email");
  const message = get("cb-message");
  const link = get("cb-link");

  // single-select chips
  let typeId = chips[0]?.dataset.type ?? "research";
  let typeLabel = chips[0]?.dataset.label ?? "a contribution";
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

  const emailOk = (v: string) => /.+@.+\..+/.test(v.trim());

  const buildMailto = () => {
    const subject = `[Contribution] ${typeLabel}${
      name.value.trim() ? ` — from ${name.value.trim()}` : ""
    }`;
    const body = [
      `Name: ${name.value.trim() || "—"}`,
      `Email: ${email.value.trim() || "—"}`,
      `I'd like to share: ${typeLabel}`,
      "",
      "Details:",
      message.value.trim() || "—",
      "",
      `Link to materials: ${link.value.trim() || "— (none)"}`,
      "",
      "— Sent from the Contribute page on Cloud of Witnesses",
    ].join("\n");
    return `mailto:${CONTACT}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const okName = !!name.value.trim();
    const okEmail = emailOk(email.value);
    const okMsg = !!message.value.trim();
    showErr("cb-name", !okName);
    showErr("cb-email", !okEmail);
    showErr("cb-message", !okMsg);
    if (!okName || !okEmail || !okMsg) return;

    // Open the mail client, then reveal the confirmation panel.
    window.location.href = buildMailto();
    form.hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  again.addEventListener("click", () => {
    form.reset();
    chips.forEach((c, i) => c.classList.toggle("on", i === 0));
    typeId = chips[0]?.dataset.type ?? "research";
    typeLabel = chips[0]?.dataset.label ?? "a contribution";
    ["cb-name", "cb-email", "cb-message"].forEach((id) => showErr(id, false));
    thanks.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // `typeId` is captured for parity with the mock; the email is built from the
  // human label. Reference it so the bundler/linter sees it as used.
  void typeId;
}
