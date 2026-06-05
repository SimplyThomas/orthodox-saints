// Flat ESLint config: TypeScript + Astro. Lints src/ (the new frontend).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import globals from "globals";

export default [
  {
    ignores: ["_site/", "dist/", "public/", "node_modules/", ".astro/", "web/"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.{ts,astro}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      // Islands intentionally read inlined JSON and touch the DOM; keep these pragmatic.
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // Node-context config files.
    files: ["*.config.{js,mjs,ts}", "playwright.config.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
];
