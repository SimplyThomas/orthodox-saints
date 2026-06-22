# Human-Verified Dove Badge

**Date:** 2026-06-21
**Status:** Approved

## Summary

Add a 🕊 dove icon to saint profile pages and browse rows to indicate that a profile has been manually reviewed by a human, as distinct from being AI-generated and auto-promoted to `reviewed` status. No text label — icon only, with a native `title` tooltip.

---

## Context

The profile pipeline (`tools/profilegen/`) generates `status: draft` YAML profiles automatically. Once confidence is high enough, profiles will be batch-promoted to `status: reviewed` (the production gate). However, `reviewed` will then mean two different things: "AI-generated and auto-approved" vs. "a human actually read this." The dove badge signals the latter.

---

## Data model

### Profile YAML (`src/content/profiles/OS-####.yaml`)

Add one optional boolean field:

```yaml
humanReviewed: true   # omit or false when not yet human-reviewed
```

Existing profiles need no change — absence is treated as `false`.

### Schema (`src/content.config.ts`)

Add to `profileSchema`:

```ts
humanReviewed: z.boolean().optional().default(false),
```

### Finder type (`src/lib/types.ts`)

Add to `FinderSaint`:

```ts
humanReviewed?: boolean;
```

---

## Rendering

### 1. Detail page — breadcrumb bar

**File:** `src/components/SaintView.astro`

The existing breadcrumb bar (`sv-back`) ends with:
```
☦ Cloud of Witnesses / Saints / {crumb} / {honorificName}
```

When `profile?.humanReviewed` is `true`, append a dove `<span>` after the saint's name:

```html
<span class="sv-verified-dove" title="Reviewed by a human" aria-label="Reviewed by a human">🕊</span>
```

Style: small, muted, inline with the crumb text. No separate element or badge pill — just the icon.

### 2. Browse page — portrait corner overlay

**Files:** `src/pages/search.astro`, `src/islands/finder.client.ts`, `src/styles/global.css`

#### `search.astro` — annotate finder data at build time

```ts
import { getCollection } from "astro:content";

const profiles = await getCollection("profiles");
const humanReviewedIds = new Set(
  profiles
    .filter(p => p.data.humanReviewed)
    .map(p => p.data.id)
);

const finderData = FINDER_SAINTS.map(s =>
  humanReviewedIds.has(s.id) ? { ...s, humanReviewed: true } : s
);
const finderJson = JSON.stringify(finderData).replace(/</g, "\\u003c");
```

#### `finder.client.ts` — render the overlay in `row()`

Inside the `.portrait` div, conditionally add:

```html
<span class="portrait-dove" title="Reviewed by a human" aria-label="Reviewed by a human">🕊</span>
```

Only rendered when `s.humanReviewed === true`.

#### `global.css` — portrait positioning

```css
.saint-row .portrait {
  position: relative;   /* already flex-shrink: 0; add relative */
}
.portrait-dove {
  position: absolute;
  bottom: -4px;
  right: -5px;
  font-size: 13px;
  background: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.18);
  line-height: 1;
  pointer-events: none;
}
```

---

## Scope

- **Shown:** saint detail page breadcrumb, browse page (`/search`) portrait corner.
- **Not shown:** quiz cards, Saints of America carousel, calendar, or any other saint card surface.

---

## Out of scope

- No text label on the badge anywhere.
- No JS-powered tooltip — native `title` attribute only.
- No filter/facet for "human reviewed only" (future work if needed).
- No changes to `build.py` or `data.json` — the join happens entirely in Astro at build time.
- No `humanReviewed` field on saints without profiles (profiles are optional; the badge simply never appears for profileless saints).

---

## Files changed

| File | Change |
|------|--------|
| `src/content.config.ts` | Add `humanReviewed` field to `profileSchema` |
| `src/lib/types.ts` | Add `humanReviewed?: boolean` to `FinderSaint` |
| `src/pages/search.astro` | Load profiles, build ID set, annotate `finderData` |
| `src/components/SaintView.astro` | Render dove in `.sv-back` when `profile?.humanReviewed` |
| `src/islands/finder.client.ts` | Render `.portrait-dove` overlay when `s.humanReviewed` |
| `src/styles/global.css` | Add `.portrait-dove` styles; ensure `.portrait` is `position: relative` |
