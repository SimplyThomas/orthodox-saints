import type { APIRoute } from "astro";
import { FINDER_SAINTS } from "../lib/data";
import { primaryRank, centuryLabel } from "../lib/saints";
import { NAV } from "../lib/nav";

export const prerender = true;

/* Lightweight, whole-site index for the header quick-search typeahead.
   Emitted as a static /search-index.json and fetched lazily on first use, so
   it never weighs on page loads the way the full ~3.5 MB finder index would.
   Each saint keeps only what a compact result row needs plus a lowercased
   name/aka/variant haystack for substring matching. */

interface IndexSaint {
  id: string;
  name: string;
  meta: string;
  hay: string;
}
interface IndexPage {
  title: string;
  href: string;
  section?: string;
}

export const GET: APIRoute = () => {
  const saints: IndexSaint[] = FINDER_SAINTS.map((s) => {
    const hay = [s.name, ...(s.aka ?? []), ...(s.variants ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const meta = [primaryRank(s), centuryLabel(s)].filter(Boolean).join(" · ");
    return { id: s.id, name: s.name, meta, hay };
  });

  // Section pages come straight from the single nav config (top-level direct
  // links + every dropdown leaf), so new pages become searchable for free.
  const pages: IndexPage[] = [];
  for (const item of NAV) {
    if (item.href !== undefined)
      pages.push({ title: item.label, href: item.href });
    for (const c of item.children ?? [])
      pages.push({ title: c.label, href: c.href, section: item.label });
  }

  return new Response(JSON.stringify({ saints, pages }), {
    headers: { "content-type": "application/json" },
  });
};
