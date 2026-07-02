import type { APIRoute, GetStaticPaths } from "astro";
import { finderPayload } from "../../lib/finder-payload";

export const prerender = true;

/* The static finder dataset, emitted once per build at a content-hashed path
   (/finder-data/<hash>.json) and fetched lazily by the /search and /quiz
   islands via lib/finder-data.client. See lib/finder-payload for why. */

export const getStaticPaths: GetStaticPaths = async () => {
  const { hash } = await finderPayload();
  return [{ params: { hash } }];
};

export const GET: APIRoute = async () => {
  const { json } = await finderPayload();
  return new Response(json, {
    headers: { "content-type": "application/json" },
  });
};
