# Profile Storage Foundation (YAML + Astro Content Collections) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store rich saint profiles as **one YAML file per saint** in an **Astro data Content Collection**, validated at build time by a **Zod schema**, with provenance/review metadata (`status`/`sources`/`generated`) and a production gate that ships only `reviewed` profiles — readable, reviewable content (no JSON/TS noise) and the foundation Plans 2 and 3 build on.

**Architecture:** Each profile is `src/content/profiles/OS-####.yaml`. `src/content.config.ts` defines a `profiles` data collection (Astro `glob()` loader) whose **Zod schema is both the type and the validator** — a malformed or incomplete profile **fails the build**. `SaintView.astro` reads profiles via `getCollection("profiles")` and applies a pure review-status gate (`selectProfiles`). `build.py` keeps a lightweight Python-side cross-check (every profile filename names a real saint), needing no new Python deps. Astro 6.4 parses YAML for data collections natively — no runtime YAML dependency.

**Tech Stack:** Astro 6 Content Layer (`astro:content`, `astro/loaders`, Zod), YAML, Vitest, Python `build.py` + `unittest`, the `yaml` npm package (one-shot migration only).

---

## Why YAML (supersedes the prior TS/JSON draft of this plan)

The prior version of this plan stored profiles as `src/lib/profiles/OS-####.ts` (`export
default` a JSON literal). In review, the JSON proved too cumbersome to read and verify for
multi-paragraph prose. YAML with folded block scalars is far more reviewable (the dominant
workflow is human/clergy **review** of machine-generated drafts), allows `#` comments, and
parses cleanly in the Python tooling (Plans 2/3). Astro Content Collections + Zod recover the
build-time type-safety the raw-YAML switch would otherwise cost.

This plan implements spec **§6, §7, §9**. It produces working, testable software on its own:
the 23 existing profiles become validated YAML, render identically, with draft-gating ready
for Plan 2's generated drafts.

## Reconciling the existing branch

`feat/profile-storage-foundation` already implements this plan in **TS/JSON** (9 commits).
Do **not** build on top of it. Start a fresh branch off `main` (or off the docs branch that
carries these plans), and in the migration task (Task 4) **convert the 23 existing
`src/lib/profiles/OS-####.ts` files** (faithful content) into YAML, then delete the TS
storage. The TS commits are discarded with their branch — nothing was merged.

## File structure

| File | Responsibility |
|---|---|
| `src/content.config.ts` (**new**) | Define the `profiles` data collection: `glob()` YAML loader + the Zod schema (the type AND the validator). |
| `src/lib/profile-select.ts` (**new**) | Pure, generic `selectProfiles(all, showDrafts)` — the review-status gate. No imports → no cycle. |
| `src/lib/profile-select.test.ts` (**new**) | Vitest tests for `selectProfiles`. |
| `src/lib/saint-profiles.ts` (**new, small**) | `loadProfileMap()` — `getCollection` + gate → `Record<id, profile>`; re-exports the inferred `SaintProfile` type. |
| `src/content/profiles/OS-####.yaml` (**new ×23**) | One profile per file, migrated from the TS implementation, each `status: reviewed`. |
| `src/components/SaintView.astro` (**modify**) | Read profiles via `await loadProfileMap()` instead of the old sync `SAINT_PROFILES`. |
| `src/components/SaintProfile.astro` (**modify**) | Import the `SaintProfile` type from `saint-profiles`; add the draft banner. |
| `build.py` (**modify**) | `validate_saint_profiles(valid_ids)` — each `*.yaml` filename + its `id:` line names a real saint (regex, no pyyaml). |
| `tests/test_build.py` (**modify**) | Python unittest for `validate_saint_profiles`. |
| `package.json` (**modify, dev only**) | Add `yaml` to devDependencies for the one-shot migration script. |
| `CLAUDE.md` (**modify**) | Document the YAML/Content-Collections storage + gate. |

**Decisions baked in:** profiles live in `src/content/profiles/` (Astro collection home);
each YAML carries an explicit `id: OS-####` field and we key by `data.id` (so loader
id-slugging never matters); deep shape validation is **Zod at build**, the
`status`-requires-`sources` rule is a Zod `superRefine`, and `build.py` only does the
cheap Saint-ID cross-check (no new Python dependency).

---

## Task 1: Define the collection + Zod schema

**Files:** Create `src/content.config.ts`

- [ ] **Step 1: Write the config**

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const relatedFigure = z.object({
  name: z.string(),
  note: z.string(),
  href: z.string().optional(), // internal "saint/OS-####"
  external: z.string().optional(),
});

