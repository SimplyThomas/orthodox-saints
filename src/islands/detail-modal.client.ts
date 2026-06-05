/* Quick-look modal (progressive enhancement). Saint cards are real links to the
   static /saint/[id] page; this intercepts those clicks and shows the detail in
   an overlay instead. The detail markup is NOT duplicated — we fetch the static
   page and extract its already-rendered `.detail-card`. ?s=ID deep-links and
   popstate are supported. Without JS, the links navigate normally. */

import { withBase } from "../lib/format";
import { track } from "../lib/analytics";

const panel = document.getElementById("detail");
if (panel) {
  const cache = new Map<string, string>();

  async function cardHtml(id: string): Promise<string | null> {
    if (cache.has(id)) return cache.get(id)!;
    try {
      const res = await fetch(withBase(`saint/${id}/`), { cache: "no-cache" });
      if (!res.ok) return null;
      const doc = new DOMParser().parseFromString(
        await res.text(),
        "text/html",
      );
      const card = doc.getElementById("saint-detail");
      if (!card) return null;
      cache.set(id, card.outerHTML);
      return card.outerHTML;
    } catch {
      return null;
    }
  }

  async function open(id: string, push: boolean) {
    const html = await cardHtml(id);
    if (!html) {
      // Fetch failed — fall back to a real navigation.
      location.href = withBase(`saint/${id}/`);
      return;
    }
    panel!.innerHTML = html;
    const card = panel!.querySelector(".detail-card");
    if (card) {
      track("Saint Viewed", {
        saint_id: id,
        name: (card as HTMLElement).dataset.name || id,
      });
      const close = document.createElement("button");
      close.type = "button";
      close.className = "close link-btn";
      close.setAttribute("aria-label", "Close");
      close.innerHTML = "&times;";
      close.addEventListener("click", () => closeModal(true));
      card.insertBefore(close, card.firstChild);
    }
    panel!.hidden = false;
    document.body.style.overflow = "hidden";
    (panel!.querySelector(".close") as HTMLButtonElement | null)?.focus();

    if (push) {
      const url = new URL(window.location.href);
      url.searchParams.set("s", id);
      history.pushState({ id }, "", url);
    }
  }

  function closeModal(push: boolean) {
    panel!.hidden = true;
    panel!.innerHTML = "";
    document.body.style.overflow = "";
    if (push) {
      const url = new URL(window.location.href);
      url.searchParams.delete("s");
      history.pushState({}, "", url);
    }
  }

  function routeFromURL() {
    const id = new URL(window.location.href).searchParams.get("s");
    if (id) open(id, false);
    else closeModal(false);
  }

  // Intercept clicks on any saint card/link (delegated).
  document.addEventListener("click", (e) => {
    const link = (e.target as Element).closest<HTMLElement>("a[data-saint]");
    if (!link) return;
    // Honor modifier-clicks / new-tab intentions — let the browser navigate.
    const me = e as MouseEvent;
    if (me.metaKey || me.ctrlKey || me.shiftKey || me.altKey || me.button !== 0)
      return;
    e.preventDefault();
    open(link.dataset.saint!, true);
  });

  document.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Escape" && !panel!.hidden)
      closeModal(true);
  });
  panel.addEventListener("click", (e) => {
    if ((e.target as Element).id === "detail") closeModal(true);
  });
  window.addEventListener("popstate", routeFromURL);

  routeFromURL();
}
