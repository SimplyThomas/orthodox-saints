/* Thin, type-safe wrapper around the Umami custom-events API.

   The Umami script (loaded production-only from BaseLayout.astro, and only once a
   website id is configured) exposes a global `umami.track(event, data)`. This
   wrapper is a no-op when that global is absent — i.e. on the dev server, in
   tests, or before the deferred script loads — so call sites never need to
   guard. No network, no dependency. */

type Props = Record<string, string>;

interface UmamiApi {
  track: (event: string, data?: Props) => void;
}

export function track(event: string, props?: Props): void {
  if (typeof window === "undefined") return;
  const umami = (window as unknown as { umami?: UmamiApi }).umami;
  if (!umami || typeof umami.track !== "function") return;
  umami.track(event, props);
}
