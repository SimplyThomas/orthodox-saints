/* Corrections island. Validates the form, then POSTs JSON to the report Worker
   (see workers/report/), which verifies a Turnstile token and files a GitHub
   issue labelled `data-quality`. The visitor needs no GitHub account. Inline
   success/error states; no page reload. Subject is prefilled from a ?subject=
   (or ?saint=) query param, or from the referring saint page. */

// Minimal shape of the Cloudflare Turnstile global we rely on.
interface Turnstile {
  reset: (widget?: string) => void;
  getResponse: (widget?: string) => string | undefined;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const form = document.getElementById("cr-form") as HTMLFormElement | null;
if (form) {
  const endpoint = form.dataset.endpoint || "/api/report";

  const chips = [
    ...document
      .getElementById("cr-types")!
      .querySelectorAll<HTMLButtonElement>(".chip"),
  ];
  const thanks = document.getElementById("cr-thanks")!;
  const alt = document.getElementById("cr-alt")!;
  const again = document.getElementById("cr-again")!;
  const submitBtn = document.getElementById("cr-submit") as HTMLButtonElement;
  const sendLabel = form.querySelector<HTMLElement>(".cr-send-label")!;
  const formErr = document.getElementById("cr-formerr")!;
  const issueLink = document.getElementById(
    "cr-issue-link",
  ) as HTMLAnchorElement;

  const get = (id: string) =>
    document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
  const subject = get("cr-subject");
  const desc = get("cr-desc");
  const suggest = get("cr-suggest");
  const source = get("cr-source");
  const name = get("cr-name");
  const email = get("cr-email");
  const honeypot = form.querySelector<HTMLInputElement>(
    'input[name="website"]',
  );

  let typeId = chips[0]?.dataset.type ?? "feast";
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("on"));
      chip.classList.add("on");
      typeId = chip.dataset.type ?? typeId;
    });
  }

  // --- prefill the subject -------------------------------------------------
  const params = new URLSearchParams(location.search);
  const fromParam = params.get("subject") || params.get("saint") || "";
  if (fromParam) {
    subject.value = fromParam.slice(0, 200);
  } else if (document.referrer) {
    // Came from one of our own saint pages? Use that URL as the subject.
    try {
      const ref = new URL(document.referrer);
      if (
        ref.origin === location.origin &&
        ref.pathname.startsWith("/saint/")
      ) {
        subject.value = ref.href;
      }
    } catch {
      /* ignore malformed referrer */
    }
  }

  const showErr = (id: string, on: boolean) => {
    const el = form.querySelector<HTMLElement>(`.err[data-for="${id}"]`);
    if (el) el.hidden = !on;
  };

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const setSending = (on: boolean) => {
    submitBtn.disabled = on;
    sendLabel.textContent = on ? "Sending…" : "Send report";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formErr.hidden = true;

    const subjVal = subject.value.trim();
    const descVal = desc.value.trim();
    const emailVal = email.value.trim();

    const okSubject = !!subjVal;
    const okDesc = !!descVal;
    const okEmail = !emailVal || isEmail(emailVal);
    showErr("cr-subject", !okSubject);
    showErr("cr-desc", !okDesc);
    showErr("cr-email", !okEmail);

    // Turnstile token is injected as a hidden input inside the form once solved.
    const token =
      window.turnstile?.getResponse() ??
      form.querySelector<HTMLInputElement>(
        'input[name="cf-turnstile-response"]',
      )?.value ??
      "";
    const okToken = !!token;
    showErr("cr-turnstile", !okToken);

    if (!okSubject || !okDesc || !okEmail || !okToken) return;

    const payload = {
      type: typeId,
      subject: subjVal,
      description: descVal,
      suggestion: suggest.value.trim(),
      source: source.value.trim(),
      name: name.value.trim(),
      email: emailVal,
      website: honeypot?.value ?? "",
      "cf-turnstile-response": token,
    };

    setSending(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        number?: number;
      };

      if (res.ok && data.ok) {
        // Success — show the thanks panel.
        if (typeof data.number === "number") {
          issueLink.href = `https://github.com/SimplyThomas/orthodox-saints/issues/${data.number}`;
          issueLink.hidden = false;
        }
        form.hidden = true;
        alt.hidden = true;
        thanks.hidden = false;
        thanks.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // Server rejected it — show its friendly message and let them retry.
      formErr.textContent =
        data.error || "Something went wrong. Please try again.";
      formErr.hidden = false;
      window.turnstile?.reset();
    } catch {
      formErr.textContent =
        "We couldn’t reach the server. Please check your connection and try again.";
      formErr.hidden = false;
      window.turnstile?.reset();
    } finally {
      setSending(false);
    }
  });

  again.addEventListener("click", () => {
    form.reset();
    chips.forEach((c, i) => c.classList.toggle("on", i === 0));
    typeId = chips[0]?.dataset.type ?? "feast";
    showErr("cr-subject", false);
    showErr("cr-desc", false);
    showErr("cr-email", false);
    showErr("cr-turnstile", false);
    formErr.hidden = true;
    issueLink.hidden = true;
    window.turnstile?.reset();
    thanks.hidden = true;
    alt.hidden = false;
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
