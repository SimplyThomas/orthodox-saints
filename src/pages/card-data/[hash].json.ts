import type { APIRoute, GetStaticPaths } from "astro";
import { cardPayload } from "../../lib/card-payload";

export const prerender = true;

/* The static card dataset for the home landing page, emitted once per build
   at a content-hashed path (/card-data/<hash>.json) and fetched after first
   paint by the cloud-band island. See lib/card-payload for why. */

export const getStaticPaths: GetStaticPaths = () => {
  return [{ params: { hash: cardPayload().hash } }];
};

export const GET: APIRoute = () => {
  return new Response(cardPayload().json, {
    headers: { "content-type": "application/json" },
  });
};
