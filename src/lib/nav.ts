import { withBase } from "./format";

/* ------------------------------------------------------------------
   Single source of truth for the site's primary navigation.

   The header (and, where relevant, other nav surfaces) render from this
   one structure, so adding a page is a one-line edit here — no touching
   the component markup. Each top-level entry is EITHER a direct link
   (`href`, no children — e.g. Home) OR a dropdown group (`children`).

   `key` is the identifier a page passes as `active` to highlight itself.
   Group keys and leaf keys are kept distinct so a page can light up both
   its dropdown parent and its own item. All hrefs go through withBase()
   (§11: Astro does not auto-prefix the base path onto hand-written hrefs).
   ------------------------------------------------------------------ */

export interface NavLink {
  key: string;
  label: string;
  href: string;
  /* Other page keys this item should light up for. A hub owns a family of
     pages — Heavenly Hosts owns six, Collections owns Saints of America — and
     without this a reader deep in that family sees nothing highlighted and
     loses their place. Listing the keys here beats editing every page to
     pretend it is the hub. */
  alsoActive?: string[];
}

export interface NavItem {
  key: string;
  label: string;
  /** Direct-link items (no dropdown) set this instead of `children`. */
  href?: string;
  /** Dropdown groups set this instead of `href`. */
  children?: NavLink[];
}

export const NAV: NavItem[] = [
  { key: "home", label: "Home", href: withBase("") },
  {
    key: "explore",
    label: "Explore",
    children: [
      { key: "search", label: "Browse Saints", href: withBase("search") },
      { key: "quiz", label: "Patron Saint Quiz", href: withBase("quiz") },
      {
        key: "collections",
        label: "Collections",
        href: withBase("collections"),
        // The hub owns every curated collection; Saints of America is the
        // first, and more are named as in preparation on the page itself.
        alsoActive: ["america"],
      },
      {
        key: "heavenly-hosts",
        label: "Heavenly Hosts",
        href: withBase("heavenly-hosts"),
        // The hub owns the host areas, which used to sit in the nav themselves
        // — The Fallen among them (#404). Their own `active` keys are untouched.
        alsoActive: [
          "hosts",
          "nine-orders",
          "archangels",
          "guardian-angels",
          "biblical-encounters",
          "extra-biblical-angels",
          "fallen-angels",
        ],
      },
    ],
  },
  {
    key: "church-year",
    label: "Church Year",
    children: [
      { key: "calendar", label: "The Calendar", href: withBase("calendar") },
      { key: "feasts", label: "Feasts & Fasts", href: withBase("feasts") },
      {
        key: "moveable-calendar",
        label: "The Movable Calendar",
        href: withBase("moveable-calendar"),
      },
    ],
  },
  {
    key: "orthodox-living",
    label: "Orthodox Living",
    children: [
      {
        key: "icons",
        label: "Icons in the Home",
        href: withBase("icons-home"),
      },
      {
        key: "icon-gifts",
        label: "Giving Icons",
        href: withBase("icon-gifts"),
      },
      {
        key: "liturgical-living",
        label: "Liturgical Living",
        href: withBase("liturgical-living"),
      },
      {
        key: "parish-resources",
        label: "Parish Resources",
        href: withBase("parish-resources"),
      },
    ],
  },
  {
    key: "daily-dove",
    label: "The Daily Dove",
    href: withBase("daily-dove"),
  },
  {
    key: "about",
    label: "About",
    children: [
      // The hub leads the group: /about is now a landing page rather than the
      // Our Story article, which moved to /our-story. Keeping About as a
      // dropdown also keeps its footer column, which mirrors these children.
      {
        key: "about-hub",
        label: "About the Project",
        href: withBase("about"),
      },
      { key: "our-story", label: "Our Story", href: withBase("our-story") },
      { key: "mission", label: "Our Mission", href: withBase("mission") },
      {
        key: "editorial-standards",
        label: "Editorial Standards",
        href: withBase("editorial-standards"),
      },
      {
        key: "contributors",
        label: "Contributors",
        href: withBase("contributors"),
      },
      {
        key: "sources",
        label: "Sources & Methodology",
        href: withBase("sources"),
      },
      { key: "contact", label: "Contact", href: withBase("contact") },
      {
        key: "corrections",
        label: "Report a Correction",
        href: withBase("corrections"),
      },
      { key: "contribute", label: "Contribute", href: withBase("contribute") },
      { key: "privacy", label: "Privacy", href: withBase("privacy") },
    ],
  },
];

/* True when `active` names this item or anything the item owns — its own key,
   a child's key, or a key a child claims via `alsoActive`. */
export function isItemActive(item: NavItem, active: string): boolean {
  if (item.key === active) return true;
  return (item.children ?? []).some((c) => isLinkActive(c, active));
}

/** True when `active` names this link or one of the pages it owns. */
export function isLinkActive(link: NavLink, active: string): boolean {
  return link.key === active || !!link.alsoActive?.includes(active);
}
