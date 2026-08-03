import type { APIRoute, GetStaticPaths } from "astro";
import { lectionaryShard, lectionaryYears } from "../../lib/lectionary-data";

export const prerender = true;

/* One static shard per harvested year (/lectionary-data/<year>.json), fetched
   on demand by the /calendar island when the reader lands on a month in that
   year. Sharding keeps the calendar page's inline payload untouched: a year is
   ~30 KB of citations, and shipping two decades of them to every visitor to
   serve the one month they are looking at would be absurd. */

export const getStaticPaths: GetStaticPaths = () =>
  lectionaryYears().map((year) => ({ params: { year: String(year) } }));

export const GET: APIRoute = ({ params }) => {
  const year = Number(params.year);
  const shard = lectionaryShard(year);
  if (!shard) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(shard), {
    headers: { "content-type": "application/json" },
  });
};
