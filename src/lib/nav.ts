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
    key: "saints",
    label: "The Saints",
    children: [
      { key: "search", label: "Browse & Search", href: withBase("search") },
      { key: "quiz", label: "Patron Saint Quiz", href: withBase("quiz") },
      { key: "america", label: "Saints in America", href: withBase("america") },
      { key: "news", label: "Saints in the News", href: withBase("news") },
    ],
  },
  {
    key: "hosts",
    label: "Heavenly Hosts",
    children: [
      {
        key: "nine-orders",
        label: "The Nine Orders",
        href: withBase("nine-orders"),
      },
      {
        key: "archangels",
        label: "Archangels",
        href: withBase("host/HH-0008"),
      },
      {
        key: "guardian-angels",
        label: "Guardian Angels & Titled Figures",
        href: withBase("guardian-angels"),
      },
      {
        key: "biblical-encounters",
        label: "Biblical Encounters",
        href: withBase("biblical-encounters"),
      },
      {
        key: "extra-biblical-angels",
        label: "Extra-Biblical Angels",
        href: withBase("extra-biblical-angels"),
      },
    ],
  },
  {
    key: "feasts-fasts",
    label: "The Church Year",
    children: [
      { key: "calendar", label: "The Calendar", href: withBase("calendar") },
      { key: "feasts", label: "Feasts & Fasts", href: withBase("feasts") },
      {
        key: "moveable-calendar",
        label: "The Moveable Calendar",
        href: withBase("moveable-calendar"),
      },
    ],
  },
  {
    key: "little-church",
    label: "The Orthodox Home",
    children: [
      {
        key: "icons",
        label: "Icons in the Home",
        href: withBase("icons-home"),
      },
      {
        key: "liturgical-living",
        label: "Liturgical Living",
        href: withBase("liturgical-living"),
      },
    ],
  },
  {
    key: "about",
    label: "About",
    children: [
      { key: "our-story", label: "Our Story", href: withBase("about") },
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
    ],
  },
];

/** A top-level item is "active" when it IS the active key or contains it. */
export function isItemActive(item: NavItem, active: string): boolean {
  if (item.key === active) return true;
  return (item.children ?? []).some((c) => c.key === active);
}
