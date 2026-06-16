# Rich Saint Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional per-saint rich-profile layer that renders an encyclopedic article (biography, timeline, holy family, contributions, legacy, works, further reading, patronage, theme badges) on a saint page when a profile exists, with St. Basil the Great (`OS-0021`) as the first profile.

**Architecture:** A new `src/lib/saint-profiles.ts` keyed by Saint ID + a new `src/components/SaintProfile.astro` rendered by `SaintView.astro` only when `SAINT_PROFILES[saint.id]` exists — mirroring the existing `witnesses.ts` / `WitnessProfile.astro` pattern. No CSV schema change, no `data.json` shape change, no new controlled vocabulary; the other ~2,736 saints are untouched.

**Tech Stack:** Astro (static-site generator), TypeScript, Playwright e2e, Python `build.py` (CSV→`data.json`). Node 24+. Edits to `data/saints.csv` and `data/saint_quotes.csv` preserve CRLF line endings.

---

## Conventions (read once)

- **Branch:** already on `feat/rich-saint-profiles`.
- **Build/validate (host, no Docker):** `make validate` (data check) and `python build.py --no-xlsx` to regenerate `public/data.json` (host Python lacks `openpyxl`; never run the xlsx path here). The frontend reads `public/data.json` at build.
- **Frontend gates:** `npm run lint` (ESLint + Prettier `--check`) and `npm test` (Playwright; builds + previews the site). `npm run build` produces `_site/`.
- **Every internal href goes through `withBase()`** from `src/lib/format.ts`.
- **Resolved family/related Saint IDs** (verified against row Name): Macrina the Elder `OS-2474`, Macrina the Younger `OS-1551`, Gregory of Nyssa `OS-0422`, Peter of Sebaste `OS-0420`, Gregory the Theologian `OS-0022`, John Chrysostom `OS-0023`. Naucratius is **not** in the dataset → render as a plain name (no link).
- **Existing e2e at `e2e/smoke.spec.ts:119`** loads `/saint/OS-0021/` and asserts `h1` contains "Basil", `.saintview .sv-rail` and `.sv-address` are visible. Do **not** break these — the rich sections are additive and the liturgical address stays.

## File Structure