const profileSchema = z
  .object({
    id: z.string().regex(/^OS-\d{4,}$/),
    status: z.enum(["draft", "reviewed", "flagged"]).default("draft"),
    sources: z.array(z.string()).optional(),
    generated: z.string().optional(), // ISO date
    lifespan: z.string().optional(),
    overview: z.array(z.string()).min(1),
    timeline: z
      .array(
        z.object({
          when: z.string(),
          title: z.string(),
          body: z.string(),
          figures: z
            .array(z.object({ name: z.string(), href: z.string().optional() }))
            .optional(),
          source: z.string().optional(),
        }),
      )
      .optional(),
    sections: z
      .array(z.object({ heading: z.string(), body: z.array(z.string()) }))
      .optional(),
    family: z
      .object({
        heading: z.string(),
        intro: z.string().optional(),
        figures: z.array(relatedFigure),
      })
      .optional(),
    related: z.array(relatedFigure).optional(),
    patronage: z.array(z.string()).optional(),
    works: z
      .array(
        z.object({
          title: z.string(),
          desc: z.string(),
          date: z.string().optional(),
        }),
      )
      .optional(),
    reading: z
      .array(
        z.object({
          heading: z.string(),
          items: z.array(
            z.object({
              title: z.string(),
              author: z.string().optional(),
              type: z.string().optional(),
            }),
          ),
        }),
      )
      .optional(),
  })
  // Generated (draft/flagged) profiles must cite sources (spec §6).
  .superRefine((p, ctx) => {
    if (p.status !== "reviewed" && !(p.sources && p.sources.length)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${p.id}: ${p.status} profiles must list at least one source`,
      });
    }
  });

const profiles = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/profiles" }),
  schema: profileSchema,
});

export const collections = { profiles };
```

- [ ] **Step 2: Add an empty collection dir so the build resolves**

```bash
mkdir -p src/content/profiles
```

(Astro tolerates an empty collection; real files arrive in Task 4. If the build complains
about an empty collection, the Task-4 migration runs immediately after, so proceed.)

- [ ] **Step 3: Verify the config type-checks**

Run: `npm run build`
Expected: build succeeds (collection is empty; no profiles render yet — that is Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts
git commit -m "feat(profiles): profiles data collection + Zod schema (YAML storage)"
```

---

## Task 2: The pure review-status gate

**Files:** Create `src/lib/profile-select.ts`, `src/lib/profile-select.test.ts`

Generic + structural so it imports nothing (no cycle with `saint-profiles.ts`).

- [ ] **Step 1: Write the failing test**

Create `src/lib/profile-select.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { selectProfiles } from "./profile-select";

const reviewed = { id: "OS-0001", status: "reviewed" as const };
const draft = { id: "OS-0002", status: "draft" as const };
const flagged = { id: "OS-0003", status: "flagged" as const };

describe("selectProfiles", () => {
  it("in production (showDrafts=false) keeps only reviewed", () => {
    const out = selectProfiles([reviewed, draft, flagged], false);
    expect(Object.keys(out)).toEqual(["OS-0001"]);
  });

  it("in dev (showDrafts=true) keeps all, keyed by id", () => {
    const out = selectProfiles([reviewed, draft, flagged], true);
    expect(Object.keys(out).sort()).toEqual(["OS-0001", "OS-0002", "OS-0003"]);
    expect(out["OS-0002"]).toBe(draft);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm run test:unit -- profile-select`
Expected: FAIL — `Cannot find module './profile-select'`.

- [ ] **Step 3: Implement**

Create `src/lib/profile-select.ts`:

```ts
/** Apply the review-status gate (spec §6): production ships only `reviewed`
   profiles; dev (or PUBLIC_SHOW_DRAFTS) loads all. Generic + structural so it
   needs no type import (avoids a cycle with saint-profiles.ts). */
export function selectProfiles<T extends { id: string; status?: string }>(
  all: T[],
  showDrafts: boolean,
): Record<string, T> {
  return Object.fromEntries(
    all
      .filter((p) => showDrafts || p.status === "reviewed")
      .map((p) => [p.id, p]),
  );
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm run test:unit -- profile-select`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-select.ts src/lib/profile-select.test.ts
git commit -m "feat(profiles): pure selectProfiles review-status gate with tests"
```

---

## Task 3: The profile accessor + wire SaintView

**Files:** Create `src/lib/saint-profiles.ts`; Modify `src/components/SaintView.astro`, `src/components/SaintProfile.astro`

Content Collections are async, so the accessor and its one consumer (`SaintView`) become async.

- [ ] **Step 1: Write the accessor**

Create `src/lib/saint-profiles.ts`:

```ts
/* Profile accessor over the `profiles` Content Collection. Loads all entries,
   applies the review-status gate (production = reviewed only; dev / 
   PUBLIC_SHOW_DRAFTS = all), and keys by the explicit `id` field. Only the
   per-saint page (SaintView) consumes profiles. */
import { getCollection, type CollectionEntry } from "astro:content";
import { selectProfiles } from "./profile-select";

export type SaintProfile = CollectionEntry<"profiles">["data"];

const SHOW_DRAFTS =
  import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_DRAFTS === "true";

export async function loadProfileMap(): Promise<Record<string, SaintProfile>> {
  const all = (await getCollection("profiles")).map((e) => e.data);
  return selectProfiles(all, SHOW_DRAFTS);
}
```

- [ ] **Step 2: Update SaintView to the async accessor**

In `src/components/SaintView.astro` frontmatter, replace:

```ts
import { SAINT_PROFILES } from "../lib/saint-profiles";
```

with:

```ts
import { loadProfileMap } from "../lib/saint-profiles";
```

and replace:

```ts
const profile = SAINT_PROFILES[saint.id];
```

with:

```ts
const profile = (await loadProfileMap())[saint.id];
```

(Everything downstream — `profile.related`, `profile.works`, `profile.reading`, the
conditional `<SaintProfile>` render — is unchanged; `profile` is the same shape.)

- [ ] **Step 3: Fix the SaintProfile type import**

In `src/components/SaintProfile.astro`, ensure the type import is:

```ts
import type { SaintProfile } from "../lib/saint-profiles";
```

- [ ] **Step 4: Build (still no profiles, but the wiring must compile)**

Run: `npm run build`
Expected: build succeeds; `/saint/OS-0021` renders with **no** profile yet (collection empty
until Task 4) — i.e. the plain CSV-driven page, no crash.

- [ ] **Step 5: Commit**

```bash
git add src/lib/saint-profiles.ts src/components/SaintView.astro src/components/SaintProfile.astro
git commit -m "feat(profiles): async getCollection accessor; wire SaintView to it"
```

---

## Task 4: Migrate the 23 profiles to YAML

**Files:** Create (one-shot) `scripts/profiles-to-yaml.mjs`; Create `src/content/profiles/OS-####.yaml` (×23); Modify `package.json` (dev dep); Delete the old TS storage + one-shot script

Source the 23 profiles from the TS implementation on `feat/profile-storage-foundation`
(faithful content). If starting without that branch, recover the original monolith
(`git show <rich-saint-profiles-commit>:src/lib/saint-profiles.ts`) and adapt the script to
read it instead.

- [ ] **Step 1: Add the `yaml` dev dependency**

Run: `npm install --save-dev yaml`

- [ ] **Step 2: Bring the 23 TS profile files into the working tree**

```bash
git checkout feat/profile-storage-foundation -- src/lib/profiles
ls src/lib/profiles | wc -l   # expect 23
```

- [ ] **Step 3: Write the conversion script**

Create `scripts/profiles-to-yaml.mjs`:

```js
// One-shot: convert src/lib/profiles/OS-####.ts (export default a SaintProfile)
// into src/content/profiles/OS-####.yaml. Run: node scripts/profiles-to-yaml.mjs
import { build } from "esbuild";
import { stringify } from "yaml";
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = "src/lib/profiles";
const OUT = "src/content/profiles";
mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".ts"))) {
  const res = await build({
    entryPoints: [`${SRC}/${file}`],
    bundle: false,
    format: "esm",
    write: false,
    loader: { ".ts": "ts" },
  });
  const mod = await import(
    "data:text/javascript;base64," +
      Buffer.from(res.outputFiles[0].text).toString("base64")
  );
  const profile = { ...mod.default, status: "reviewed" };
  const id = profile.id;
  writeFileSync(`${OUT}/${id}.yaml`, stringify(profile, { lineWidth: 0 }));
  console.log(`wrote ${OUT}/${id}.yaml`);
}
```

- [ ] **Step 4: Run the conversion and clean up**

```bash
node scripts/profiles-to-yaml.mjs
ls src/content/profiles | wc -l         # expect 23
rm scripts/profiles-to-yaml.mjs         # one-shot, gone
git rm -r src/lib/profiles              # delete TS storage (came from the other branch)
npx prettier --write "src/content/profiles/*.yaml"
```

- [ ] **Step 5: Verify the build renders profiles + Zod passes**

Run: `npm run build`
Expected: build succeeds; Zod validates all 23. Spot-check `/saint/OS-0021` (Basil) renders
the full profile (overview, timeline, family, works, reading) identically to before.

- [ ] **Step 6: Eyeball the YAML readability**

Open `src/content/profiles/OS-0021.yaml` — confirm `overview` paragraphs read as clean text
(not escaped one-liners). This is the whole point of the change.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/content/profiles
git commit -m "refactor(profiles): migrate 23 profiles to YAML content-collection files"
```

---

## Task 5: Saint-ID cross-check in build.py

**Files:** Modify `build.py`; Test: `tests/test_build.py`

Zod validates shape at build; `build.py` adds the data-integrity cross-check (every profile
names a real saint) in the Python CI gate, using a cheap regex (no pyyaml dependency).

- [ ] **Step 1: Write the failing Python test**

`tests/test_build.py` uses `unittest.TestCase` with `import build`. Ensure `import tempfile`,
`from pathlib import Path`, `from unittest import mock` are present; then add:

```python
class ValidateSaintProfilesTests(unittest.TestCase):
    def _profile(self, d, name, sid):
        (d / name).write_text(f"id: {sid}\nstatus: reviewed\noverview:\n  - x\n")

    def test_flags_unknown_id(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t); 
            self._profile(d, "OS-0021.yaml", "OS-0021")
            self._profile(d, "OS-9999.yaml", "OS-9999")
            with mock.patch.object(build, "PROFILES_DIR", d):
                errors, warnings = build.validate_saint_profiles({"OS-0021"})
            self.assertTrue(any("OS-9999" in e for e in errors))
            self.assertTrue(all("OS-0021" not in e for e in errors))

    def test_clean_when_all_known(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            self._profile(d, "OS-0021.yaml", "OS-0021")
            with mock.patch.object(build, "PROFILES_DIR", d):
                errors, warnings = build.validate_saint_profiles({"OS-0021", "OS-0022"})
            self.assertEqual(errors, [])

    def test_flags_id_field_not_matching_filename(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            self._profile(d, "OS-0021.yaml", "OS-0099")  # body id != filename
            with mock.patch.object(build, "PROFILES_DIR", d):
                errors, warnings = build.validate_saint_profiles({"OS-0021", "OS-0099"})
            self.assertTrue(any("OS-0021.yaml" in e for e in errors))
```

- [ ] **Step 2: Run to confirm failure**

Run: `python -m unittest tests.test_build -k Profiles -v`
Expected: FAIL — `AttributeError: validate_saint_profiles`.

- [ ] **Step 3: Implement**

In `build.py`, next to `DATA = ROOT / "data"` (~line 35), add:

```python
SRC = ROOT / "src"
PROFILES_DIR = SRC / "content" / "profiles"   # per-saint rich profiles (YAML)
```

Near `validate_saint_images` / `validate_saint_quotes`, add:

```python
PROFILE_FILE_RE = re.compile(r"^(OS-\d{4,})\.yaml$")
PROFILE_ID_RE = re.compile(r"^id:\s*(OS-\d{4,})\s*$", re.M)


def validate_saint_profiles(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """Cross-check src/content/profiles/*.yaml against the saints: filename is
    OS-####.yaml, names a real saint, and the file's `id:` matches the filename.
    Shape validation is Zod's job at astro build; this is the Python data gate.
    Empty/missing dir is allowed (no profiles yet)."""
    errors: list[str] = []
    warnings: list[str] = []
    if not PROFILES_DIR.is_dir():
        return errors, warnings
    for path in sorted(PROFILES_DIR.glob("*.yaml")):
        m = PROFILE_FILE_RE.match(path.name)
        if not m:
            errors.append(f"profiles/{path.name}: name must be OS-####.yaml")
            continue
        sid = m.group(1)
        if sid not in valid_ids:
            errors.append(f"profiles/{path.name}: {sid} is not a known Saint ID")
        body_id = PROFILE_ID_RE.search(path.read_text(encoding="utf-8"))
        if not body_id:
            errors.append(f"profiles/{path.name}: missing an `id:` field")
        elif body_id.group(1) != sid:
            errors.append(
                f"profiles/{path.name}: id {body_id.group(1)} != filename {sid}"
            )
    return errors, warnings
```

- [ ] **Step 4: Call it in the validation flow**

Where `validate_saint_quotes` is invoked (~line 298), add directly after:

```python
    prof_errors, prof_warnings = validate_saint_profiles(_img_valid_ids)
    errors.extend(prof_errors)
    warnings.extend(prof_warnings)
```

- [ ] **Step 5: Run tests + full validate**

Run: `python -m unittest tests.test_build -k Profiles -v && make validate`
Expected: PASS (3 tests); `make validate` CLEAN (all 23 YAML name real saints).

- [ ] **Step 6: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "feat(build): validate_saint_profiles — YAML filenames/ids name real saints"
```

---

## Task 6: Draft-status banner

**Files:** Modify `src/components/SaintProfile.astro`

Production ships only `reviewed`, so the banner only ever shows in dev / draft-visible builds.

- [ ] **Step 1: Add the banner**

In `src/components/SaintProfile.astro` frontmatter (after `const { profile } = Astro.props;`):

```ts
const isDraft = profile.status && profile.status !== "reviewed";
```

As the first child inside the root `<div class="saint-profile">`:

```astro
{
  isDraft && (
    <p class="profile-draft-banner" role="status">
      Draft — pending review. Not yet verified for publication.
    </p>
  )
}
```

In the component `<style>`:

```css
.profile-draft-banner {
  margin: 0 0 1rem;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid #b58900;
  background: #fdf6e3;
  color: #5c4a00;
  font-size: 0.9rem;
}
```

- [ ] **Step 2: Verify (dev shows draft banner; prod hides drafts)**

Temporarily set `src/content/profiles/OS-0021.yaml` `status:` to `draft` and add a
`sources:` line (Zod requires it for non-reviewed). Run `npm run dev`, load `/saint/OS-0021`
→ banner shows. Run `npm run build` (prod) → Basil's profile is **absent** (gated out).
**Revert the YAML change.**

- [ ] **Step 3: Confirm revert**

Run: `git diff --stat src/content/profiles`
Expected: empty.

- [ ] **Step 4: Commit**

```bash
git add src/components/SaintProfile.astro
git commit -m "feat(profiles): draft-pending-review banner for non-reviewed profiles"
```

---

## Task 7: Document + final verification

**Files:** Modify `CLAUDE.md`

- [ ] **Step 1: Document the storage model**

In `CLAUDE.md` (§2 layout + §11 tech stack), add:

```
- **Rich saint profiles** are one YAML file per saint in `src/content/profiles/OS-####.yaml`,
  an Astro **data Content Collection** defined in `src/content.config.ts`; the **Zod schema
  validates every profile at build time** (a bad/incomplete profile fails the build). Each
  profile carries `status: draft|reviewed|flagged`; production ships only `reviewed` (drafts
  render in dev / `PUBLIC_SHOW_DRAFTS=true`, behind a banner). `SaintView.astro` reads them
  via `getCollection`. `build.py` cross-checks every profile filename/id against the saints.
```

- [ ] **Step 2: Run the full gate suite**

```bash
make validate          # python: data + profile cross-check — CLEAN
make test              # python unittest incl. validate_saint_profiles
npm run test:unit      # vitest: selectProfiles
npm run lint           # eslint + prettier (incl. the YAML files)
npm run build          # astro build: Zod validates all profiles; prod gate = reviewed only
npm test               # playwright e2e (existing saint-profile spec green)
```

Expected: all green; `/saint/OS-0021` renders identically to pre-refactor.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document YAML content-collection profile storage + reviewed-only gate"
```

---

## Self-review notes (spec coverage)

- **§6 (status/sources/generated, production gate, dev banner):** Tasks 1 (Zod fields +
  superRefine), 2–3 (gate), 6 (banner). ✅
- **§7 (per-saint files, no monolith):** Tasks 1, 4 — now YAML content collection. ✅
- **§9 (validation, production filtered to reviewed):** Zod at build (Task 1), build.py
  cross-check (Task 5), gate (Task 3). ✅
- **§10.4 (relics as a `sections` block):** supported by the `sections` field; no extra
  schema. ✅
- **§10.5 (optional `date`/`type`):** in the Zod schema (Task 1). ✅
- **Readability goal (why this revision exists):** YAML block scalars (Task 4 step 6). ✅

## Follow-on plans (updated for YAML)

- **Plan 2 — Generation pipeline:** Emit writes `src/content/profiles/OS-####.yaml`
  (`yaml.safe_dump`, authoring-only `pyyaml`); everything else unchanged.
- **Plan 3 — Review sheet:** the reader is `yaml.safe_load` (no fragile parsing); consumes
  the same `dist/` coverage + verdicts outputs.
