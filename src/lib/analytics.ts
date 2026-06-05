/* Thin, type-safe wrapper around the Plausible custom-events API.

   The Plausible script (loaded production-only from BaseLayout.astro) exposes a
   global `plausible(event, { props })`. This wrapper is a no-op when that global
   is absent — i.e. on the dev server, in tests, or before the deferred script
   loads — so call sites never need to guard. No network, no dependency. */

type Props = Record<string, string>;

interface PlausibleFn {
  (event: string, options?: { props?: Props }): void;
}

export function track(event: string, props?: Props): void {
  if (typeof window === "undefined") return;
  const plausible = (window as unknown as { plausible?: PlausibleFn })
    .plausible;
  if (typeof plausible !== "function") return;
  plausible(event, props ? { props } : undefined);
}
