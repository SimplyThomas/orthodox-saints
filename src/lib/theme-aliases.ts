/** Aliases now live in themes.py and arrive via public/themes.json — one
 *  source of theme knowledge. Order matters: first matching fragment wins. */
import { THEME_ALIASES } from "./themes";

export { THEME_ALIASES };

export function matchThemeAlias(query: string): string | null {
  const q = query.toLowerCase();
  for (const a of THEME_ALIASES) if (q.includes(a.phrase)) return a.slug;
  return null;
}