- **Create** `src/lib/saint-profiles.ts` — profile types + `SAINT_PROFILES` registry (Basil's data). Reuses `TimelineEntry`, `RelatedFigure` from `src/lib/ephraim.ts`.
- **Create** `src/components/SaintProfile.astro` — renders all profile sections; receives `{ profile }`.
- **Modify** `src/components/SaintView.astro` — import the registry + component; render `<SaintProfile>` after the lead when a profile exists; suppress the CSV Works/About block when the profile carries works/reading.
- **Modify** `data/saints.csv` (row `OS-0021`) — fuller Works list + fuller Sources (existing fields only).
- **Create** one row in `data/saint_quotes.csv` (`OS-0021`) — one PD (NPNF2) Hexaemeron quote.
- **Create** `e2e/saint-profile.spec.ts` — Playwright assertions for the rich Basil page + a no-profile control.

---

### Task 1: Profile types, registry scaffold, and `SaintView` wiring (biography renders)

**Files:**
- Create: `src/lib/saint-profiles.ts`
- Create: `src/components/SaintProfile.astro`
- Modify: `src/components/SaintView.astro`
- Test: `e2e/saint-profile.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `e2e/saint-profile.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("Basil's page renders the rich profile biography", async ({ page }) => {
  const resp = await page.goto("./saint/OS-0021/");
  expect(resp?.status()).toBe(200);
  // Existing detail framing is intact.
  await expect(page.locator(".saintview .sv-rail")).toBeVisible();
  await expect(page.locator(".sv-address")).toBeVisible();
  // The rich profile adds a "Life" biography section with multiple paragraphs.
  await expect(
    page.locator(".sp-sec h2", { hasText: "Life" }),
  ).toBeVisible();
  await expect(
    page.locator(".sp-bio p", { hasText: "Cappadocia" }).first(),
  ).toBeVisible();
  expect(await page.locator(".sp-bio p").count()).toBeGreaterThanOrEqual(4);
});

test("a saint without a profile renders no profile sections", async ({
  page,
}) => {
  // OS-0022 (Gregory the Theologian) has no profile in Feature A.
  await page.goto("./saint/OS-0022/");
  await expect(page.locator(".saintview .sv-name")).toContainText("Gregory");
  await expect(page.locator(".sp-sec")).toHaveCount(0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- saint-profile`
Expected: FAIL — `.sp-sec` not found (the component/section does not exist yet).

- [ ] **Step 3: Create the profile types + registry with Basil's biography**

Create `src/lib/saint-profiles.ts`:

```ts
/* Rich saint profiles — an OPTIONAL editorial layer over the canonical saints
   dataset, mirroring the witnesses/ephraim pattern. data/saints.csv stays the
   finder/facet source of truth and is deliberately terse; long-form encyclopedic
   content (biography, timeline, family, legacy, works) lives here and is rendered
   by SaintProfile.astro only when SAINT_PROFILES[id] exists. All prose is original,
   factual, and encyclopedic — no devotional language, no prayers, sourced facts.
   Subject to clergy/source review before launch (CLAUDE.md §9). */
import type { TimelineEntry, RelatedFigure } from "./ephraim";

/** A headed block of prose — Major Contributions, Legacy, "Why the Great". */
export interface ProfileSection {
  heading: string;
  body: string[]; // one entry per paragraph
}
export interface ProfileWork {
  title: string;
  desc: string;
}
export interface ReadingItem {
  title: string;
  author?: string;
}
export interface ReadingGroup {
  heading: string;
  items: ReadingItem[];
}
export interface FamilyGroup {
  heading: string;
  intro?: string;
  figures: RelatedFigure[]; // RelatedFigure.note carries the relation ("sister", …)
}

export interface SaintProfile {
  id: string; // must match a row in data/saints.csv
  lifespan?: string; // e.g. "c. 329 – 379 · Archbishop of Caesarea in Cappadocia"
  overview: string[]; // expanded biography — presence triggers the rich render
  timeline?: TimelineEntry[];
  sections?: ProfileSection[];
  family?: FamilyGroup;
  related?: RelatedFigure[];
  patronage?: string[];
  themes?: string[];
  works?: ProfileWork[]; // supersedes the plain CSV Works/About on this saint's page
  reading?: ReadingGroup[];
}

export const SAINT_PROFILES: Record<string, SaintProfile> = {
  "OS-0021": {
    id: "OS-0021",
    lifespan: "c. 329 – 379 · Archbishop of Caesarea in Cappadocia",
    overview: [
      "Saint Basil the Great (c. 329–379) served as Archbishop of Caesarea in Cappadocia and ranks among the most consequential of the Church Fathers. He was born into a distinguished and devout Christian family of Cappadocia and received a thorough classical education in Caesarea, Constantinople, and Athens, where his fellow students included Gregory the Theologian.",
      "After his studies Basil withdrew into the ascetic life, traveling through Egypt, Palestine, Syria, and Mesopotamia to observe the monastic communities flourishing there. From what he learned he drew together principles for communal monasticism that would become foundational for the Eastern Orthodox monastic tradition.",
      "Consecrated Archbishop of Caesarea in 370, Basil emerged during a period of fierce doctrinal conflict as one of the foremost defenders of Nicene Christianity against Arianism and kindred teachings. His theological writing did much to clarify the Church's confession of the Holy Trinity, and especially the divinity of the Holy Spirit.",
      "Basil was equally known for organized works of mercy. On the outskirts of Caesarea he founded a large charitable complex — housing for travelers, care for the poor, and facilities for the sick — that later generations called the Basiliad, among the most significant philanthropic undertakings of the early Christian world.",
      "A prolific author and preacher, he produced theological treatises, scriptural commentary, monastic rules, letters, and homilies, and his influence reached into liturgy, social ethics, and pastoral practice. He reposed on January 1, 379. Together with Gregory the Theologian and John Chrysostom he is honored as one of the Three Holy Hierarchs, and the Divine Liturgy that bears his name is still celebrated in the Orthodox Church on appointed days through the year.",
    ],
  },
};
```

- [ ] **Step 4: Create the `SaintProfile.astro` component (biography section only)**

Create `src/components/SaintProfile.astro`:

```astro
---
/* Rich, optional encyclopedic article for a canonical saint. Rendered by
   SaintView only when SAINT_PROFILES[saint.id] exists. Reuses the saint-page
   visual idiom (ivory column, gold eyebrow rules) — additive to the existing view. */
import type { SaintProfile } from "../lib/saint-profiles";
import { withBase } from "../lib/format";

interface Props {
  profile: SaintProfile;
}
const { profile } = Astro.props;
---

<div class="saint-profile">
  {/* ── Life (expanded biography) ── */}
  <section class="sp-sec sp-life">
    <h2>Life</h2>
    <div class="sp-bio">
      {profile.overview.map((p) => <p>{p}</p>)}
    </div>
  </section>
</div>

<style>
  .saint-profile {
    margin-top: 1.6rem;
  }
  .sp-sec {
    margin: 1.8rem 0;
  }
  .sp-sec h2 {
    font-family: var(--serif);
    font-size: 1.35rem;
    color: var(--byz-deep);
    margin: 0 0 0.5rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid var(--line-gold);
  }
  .sp-bio p {
    margin: 0 0 0.85rem;
    line-height: 1.7;
  }
</style>
```

- [ ] **Step 5: Wire the component into `SaintView.astro`**

In `src/components/SaintView.astro`, add to the imports (after line 10, the `format` import):

```astro
import { SAINT_PROFILES } from "../lib/saint-profiles";
import SaintProfile from "./SaintProfile.astro";
```

Add after the existing destructure `const m = toSaintView(saint);` (line 16):

```astro
const profile = SAINT_PROFILES[saint.id];
```

Change the `hasWorks` line (line 32) so a profile's own works/reading supersede the CSV Works/About block:

```astro
const hasWorks =
  (m.works.length > 0 || m.about.length > 0) &&
  !(profile && (profile.works || profile.reading));
```

Render the profile right after the lead paragraph. Replace the existing lead line (line 171):

```astro
      {m.brief && <p class="sv-lead">{m.brief}</p>}
```

with:

```astro
      {m.brief && <p class="sv-lead">{m.brief}</p>}

      {profile && <SaintProfile profile={profile} />}
```

- [ ] **Step 6: Rebuild data + run the test to verify it passes**

Run: `python build.py --no-xlsx && npm test -- saint-profile`
Expected: PASS — biography "Life" section renders with ≥4 paragraphs; the no-profile control (OS-0022) shows zero `.sp-sec`.

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: clean (no ESLint/Prettier errors).

- [ ] **Step 8: Commit**

```bash
git add src/lib/saint-profiles.ts src/components/SaintProfile.astro src/components/SaintView.astro e2e/saint-profile.spec.ts
git commit -m "feat(profiles): rich saint-profile layer + Basil biography (OS-0021)"
```

---

### Task 2: Timeline, Holy Family, and Related Saints

**Files:**
- Modify: `src/lib/saint-profiles.ts`
- Modify: `src/components/SaintProfile.astro`
- Test: `e2e/saint-profile.spec.ts`

- [ ] **Step 1: Extend the failing test**

Append to `e2e/saint-profile.spec.ts`:

```ts
test("Basil's profile shows a timeline, holy family, and related saints", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  // Timeline with dated entries.
  await expect(page.locator(".sp-sec h2", { hasText: "Timeline" })).toBeVisible();
  expect(await page.locator(".sp-timeline li").count()).toBeGreaterThanOrEqual(5);
  await expect(
    page.locator(".sp-timeline li", { hasText: "Consecrated Archbishop" }),
  ).toBeVisible();

  // Holy Family of Cappadocia — with at least one internal saint link.
  await expect(
    page.locator(".sp-sec h2", { hasText: "Holy Family of Cappadocia" }),
  ).toBeVisible();
  await expect(
    page.locator('.sp-family a[href*="/saint/OS-0422"]'), // Gregory of Nyssa
  ).toBeVisible();
  // Naucratius is not in the dataset → plain name, no link.
  await expect(
    page.locator(".sp-family", { hasText: "Naucratius" }),
  ).toBeVisible();

  // Related Saints links resolve to real saint pages.
  await expect(
    page.locator('.sp-related a[href*="/saint/OS-0023"]'), // John Chrysostom
  ).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- saint-profile`
Expected: FAIL — Timeline / Holy Family / Related sections not yet rendered.

- [ ] **Step 3: Add the data to Basil's profile**

In `src/lib/saint-profiles.ts`, inside the `"OS-0021"` object, after `overview: [...]`, add:

```ts
    timeline: [
      { when: "c. 329", title: "Born in Cappadocia", body: "Into a distinguished Christian family." },
      { when: "356", title: "Embraced the ascetic life", body: "After travels among the monastic communities of Egypt, Palestine, Syria, and Mesopotamia." },
      { when: "364", title: "Ordained presbyter", body: "Serving the Church of Caesarea." },
      { when: "370", title: "Consecrated Archbishop of Caesarea", body: "Leading the Church through the Arian controversy." },
      { when: "375", title: "Completed On the Holy Spirit", body: "His treatise on the divinity of the Holy Spirit." },
      { when: "379", title: "Reposed in the Lord", body: "Commemorated on January 1." },
    ],
    family: {
      heading: "Holy Family of Cappadocia",
      intro:
        "Basil belonged to one of the most remarkable saintly families in Christian history; several of his close relations are themselves commemorated as saints.",
      figures: [
        { name: "Saint Macrina the Elder", note: "grandmother", href: "saint/OS-2474" },
        { name: "Saint Macrina the Younger", note: "sister", href: "saint/OS-1551" },
        { name: "Saint Gregory of Nyssa", note: "brother", href: "saint/OS-0422" },
        { name: "Saint Peter of Sebaste", note: "brother", href: "saint/OS-0420" },
        { name: "Saint Naucratius", note: "brother" },
      ],
    },
    related: [
      { name: "Saint Gregory the Theologian", note: "fellow Cappadocian Father", href: "saint/OS-0022" },
      { name: "Saint Gregory of Nyssa", note: "his brother", href: "saint/OS-0422" },
      { name: "Saint Macrina the Younger", note: "his sister", href: "saint/OS-1551" },
      { name: "Saint Peter of Sebaste", note: "his brother", href: "saint/OS-0420" },
      { name: "Saint John Chrysostom", note: "fellow Holy Hierarch", href: "saint/OS-0023" },
    ],
```

- [ ] **Step 4: Render the three sections in `SaintProfile.astro`**

In `src/components/SaintProfile.astro`, add `withBase` is already imported. Inside `<div class="saint-profile">`, after the `.sp-life` section, add:

```astro
  {/* ── Timeline ── */}
  {
    profile.timeline && profile.timeline.length > 0 && (
      <section class="sp-sec">
        <h2>Timeline</h2>
        <ul class="sp-timeline">
          {profile.timeline.map((t) => (
            <li>
              <span class="sp-when">{t.when}</span>
              <span class="sp-what">
                <strong>{t.title}</strong>
                {t.body && <span class="sp-tbody"> — {t.body}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  {/* ── Holy Family ── */}
  {
    profile.family && (
      <section class="sp-sec sp-family">
        <h2>{profile.family.heading}</h2>
        {profile.family.intro && <p class="sp-fam-intro">{profile.family.intro}</p>}
        <ul class="sp-figs">
          {profile.family.figures.map((f) => (
            <li>
              {f.href ? (
                <a href={withBase(f.href)}>{f.name}</a>
              ) : (
                <span>{f.name}</span>
              )}
              <span class="sp-rel"> · {f.note}</span>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  {/* ── Related Saints ── */}
  {
    profile.related && profile.related.length > 0 && (
      <section class="sp-sec sp-related">
        <h2>Related Saints</h2>
        <ul class="sp-figs">
          {profile.related.map((f) => (
            <li>
              {f.href ? (
                <a href={withBase(f.href)}>{f.name}</a>
              ) : (
                <span>{f.name}</span>
              )}
              <span class="sp-rel"> · {f.note}</span>
            </li>
          ))}
        </ul>
      </section>
    )
  }
```

Add `withBase` to the component's imports if not present — change the frontmatter import line to:

```astro
import { withBase } from "../lib/format";
```

(It is already imported per Task 1 Step 4; confirm it is present.)

Add to the `<style>` block:

```css
  .sp-timeline {
    list-style: none;
    margin: 0;
    padding: 0;
    border-left: 2px solid var(--line-gold);
  }
  .sp-timeline li {
    display: flex;
    gap: 0.9rem;
    padding: 0.45rem 0 0.45rem 1rem;
  }
  .sp-when {
    flex: 0 0 4.5rem;
    font-family: var(--serif);
    font-weight: 600;
    color: var(--gold-deep);
  }
  .sp-tbody {
    color: var(--ink-soft);
  }
  .sp-fam-intro {
    line-height: 1.7;
    margin: 0 0 0.6rem;
  }
  .sp-figs {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .sp-figs li {
    padding: 0.25rem 0;
  }
  .sp-figs a {
    color: var(--byz);
    text-decoration: none;
    font-weight: 600;
  }
  .sp-figs a:hover {
    color: var(--celest);
  }
  .sp-rel {
    color: var(--ink-soft);
  }
```

- [ ] **Step 5: Rebuild + run the test to verify it passes**

Run: `python build.py --no-xlsx && npm test -- saint-profile`
Expected: PASS — timeline (≥5 entries), Holy Family with the Gregory-of-Nyssa link and the plain Naucratius name, and Related Saints with the John Chrysostom link all render.

- [ ] **Step 6: Lint + commit**

```bash
npm run lint
git add src/lib/saint-profiles.ts src/components/SaintProfile.astro e2e/saint-profile.spec.ts
git commit -m "feat(profiles): Basil timeline, holy family, and related saints"
```

---

### Task 3: Contributions, Legacy, and "Why the Great" sections

**Files:**
- Modify: `src/lib/saint-profiles.ts`
- Modify: `src/components/SaintProfile.astro`
- Test: `e2e/saint-profile.spec.ts`

- [ ] **Step 1: Extend the failing test**

Append to `e2e/saint-profile.spec.ts`:

```ts
test("Basil's profile shows contributions, legacy, and the 'Great' section", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");
  for (const h of [
    "Theology of the Holy Spirit",
    "Father of Eastern Monasticism",
    "Legacy in Christian Charity",
    'Why He Is Called "the Great"',
  ]) {
    await expect(page.locator(".sp-prose h3", { hasText: h })).toBeVisible();
  }
  // The Basiliad is described in the charity section.
  await expect(
    page.locator(".sp-prose", { hasText: "Basiliad" }).first(),
  ).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- saint-profile`
Expected: FAIL — `.sp-prose` sections not yet rendered.

- [ ] **Step 3: Add the `sections` data to Basil's profile**

In `src/lib/saint-profiles.ts`, inside the `"OS-0021"` object (after `related: [...]`), add:

```ts
    sections: [
      {
        heading: "Defender of Nicene Orthodoxy",
        body: [
          "During the Arian controversies of the fourth century Basil stood at the center of the defense of the Nicene faith, and his writings helped give lasting shape to the Orthodox confession of the Holy Trinity.",
        ],
      },
      {
        heading: "Theology of the Holy Spirit",
        body: [
          "His treatise On the Holy Spirit remains among the most important works of patristic theology, setting out the Church's confession of the full divinity of the Holy Spirit alongside the Father and the Son.",
        ],
      },
      {
        heading: "Founder of Organized Christian Charity",
        body: [
          "Basil established extensive institutions for the poor, the sick, and the traveler on the edge of Caesarea. The complex later called the Basiliad became a model for Christian philanthropy in the centuries that followed.",
        ],
      },
      {
        heading: "Father of Eastern Monasticism",
        body: [
          "Though monasticism preceded him, Basil's rules and counsel organized and stabilized communal monastic life across the Eastern Christian world, and they remain influential in Orthodox monasteries to this day.",
        ],
      },
      {
        heading: "Liturgical Legacy",
        body: [
          "The Divine Liturgy of Saint Basil the Great is appointed for the Sundays of Great Lent, the eves of the Nativity and of Theophany when so appointed, Holy Thursday, Holy Saturday, and his feast on January 1.",
        ],
      },
      {
        heading: "Legacy in Theology",
        body: [
          "Basil's defense of the Nicene faith helped shape the Church's confession of the Holy Trinity at a decisive moment, and his work on the Holy Spirit fed directly into the doctrine affirmed by the Second Ecumenical Council in 381. With Gregory the Theologian and his brother Gregory of Nyssa he is numbered among the Cappadocian Fathers, whose thought continues to inform Orthodox teaching.",
        ],
      },
      {
        heading: "Legacy in Monasticism",
        body: [
          "His rules and guidance gave communal monastic life an enduring shape — prayer, obedience, manual labor, charity, and a life shared in common — that countless Orthodox monasteries have followed ever since.",
        ],
      },
      {
        heading: "Legacy in Liturgical Life",
        body: [
          "The Liturgy that bears his name remains one of the principal eucharistic services of the Orthodox Church, preserving prayers long associated with him and reflecting his emphasis on God's saving work through history.",
        ],
      },
      {
        heading: "Legacy in Christian Charity",
        body: [
          "Basil held care for the poor and the sick to be inseparable from the Christian life. The institutions he founded near Caesarea anticipated the later hospitals, hospices, and shelters of the Christian world; historians often point to the Basiliad as one of the earliest large-scale Christian charitable complexes.",
        ],
      },
      {
        heading: "Legacy in Education",
        body: [
          "A classically trained scholar, Basil encouraged Christians to seek wisdom while remaining grounded in the faith. His Address to Young Men on the Right Use of Greek Literature became one of the most influential early Christian treatments of education and of the relationship between faith and classical learning.",
        ],
      },
      {
        heading: 'Why He Is Called "the Great"',
        body: [
          "The title reflects not his theology alone but the breadth of his influence across the whole life of the Church. Few figures have left so lasting a mark on doctrine, worship, monasticism, education, and works of mercy at once, and for this he is remembered among the Three Holy Hierarchs and among the greatest teachers and pastors in Christian history.",
        ],
      },
    ],
```

- [ ] **Step 4: Render the sections in `SaintProfile.astro`**

In `src/components/SaintProfile.astro`, after the `.sp-life` section and before the Timeline section, add:

```astro
  {/* ── Contributions / Legacy / "the Great" ── */}
  {
    profile.sections && profile.sections.length > 0 && (
      <section class="sp-sec sp-prose">
        {profile.sections.map((s) => (
          <article class="sp-block">
            <h3>{s.heading}</h3>
            {s.body.map((p) => (
              <p>{p}</p>
            ))}
          </article>
        ))}
      </section>
    )
  }
```

Add to the `<style>` block:

```css
  .sp-prose .sp-block {
    margin: 0 0 1.1rem;
  }
  .sp-prose h3 {
    font-family: var(--serif);
    font-size: 1.15rem;
    color: var(--byz);
    margin: 0 0 0.35rem;
  }
  .sp-prose p {
    margin: 0 0 0.6rem;
    line-height: 1.7;
  }
```

- [ ] **Step 5: Rebuild + run the test to verify it passes**

Run: `python build.py --no-xlsx && npm test -- saint-profile`
Expected: PASS — all four headings render and the Basiliad text is present.

- [ ] **Step 6: Lint + commit**

```bash
npm run lint
git add src/lib/saint-profiles.ts src/components/SaintProfile.astro e2e/saint-profile.spec.ts
git commit -m "feat(profiles): Basil contributions, legacy, and 'the Great' sections"
```

---

### Task 4: Notable Works, Further Reading, Patronage, and Theme badges

**Files:**
- Modify: `src/lib/saint-profiles.ts`
- Modify: `src/components/SaintProfile.astro`
- Test: `e2e/saint-profile.spec.ts`

- [ ] **Step 1: Extend the failing test**

Append to `e2e/saint-profile.spec.ts`:

```ts
test("Basil's profile shows works, further reading, patronage, and themes", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/");

  // Notable Works with descriptions (profile table, not the plain CSV link list).
  await expect(
    page.locator(".sp-sec h2", { hasText: "Notable Works" }),
  ).toBeVisible();
  await expect(
    page.locator(".sp-works li", { hasText: "On the Holy Spirit" }),
  ).toBeVisible();

  // Further Reading, grouped Ancient / Modern.
  await expect(
    page.locator(".sp-sec h2", { hasText: "Further Reading" }),
  ).toBeVisible();
  await expect(
    page.locator(".sp-reading h3", { hasText: "Ancient Sources" }),
  ).toBeVisible();
  await expect(
    page.locator(".sp-reading li", { hasText: "Philip Rousseau" }),
  ).toBeVisible();

  // Patronage chips and Theme badges.
  await expect(
    page.locator(".sp-patron .sp-chip", { hasText: "Monastics" }),
  ).toBeVisible();
  await expect(
    page.locator(".sp-themes .sp-badge", { hasText: "Church Fathers" }),
  ).toBeVisible();

  // The plain CSV "Works by the Saint" block is superseded by the profile table.
  await expect(page.locator(".sv-works")).toHaveCount(0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- saint-profile`
Expected: FAIL — works/reading/patronage/themes not yet rendered.

- [ ] **Step 3: Add the data to Basil's profile**

In `src/lib/saint-profiles.ts`, inside the `"OS-0021"` object (after `sections: [...]`), add:

```ts
    patronage: [
      "Monastics",
      "Theologians",
      "Educators",
      "Hospital workers",
      "Charitable ministries",
      "Social service organizations",
    ],
    themes: [
      "Theology",
      "Church Fathers",
      "Three Holy Hierarchs",
      "Cappadocian Fathers",
      "Monasticism",
      "Christian Charity",
      "Bishops",
      "Defenders of Orthodoxy",
      "Patristics",
      "Education",
    ],
    works: [
      { title: "On the Holy Spirit", desc: "Defense of the divinity of the Holy Spirit." },
      { title: "Against Eunomius", desc: "Refutation of Eunomian Arianism." },
      { title: "Hexaemeron", desc: "Homilies on the six days of creation." },
      { title: "Longer Rules", desc: "Foundational monastic instructions." },
      { title: "Shorter Rules", desc: "Practical monastic guidance." },
      { title: "Address to Young Men on the Right Use of Greek Literature", desc: "Guidance on the Christian use of classical education." },
      { title: "Homilies on the Psalms", desc: "Biblical commentary preached to his congregation." },
      { title: "Letters", desc: "An extensive correspondence preserved from his ministry." },
    ],
    reading: [
      {
        heading: "Ancient Sources",
        items: [
          { title: "Funeral Oration on Basil the Great", author: "Saint Gregory the Theologian" },
          { title: "Life of Macrina", author: "Saint Gregory of Nyssa" },
          { title: "Ecclesiastical History", author: "Socrates Scholasticus" },
          { title: "Ecclesiastical History", author: "Sozomen" },
          { title: "Ecclesiastical History", author: "Theodoret of Cyrus" },
        ],
      },
      {
        heading: "Modern Studies",
        items: [
          { title: "Basil of Caesarea", author: "Philip Rousseau" },
          { title: "Basil of Caesarea", author: "Stephen Hildebrand" },
          { title: "On Social Justice", author: "trans. and ed. C. Paul Schroeder" },
          { title: "St. Basil the Great: On the Human Condition", author: "Popular Patristics Series" },
          { title: "The Ascetical Works of Saint Basil" },
        ],
      },
    ],
```

- [ ] **Step 4: Render works/reading/patronage/themes in `SaintProfile.astro`**

In `src/components/SaintProfile.astro`, after the Related Saints section (the last block inside `.saint-profile`), add:

```astro
  {/* ── Patronage ── */}
  {
    profile.patronage && profile.patronage.length > 0 && (
      <section class="sp-sec sp-patron">
        <h2>Patronage</h2>
        <div class="sp-chips">
          {profile.patronage.map((p) => (
            <span class="sp-chip">{p}</span>
          ))}
        </div>
      </section>
    )
  }

  {/* ── Themes ── (plain badges in Feature A; Feature B repoints them to /themes/<slug>) */}
  {
    profile.themes && profile.themes.length > 0 && (
      <section class="sp-sec sp-themes">
        <h2>Themes</h2>
        <div class="sp-chips">
          {profile.themes.map((t) => (
            <span class="sp-badge">{t}</span>
          ))}
        </div>
      </section>
    )
  }

  {/* ── Notable Works ── */}
  {
    profile.works && profile.works.length > 0 && (
      <section class="sp-sec sp-works-rich">
        <h2>Notable Works</h2>
        <ul class="sp-works">
          {profile.works.map((w) => (
            <li>
              <strong>{w.title}</strong>
              <span class="sp-wdesc"> — {w.desc}</span>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  {/* ── Further Reading ── */}
  {
    profile.reading && profile.reading.length > 0 && (
      <section class="sp-sec sp-reading">
        <h2>Further Reading</h2>
        {profile.reading.map((g) => (
          <div class="sp-read-group">
            <h3>{g.heading}</h3>
            <ul>
              {g.items.map((it) => (
                <li>
                  <em>{it.title}</em>
                  {it.author && <span class="sp-author"> — {it.author}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    )
  }
```

Add to the `<style>` block:

```css
  .sp-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .sp-chip,
  .sp-badge {
    display: inline-block;
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    font-size: 0.85rem;
    border: 1px solid var(--line);
    background: var(--paper);
    color: var(--ink);
  }
  .sp-badge {
    border-color: var(--line-gold);
    color: var(--gold-deep);
  }
  .sp-works {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .sp-works li {
    padding: 0.3rem 0;
    line-height: 1.6;
  }
  .sp-wdesc,
  .sp-author {
    color: var(--ink-soft);
  }
  .sp-read-group {
    margin: 0 0 0.8rem;
  }
  .sp-read-group h3 {
    font-family: var(--serif);
    font-size: 1.1rem;
    color: var(--byz);
    margin: 0 0 0.3rem;
  }
  .sp-read-group ul {
    margin: 0;
    padding-left: 1.1rem;
  }
  .sp-read-group li {
    padding: 0.15rem 0;
    line-height: 1.6;
  }
```

- [ ] **Step 5: Rebuild + run the test to verify it passes**

Run: `python build.py --no-xlsx && npm test -- saint-profile`
Expected: PASS — works/further-reading/patronage/themes render and the CSV `.sv-works` block is absent on Basil's page.

- [ ] **Step 6: Lint + commit**

```bash
npm run lint
git add src/lib/saint-profiles.ts src/components/SaintProfile.astro e2e/saint-profile.spec.ts
git commit -m "feat(profiles): Basil works, further reading, patronage, theme badges"
```

---

### Task 5: One public-domain (NPNF) quote

**Files:**
- Modify: `data/saint_quotes.csv`
- Test: `e2e/saint-profile.spec.ts`

- [ ] **Step 1: Extend the failing test**

Append to `e2e/saint-profile.spec.ts`:

```ts
test("Basil's page shows one sourced public-domain quote", async ({ page }) => {
  await page.goto("./saint/OS-0021/");
  await expect(page.locator(".sv-quote blockquote")).toBeVisible();
  // Cited to the Hexaemeron, public-domain NPNF translation.
  await expect(page.locator(".sv-quote figcaption")).toContainText("Hexaemeron");
  await expect(page.locator(".sv-quote .sv-quote-trans")).toContainText("NPNF");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- saint-profile`
Expected: FAIL — no quote row for OS-0021 yet.

- [ ] **Step 3: Fetch the exact public-domain wording**

The two "belongs to the hungry / to the one who needs it" lines circulate in modern in-copyright translations and are excluded. Use the creation/admiration passage from the **Hexaemeron, Homily V**, which exists in the **public-domain NPNF series 2, vol. 8** (Blomfield Jackson, CCEL).

Use WebFetch to retrieve the exact wording from CCEL:
`https://www.ccel.org/ccel/schaff/npnf208` (navigate to *The Hexaemeron, Homily V — The Germination of the Earth*; confirm the exact page URL, e.g. `.../npnf208.viii.vii.html`). Transcribe the relevant sentence **verbatim** — do not paraphrase. Record the exact page URL you used.

Expected wording (verify against CCEL before committing): a sentence beginning "I want creation to penetrate you with so much admiration that … the least plant may bring to you the clear remembrance of the Creator."

- [ ] **Step 4: Add the quote row (preserve CRLF)**

`data/saint_quotes.csv` header is `saint_id,quote,work,locus,translation,source_url`. Append one row for `OS-0021`. To preserve the file's existing line-ending convention, append with Python rather than a text editor:

```bash
python - <<'PY'
import csv, io
path = "data/saint_quotes.csv"
with open(path, newline="") as f:
    sample = f.read()
nl = "\r\n" if "\r\n" in sample else "\n"
row = [
    "OS-0021",
    "I want creation to penetrate you with so much admiration that wherever you go, the least plant may bring to you the clear remembrance of the Creator.",  # REPLACE with verbatim CCEL wording from Step 3
    "Hexaemeron",
    "Homily V",
    "NPNF2",
    "https://www.ccel.org/ccel/schaff/npnf208.viii.vii.html",  # REPLACE with the exact page URL confirmed in Step 3
]
buf = io.StringIO()
w = csv.writer(buf, lineterminator=nl)
w.writerow(row)
with open(path, "a", newline="") as f:
    f.write(buf.getvalue())
print("appended:", row[0])
PY
```

- [ ] **Step 5: Validate + rebuild + run the test**

Run: `make validate && python build.py --no-xlsx && npm test -- saint-profile`
Expected: `make validate` clean (the `NPNF2` translation passes the PD gate); the quote block renders cited to the Hexaemeron / NPNF.

- [ ] **Step 6: Commit**

```bash
git add data/saint_quotes.csv e2e/saint-profile.spec.ts
git commit -m "data: add one PD (NPNF2 Hexaemeron) quote for St. Basil (OS-0021)"
```

---

### Task 6: Enrich Basil's CSV row + final verification

**Files:**
- Modify: `data/saints.csv` (row `OS-0021`, existing fields only)

- [ ] **Step 1: Update the Works and Sources fields (preserve CRLF)**

Edit only row `OS-0021`'s **Works by the Saint** and **Sources** columns. Use a Python rewrite to preserve CRLF and quoting:

```bash
python - <<'PY'
import csv
path = "data/saints.csv"
with open(path, newline="") as f:
    nl = "\r\n" if "\r\n" in f.read() else "\n"
with open(path, newline="") as f:
    rows = list(csv.reader(f))
header = rows[0]
i_works = header.index("Works by the Saint")
i_src = header.index("Sources")
for r in rows[1:]:
    if r and r[0] == "OS-0021":
        r[i_works] = ("On the Holy Spirit; Against Eunomius; Hexaemeron; "
                      "the Longer Rules; the Shorter Rules; "
                      "Address to Young Men on the Right Use of Greek Literature; "
                      "Homilies on the Psalms; Letters")
        r[i_src] = ("Synaxarion; Orthodox Church in America (oca.org); "
                    "Greek Orthodox Archdiocese (goarch.org); "
                    "New Advent Catholic Encyclopedia (newadvent.org); "
                    "Nicene and Post-Nicene Fathers, NPNF2 vol. 8 (ccel.org); "
                    "Philip Rousseau, Basil of Caesarea; "
                    "Stephen Hildebrand, Basil of Caesarea")
        break
with open(path, "w", newline="") as f:
    csv.writer(f, lineterminator=nl).writerows(rows)
print("OS-0021 updated")
PY
```

- [ ] **Step 2: Validate the data**

Run: `make validate`
Expected: CLEAN — zero violations.

- [ ] **Step 3: Confirm the CSV diff is limited to row OS-0021**

Run: `git diff --stat data/saints.csv` and `git diff data/saints.csv | head -40`
Expected: only the `OS-0021` line changed; CRLF preserved (no spurious whole-file reformat). If the whole file shows as changed, the line endings were altered — revert and redo Step 1.

- [ ] **Step 4: Full build + lint + e2e suite**

Run: `python build.py --no-xlsx && npm run lint && npm test`
Expected: `public/data.json` regenerates with the unchanged record count; lint clean; **all** Playwright tests green (the new `saint-profile` tests **and** the existing `smoke` tests, including the `OS-0021` checks at smoke.spec.ts:119 and the calendar test that opens January 1).

- [ ] **Step 5: Manual visual check**

Run: `make serve` (or `npm run preview`), open `/saint/OS-0021/`, and confirm the profile matches the existing visual identity (ivory column, gold eyebrow rules, Cormorant/Spectral type), the liturgical address still renders, and sections read in order: lead → Life → Contributions/Legacy → Timeline → Holy Family → Related → Patronage → Themes → Notable Works → Further Reading, with the finder facets (intercessions/experience), quote, and sources following.

- [ ] **Step 6: Commit**

```bash
git add data/saints.csv
git commit -m "data: enrich St. Basil (OS-0021) works + sources within existing fields"
```

- [ ] **Step 7: Push and open the PR**

```bash
git push -u origin feat/rich-saint-profiles
```

Open a PR titled **"Rich saint profiles (Feature A) — St. Basil the Great showcase"**. In the body: note the new optional profile layer (no schema change, other saints unaffected), the one PD quote choice (and why the two almsgiving quotes were excluded as modern translations), that theme badges are non-linking in Feature A and become `/themes/<slug>` links when Feature B (Thematic Browsing) lands, and the standing clergy/source-review caveat (CLAUDE.md §9). Wait for CI (`validate` + `frontend`) to go green; the user merges (PR merge = production deploy; user-only).

---

## Self-Review

**Spec coverage:** profile-layer architecture (Task 1) ✓; biography (T1) ✓; timeline (T2) ✓; holy family + related saints with resolved internal links (T2) ✓; contributions/legacy/why-great (T3) ✓; works-with-descriptions + further reading + patronage + theme badges, CSV works superseded (T4) ✓; one PD NPNF quote (T5) ✓; CSV works/sources enrichment within existing fields (T6) ✓; testing via Playwright + the no-profile control + non-regression of existing smoke tests (T1–T6) ✓; guardrails (PD quote, original prose, CRLF, no vocab change) ✓; Feature B explicitly deferred (theme badges non-linking) ✓.

**Placeholder scan:** the two REPLACE markers in Task 5 Step 4 are intentional — the verbatim CCEL wording and exact page URL must be fetched at execution (Step 3), not guessed. All component/data code is complete.

**Type consistency:** `SaintProfile` fields (`overview`, `timeline`, `sections`, `family`, `related`, `patronage`, `themes`, `works`, `reading`) are defined in Task 1 and used with the same names in Tasks 2–4; `ProfileWork {title,desc}`, `ReadingGroup {heading,items}`, `ReadingItem {title,author?}`, `FamilyGroup {heading,intro?,figures}` match their render sites; `RelatedFigure`/`TimelineEntry` reused from `ephraim.ts` with their existing fields (`name`/`note`/`href`, `when`/`title`/`body`). CSS classes referenced in tests (`.sp-sec`, `.sp-bio`, `.sp-timeline`, `.sp-family`, `.sp-related`, `.sp-prose`, `.sp-works`, `.sp-reading`, `.sp-patron .sp-chip`, `.sp-themes .sp-badge`) all exist in the component markup.
