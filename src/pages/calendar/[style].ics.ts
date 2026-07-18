import type { APIRoute, GetStaticPaths } from "astro";
import { SAINTS } from "../../lib/data";
import { FEASTS, PASCHA } from "../../lib/feasts";
import {
  feastEvents,
  saintDayEvents,
  type CalendarStyle,
} from "../../lib/calendar-feed";
import { buildCalendar } from "../../lib/ical";

export const prerender = true;

// Movable feasts resolve only inside the Pascha table window.
const YEARS = Array.from({ length: 2040 - 2020 + 1 }, (_, i) => 2020 + i);

export const getStaticPaths = (() => [
  { params: { style: "new" } },
  { params: { style: "old" } },
]) satisfies GetStaticPaths;

export const GET: APIRoute = (context) => {
  const style = context.params.style as CalendarStyle;
  const siteBase = context.site!.href; // e.g. https://orthodoxsaintfinder.com/
  const name =
    style === "old"
      ? "Orthodox Saints & Feasts (Old Calendar)"
      : "Orthodox Saints & Feasts (New Calendar)";
  const events = [
    ...feastEvents(FEASTS, style, PASCHA, YEARS),
    ...saintDayEvents(
      SAINTS.map((s) => ({ id: s.id, name: s.name, feast: s.feast ?? "" })),
      style,
      siteBase,
    ),
  ];
  const body = buildCalendar({ name, events });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="orthodox-calendar-${style}.ics"`,
    },
  });
};
