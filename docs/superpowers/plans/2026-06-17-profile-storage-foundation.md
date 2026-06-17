# Profile Storage Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move rich saint profiles from one monolithic `src/lib/saint-profiles.ts` object literal into per-saint files auto-aggregated at build time, add provenance/review metadata (`status`/`sources`/`generated`) with a production gate that ships only `reviewed` profiles, and add validation — the foundation the generation pipeline (Plan 2) and review tooling (Plan 3) build on.

**Architecture:** Each profile becomes `src/lib/profiles/OS-####.ts` (`export default` a `SaintProfile`). `src/lib/saint-profiles.ts` becomes a thin **aggregator** that uses Vite's `import.meta.glob` to load every per-saint file, then filters by review status (all profiles in dev; only `status: "reviewed"` in production). Profile **types** move to a new `src/lib/profile-types.ts` to avoid an import cycle. Rich field validation lives in a **Vitest** unit test; a lightweight Saint-ID-existence gate lives in **`build.py`** (Python, which already holds the canonical IDs).

**Tech Stack:** TypeScript, Astro (Vite `import.meta.glob`, `import.meta.env`), Vitest (`npm run test:unit`), Python `build.py` + `unittest`, ESLint/Prettier.

---

## Scope note

This is **Plan 1 of 3** derived from the Grounded Profile Generation spec
(`docs/superpowers/specs/2026-06-17-grounded-profile-generation-design.md`). It implements
spec **§6 (provenance/review metadata), §7 (per-saint storage), §9 (validation + production
gate)**. The generation **pipeline** (spec §3–§5, §8) and the **review sheet** (spec §13)
are Plans 2 and 3 — they depend on this foundation existing. This plan produces working,
testable software on its own: the 23 existing profiles migrate, render identically, and are
validated, with draft-gating ready for Plan 2's generated drafts.

## File structure

| File | Responsibility |
|---|---|
| `src/lib/profile-types.ts` (**new**) | All profile interfaces (`SaintProfile`, `ProfileSection`, `ProfileWork`, `ReadingItem`, `ReadingGroup`, `FamilyGroup`, `ProfileStatus`) + the new optional fields. No runtime values → no import cycle with the aggregator. |
| `src/lib/profile-select.ts` (**new**) | Pure `selectProfiles(all, showDrafts)` — the review-status gate, unit-testable without Vite env. |
| `src/lib/profile-select.test.ts` (**new**) | Vitest tests for `selectProfiles`. |
| `src/lib/saint-profiles.ts` (**rewrite**) | Aggregator: `import.meta.glob` the per-saint files, apply the gate via `selectProfiles`, export `SAINT_PROFILES` + `ALL_PROFILES`; re-export types for existing importers. |
| `src/lib/profiles/OS-####.ts` (**new ×23**) | One profile per file, `export default`. Migrated from the old literal, each stamped `status: "reviewed"`. |
| `src/lib/saint-profiles.test.ts` (**new**) | Vitest validation of the actual profile files (status enum, sources rule, id↔filename). |
| `scripts/split-profiles.mjs` (**new, one-shot**) | Migration: transpile the old barrel, write per-saint files. Deleted after use. |
| `src/components/SaintProfile.astro` (**modify**) | Render a "Draft — pending review" banner when `status` is not `reviewed`. |
| `build.py` (**modify**) | Add `validate_saint_profiles(valid_ids)` (filename → Saint ID exists) and call it in the validation flow. |
| `tests/test_build.py` (**modify**) | Python unittest for `validate_saint_profiles`. |
| `CLAUDE.md` (**modify**) | Document the per-saint profile storage + draft gate. |

**Decision baked in (refines spec §7):** per-saint files live under **`src/lib/profiles/`**,
not `data/profiles/` — they are TypeScript modules importing the shared type, and `data/` is
Python-owned (CLAUDE.md §2). Aggregation is by **`import.meta.glob`**, which makes the spec's
"generated barrel" automatic (no codegen, no stale-barrel check).

---

## Task 1: Extract profile types (+ new metadata fields)

**Files:**
- Create: `src/lib/profile-types.ts`
- Modify: `src/lib/saint-profiles.ts` (temporarily import types from the new module)

- [ ] **Step 1: Create the types module**

Create `src/lib/profile-types.ts` with the existing interfaces moved out of
`saint-profiles.ts`, plus the spec §6 metadata and the §10.5 optional fields:

```ts
/* Shared types for the rich saint-profile layer. Kept value-free so the
   aggregator (saint-profiles.ts) can import this AND glob the per-saint files
   without an import cycle. */
import type { TimelineEntry, RelatedFigure } from "./ephraim";

/** A headed block of prose — Major Contributions, Legacy, "Why the Great". */
export interface ProfileSection {
  heading: string;
  body: string[]; // one entry per paragraph
}

export interface ProfileWork {
  title: string;
  desc: string;
  date?: string; // optional "Title · Date · Description" column (spec §10.5)
}

export interface ReadingItem {
  title: string;
  author?: string;
  type?: string; // optional "Title · Author · Type" column (spec §10.5)
}

export interface ReadingGroup {
  heading: string;
  items: ReadingItem[];
}

export interface FamilyGroup {
  heading: string;
  intro?: string;
  figures: RelatedFigure[]; // RelatedFigure.note carries the relation
}

/** Review state for a profile (Grounded Generation spec §6). */
export type ProfileStatus = "draft" | "reviewed" | "flagged";

export interface SaintProfile {
  id: string; // must match a row in data/saints.csv
  lifespan?: string;
  overview: string[]; // expanded biography — presence triggers the rich render
  timeline?: TimelineEntry[];
  sections?: ProfileSection[]; // incl. a "Relics & Shrines" section (spec §10.4)
  family?: FamilyGroup;
  related?: RelatedFigure[];
  patronage?: string[];
  works?: ProfileWork[];
  reading?: ReadingGroup[];

  // Authoring / provenance metadata (spec §6). Hand-authored profiles use
  // "reviewed"; the generation pipeline (Plan 2) writes "draft"/"flagged".
  status?: ProfileStatus;
  sources?: string[]; // provenance URLs the dossier drew on
  generated?: string; // ISO date stamp (passed in; never Date.now())
}
```

- [ ] **Step 2: Point the existing barrel at the new types (temporary)**

In `src/lib/saint-profiles.ts`, delete the local `interface ProfileSection { … }`,
`ProfileWork`, `ReadingItem`, `ReadingGroup`, `FamilyGroup`, and `SaintProfile`
declarations (lines ~9–44, the block from `/** A headed block… */` down to the end of
`export interface SaintProfile { … }`). Replace the `import type { TimelineEntry,
RelatedFigure } from "./ephraim";` line with:

```ts
import type { SaintProfile } from "./profile-types";
export * from "./profile-types"; // re-export types for existing importers
```

Leave `export const SAINT_PROFILES: Record<string, SaintProfile> = { … };` (the big
literal) untouched for now — Task 4 replaces it.

- [ ] **Step 3: Verify it still type-checks and builds**

Run: `npm run build`
Expected: build succeeds; `/saint/OS-0021` still renders the Basil profile. (The literal
is unchanged; only the type source moved.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/profile-types.ts src/lib/saint-profiles.ts
git commit -m "refactor(profiles): extract profile types + add status/sources/generated/date/type fields"
```

---

## Task 2: The pure review-status gate

**Files:**
- Create: `src/lib/profile-select.ts`
- Test: `src/lib/profile-select.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/profile-select.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { selectProfiles } from "./profile-select";
import type { SaintProfile } from "./profile-types";

const reviewed: SaintProfile = { id: "OS-0001", overview: ["a"], status: "reviewed" };
const draft: SaintProfile = { id: "OS-0002", overview: ["b"], status: "draft" };
const flagged: SaintProfile = { id: "OS-0003", overview: ["c"], status: "flagged" };
const legacy: SaintProfile = { id: "OS-0004", overview: ["d"] }; // no status

describe("selectProfiles", () => {
  it("in production (showDrafts=false) keeps only reviewed", () => {
    const out = selectProfiles([reviewed, draft, flagged, legacy], false);
    expect(Object.keys(out)).toEqual(["OS-0001"]);
  });

  it("in dev (showDrafts=true) keeps everything, keyed by id", () => {
    const out = selectProfiles([reviewed, draft, flagged, legacy], true);
    expect(Object.keys(out).sort()).toEqual([
      "OS-0001",
      "OS-0002",
      "OS-0003",
      "OS-0004",
    ]);
    expect(out["OS-0002"]).toBe(draft);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run test:unit -- profile-select`
Expected: FAIL — `Cannot find module './profile-select'`.

- [ ] **Step 3: Implement `selectProfiles`**

Create `src/lib/profile-select.ts`:

```ts
import type { SaintProfile } from "./profile-types";

/** Apply the review-status gate (spec §6): in production only `reviewed`
   profiles ship; in dev (or with the show-drafts flag) all profiles load.
   Pure so it can be unit-tested without Vite's import.meta.env. */
export function selectProfiles(
  all: SaintProfile[],
  showDrafts: boolean,
): Record<string, SaintProfile> {
  return Object.fromEntries(
    all
      .filter((p) => showDrafts || p.status === "reviewed")
      .map((p) => [p.id, p]),
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm run test:unit -- profile-select`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-select.ts src/lib/profile-select.test.ts
git commit -m "feat(profiles): pure selectProfiles review-status gate with tests"
```

---

## Task 3: Convert the barrel to a glob aggregator

**Files:**
- Modify: `src/lib/saint-profiles.ts`

This task wires the aggregator BEFORE the per-saint files exist, so add one temporary
placeholder file to prove the glob works, then Task 4 fills in the real 23.

- [ ] **Step 1: Add a temporary placeholder profile file**

Create `src/lib/profiles/OS-0021.ts` (Basil — will be overwritten by the Task 4 migration;
this just proves the glob path):

```ts
import type { SaintProfile } from "../profile-types";

const profile: SaintProfile = {
  id: "OS-0021",
  overview: ["Placeholder — replaced by the Task 4 migration."],
  status: "reviewed",
};

export default profile;
```

- [ ] **Step 2: Rewrite `saint-profiles.ts` as the aggregator**

Replace the entire contents of `src/lib/saint-profiles.ts` with:

```ts
/* Aggregator for the rich saint-profile layer. Each profile lives in its own
   file under ./profiles/OS-####.ts (export default a SaintProfile); Vite's
   import.meta.glob loads them all at build time. The review-status gate
   (selectProfiles) ships only `reviewed` profiles in production and all
   profiles in dev / when PUBLIC_SHOW_DRAFTS=true (Grounded Generation spec §6).
   data/saints.csv stays the finder/facet source of truth; this layer is
   optional editorial content rendered by SaintProfile.astro when present. */
import type { SaintProfile } from "./profile-types";
import { selectProfiles } from "./profile-select";

export * from "./profile-types"; // re-export types for existing importers

const modules = import.meta.glob<{ default: SaintProfile }>("./profiles/*.ts", {
  eager: true,
});

/** Every profile on disk, unfiltered — used by validation tests. */
export const ALL_PROFILES: SaintProfile[] = Object.values(modules).map(
  (m) => m.default,
);

const SHOW_DRAFTS =
  import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_DRAFTS === "true";

/** Profiles visible in the current build, keyed by Saint ID. */
export const SAINT_PROFILES: Record<string, SaintProfile> = selectProfiles(
  ALL_PROFILES,
  SHOW_DRAFTS,
);
```

- [ ] **Step 3: Verify build + existing importers still resolve**

Run: `npm run build`
Expected: build succeeds. `SaintView.astro` and `SaintProfile.astro` (which import
`SAINT_PROFILES` / the `SaintProfile` type from `./saint-profiles`) compile via the
re-export. `/saint/OS-0021` renders the placeholder text (real content lands in Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/lib/saint-profiles.ts src/lib/profiles/OS-0021.ts
git commit -m "feat(profiles): aggregate per-saint profile files via import.meta.glob with status gate"
```

---

## Task 4: Migrate the 23 existing profiles to per-saint files

**Files:**
- Create (one-shot): `scripts/split-profiles.mjs`
- Create: `src/lib/profiles/OS-####.ts` (×23, generated)
- Delete: `scripts/split-profiles.mjs` (after running)

The old literal was committed in history at the parent of Task 1. We transpile that committed
version with esbuild (available transitively via Astro/Vite), read its `SAINT_PROFILES`, and
write one file per profile. Profiles are plain data (no functions), so a runtime object
serializes cleanly to a TS literal.

- [ ] **Step 1: Recover the pre-refactor barrel to a temp file**

Run (gets the literal as it was before Task 1 removed the inline types — any commit before
Task 1 works; use the branch point):

```bash
git show HEAD~3:src/lib/saint-profiles.ts > /tmp/old-saint-profiles.ts
grep -c '": {' /tmp/old-saint-profiles.ts   # sanity: ~23 profile keys
```

(If `HEAD~3` is not the pre-Task-1 barrel, run `git log --oneline -- src/lib/saint-profiles.ts`
and pick the commit just before "extract profile types".)

- [ ] **Step 2: Write the migration script**

Create `scripts/split-profiles.mjs`:

```js
// One-shot: split the old monolithic SAINT_PROFILES literal into per-saint files.
// Run: node scripts/split-profiles.mjs ; then delete this file.
import { build } from "esbuild";
import { writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const OUT_DIR = "src/lib/profiles";
mkdirSync(OUT_DIR, { recursive: true });

// Transpile the recovered TS barrel to ESM JS in-memory (type imports erase).
const result = await build({
  entryPoints: ["/tmp/old-saint-profiles.ts"],
  bundle: false,
  format: "esm",
  write: false,
  loader: { ".ts": "ts" },
});
const code = result.outputFiles[0].text;
const mod = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

const profiles = mod.SAINT_PROFILES;
let n = 0;
for (const [id, profile] of Object.entries(profiles)) {
  const stamped = { ...profile, status: "reviewed" }; // existing = hand-authored
  const body = JSON.stringify(stamped, null, 2);
  const file = `import type { SaintProfile } from "../profile-types";\n\nconst profile: SaintProfile = ${body};\n\nexport default profile;\n`;
  writeFileSync(`${OUT_DIR}/${id}.ts`, file);
  n++;
}
console.log(`wrote ${n} profile files to ${OUT_DIR}/`);
```

- [ ] **Step 3: Run the migration and format the output**

Run:

```bash
node scripts/split-profiles.mjs
npx prettier --write "src/lib/profiles/*.ts"
ls src/lib/profiles | wc -l   # expect 23
```

Expected: 23 files `OS-####.ts`, each `export default` a profile with `status: "reviewed"`.
The Task-3 placeholder `OS-0021.ts` is overwritten with the real Basil profile.

- [ ] **Step 4: Delete the one-shot script and verify**

Run:

```bash
rm scripts/split-profiles.mjs
npm run build
npm run lint
```

Expected: build + lint green. Spot-check `/saint/OS-0021` renders the full Basil profile
(overview, timeline, family, works, reading) exactly as before the migration.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profiles
git commit -m "refactor(profiles): migrate 23 profiles to per-saint files (status: reviewed)"
```

---

## Task 5: Validate the actual profile files (Vitest)

**Files:**
- Create: `src/lib/saint-profiles.test.ts`

- [ ] **Step 1: Write the validation test**

Create `src/lib/saint-profiles.test.ts`. It validates the real per-saint files via the
glob keys (path) so it can check id↔filename agreement without parsing data.json:

```ts
import { describe, it, expect } from "vitest";
import type { SaintProfile } from "./profile-types";

// Glob the raw files WITH their paths so we can check filename ↔ id agreement.
const modules = import.meta.glob<{ default: SaintProfile }>("./profiles/*.ts", {
  eager: true,
});
const entries = Object.entries(modules).map(([path, m]) => ({
  path,
  profile: m.default,
}));

const ID_RE = /^OS-\d{4,}$/;
const STATUSES = new Set(["draft", "reviewed", "flagged"]);

describe("per-saint profile files", () => {
  it("has at least the migrated profiles", () => {
    expect(entries.length).toBeGreaterThanOrEqual(23);
  });

  it("each filename matches its profile id and the OS-#### shape", () => {
    for (const { path, profile } of entries) {
      const stem = path.split("/").pop()!.replace(/\.ts$/, "");
      expect(profile.id, `${path}: id must equal filename`).toBe(stem);
      expect(ID_RE.test(profile.id), `${path}: bad id ${profile.id}`).toBe(true);
    }
  });

  it("each profile has a valid status and a non-empty overview", () => {
    for (const { path, profile } of entries) {
      expect(profile.status, `${path}: missing status`).toBeDefined();
      expect(STATUSES.has(profile.status!), `${path}: bad status`).toBe(true);
      expect(profile.overview.length, `${path}: empty overview`).toBeGreaterThan(0);
    }
  });

  it("draft/flagged profiles cite at least one source (spec §6)", () => {
    for (const { path, profile } of entries) {
      if (profile.status !== "reviewed") {
        expect(
          (profile.sources ?? []).length,
          `${path}: ${profile.status} profile needs sources`,
        ).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `npm run test:unit -- saint-profiles`
Expected: PASS (4 tests) — all 23 migrated profiles are `reviewed` with non-empty overviews
and matching filenames.

- [ ] **Step 3: Commit**

```bash
git add src/lib/saint-profiles.test.ts
git commit -m "test(profiles): validate per-saint files (id↔filename, status, sources rule)"
```

---

## Task 6: Saint-ID existence gate in build.py

**Files:**
- Modify: `build.py` (add `validate_saint_profiles`, a `PROFILES_DIR` constant, and a call in the validation flow)
- Test: `tests/test_build.py`

`build.py` owns the canonical Saint IDs. It can't parse TS, but it can glob the profile
filenames and assert each `OS-####` exists as a saint — a cheap data-integrity gate in the
Python CI job, complementing the Vitest field checks.

- [ ] **Step 1: Write the failing Python test**

`tests/test_build.py` uses `unittest.TestCase` (with `import build` at top). Add a new test
class (ensure `import tempfile`, `from pathlib import Path`, and `from unittest import mock`
are present — add any that are missing):

```python
class ValidateSaintProfilesTests(unittest.TestCase):
    def test_flags_unknown_id(self):
        with tempfile.TemporaryDirectory() as d:
            profiles = Path(d) / "profiles"
            profiles.mkdir()
            (profiles / "OS-0021.ts").write_text("export default {}\n")  # known
            (profiles / "OS-9999.ts").write_text("export default {}\n")  # unknown
            with mock.patch.object(build, "PROFILES_DIR", profiles):
                errors, warnings = build.validate_saint_profiles({"OS-0021"})
            self.assertTrue(any("OS-9999" in e for e in errors))
            self.assertTrue(all("OS-0021" not in e for e in errors))

    def test_clean_when_all_known(self):
        with tempfile.TemporaryDirectory() as d:
            profiles = Path(d) / "profiles"
            profiles.mkdir()
            (profiles / "OS-0021.ts").write_text("export default {}\n")
            with mock.patch.object(build, "PROFILES_DIR", profiles):
                errors, warnings = build.validate_saint_profiles(
                    {"OS-0021", "OS-0022"}
                )
            self.assertEqual(errors, [])

    def test_flags_malformed_filename(self):
        with tempfile.TemporaryDirectory() as d:
            profiles = Path(d) / "profiles"
            profiles.mkdir()
            (profiles / "basil.ts").write_text("export default {}\n")
            with mock.patch.object(build, "PROFILES_DIR", profiles):
                errors, warnings = build.validate_saint_profiles({"OS-0021"})
            self.assertTrue(any("basil.ts" in e for e in errors))
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `python -m unittest tests.test_build -k profiles -v` (or `make test`)
Expected: FAIL — `AttributeError: module 'build' has no attribute 'validate_saint_profiles'`.

- [ ] **Step 3: Implement the validator**

In `build.py`, near the other path constants (where `SAINT_IMAGES_CSV` / `SAINT_QUOTES_CSV`
are defined, ~line 43), add:

`build.py` defines `ROOT = Path(__file__).resolve().parent` and `DATA = ROOT / "data"` but no
`SRC`. Add both lines next to `DATA` (~line 35):

```python
SRC = ROOT / "src"
PROFILES_DIR = SRC / "lib" / "profiles"   # per-saint rich profiles (TS, src-owned)
```

Then, near `validate_saint_images` / `validate_saint_quotes` (~line 581+), add:

```python
PROFILE_FILE_RE = re.compile(r"^(OS-\d{4,})\.ts$")


def validate_saint_profiles(valid_ids: set[str]) -> tuple[list[str], list[str]]:
    """Validate src/lib/profiles/*.ts: each filename is OS-####.ts and names a
    real saint. Field-level checks (status, sources, overview) live in the
    Vitest suite, which parses TS natively. Empty/missing dir is allowed."""
    errors: list[str] = []
    warnings: list[str] = []
    if not PROFILES_DIR.is_dir():
        return errors, warnings
    for path in sorted(PROFILES_DIR.glob("*.ts")):
        m = PROFILE_FILE_RE.match(path.name)
        if not m:
            errors.append(f"profiles/{path.name}: name must be OS-####.ts")
            continue
        sid = m.group(1)
        if sid not in valid_ids:
            errors.append(
                f"profiles/{path.name}: {sid} is not a known Saint ID"
            )
    return errors, warnings
```

- [ ] **Step 4: Call it in the validation flow**

In `build.py` where `validate_saint_quotes` is invoked (~line 298), add directly after it:

```python
    prof_errors, prof_warnings = validate_saint_profiles(_img_valid_ids)
    errors.extend(prof_errors)
    warnings.extend(prof_warnings)
```

(`_img_valid_ids` is the committed-saints ID set already used for the image/quote validators.)

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `python -m unittest tests.test_build -k profiles -v`
Expected: PASS (2 tests).

- [ ] **Step 6: Full validate stays clean**

Run: `make validate`
Expected: CLEAN — the 23 real profile files all name existing saints.

- [ ] **Step 7: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "feat(build): validate_saint_profiles — profile filenames must name real saints"
```

---

## Task 7: Draft-status banner in SaintProfile.astro

**Files:**
- Modify: `src/components/SaintProfile.astro`

In production only `reviewed` profiles reach the page (Task 3 gate), so the banner is visible
only in dev / draft-visible builds — exactly the review affordance from spec §6.

- [ ] **Step 1: Add the banner**

In `src/components/SaintProfile.astro`, the frontmatter already destructures
`const { profile } = Astro.props;`. After it, add:

```ts
const isDraft = profile.status && profile.status !== "reviewed";
```

In the template, as the first child inside the root `<div class="saint-profile">` (before the
`overview` paragraphs), add:

```astro
{
  isDraft && (
    <p class="profile-draft-banner" role="status">
      Draft — pending review. Not yet verified for publication.
    </p>
  )
}
```

In the component's `<style>` block, add:

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

- [ ] **Step 2: Verify it renders only for drafts, in dev**

Run: `npm run dev`, then temporarily edit one file (e.g. set `OS-0021.ts` `status` to
`"draft"`) and load `/saint/OS-0021` — the banner shows. **Revert the status change.** Then
run `npm run build && npm run preview`: with all profiles `reviewed`, no banner appears.

- [ ] **Step 3: Confirm no profile was left in draft**

Run: `git diff --stat src/lib/profiles`
Expected: empty (the temporary status flip was reverted).

- [ ] **Step 4: Commit**

```bash
git add src/components/SaintProfile.astro
git commit -m "feat(profiles): show a draft-pending-review banner for non-reviewed profiles"
```

---

## Task 8: Document the storage model + final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Document the per-saint storage + gate**

In `CLAUDE.md`, in the §11 "Tech stack" area where rich profiles / `saint-profiles.ts` are
described (and the repo layout §2 `src/lib/` line), add a note:

```
- **Rich saint profiles** live one-per-file in `src/lib/profiles/OS-####.ts`
  (`export default` a `SaintProfile`), aggregated by `src/lib/saint-profiles.ts`
  via `import.meta.glob`. Types are in `src/lib/profile-types.ts`. Each profile
  carries `status: draft|reviewed|flagged`; the production build ships only
  `reviewed` (drafts render in dev / when `PUBLIC_SHOW_DRAFTS=true`, behind a
  banner). `build.py` checks each filename names a real saint; Vitest
  (`saint-profiles.test.ts`) checks status/sources/overview.
```

- [ ] **Step 2: Run the full gate suite**

Run, in order:

```bash
make validate          # python: data + profile-filename gate — CLEAN
make test              # python unittest incl. validate_saint_profiles
npm run test:unit      # vitest: selectProfiles + per-saint file validation
npm run lint           # eslint + prettier
npm run build          # astro build (production gate: only reviewed profiles)
npm test               # playwright e2e (existing saint-profile.spec still green)
```

Expected: all green. `/saint/OS-0021` renders Basil identically to before the refactor.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document per-saint profile storage and the reviewed-only production gate"
```

---

## Self-review notes (spec coverage)

- **Spec §6 (status/sources/generated, production gate, dev disclaimer):** Tasks 1 (fields),
  2–3 (gate), 7 (banner). ✅
- **Spec §7 (per-saint files, no monolith; "generated barrel"):** Tasks 3–4, mechanized via
  `import.meta.glob` (refinement noted). ✅
- **Spec §9 (validation, production filtered to reviewed):** Tasks 5 (Vitest fields), 6
  (build.py id gate), 3 (production filter). ✅
- **Spec §10.4 (relics as a `sections` block):** no schema change — supported by the existing
  `sections` field; documented in the `SaintProfile` comment (Task 1). ✅
- **Spec §10.5 (optional `date`/`type`):** Task 1. ✅
- **Out of scope here (Plans 2/3):** the generation pipeline (gather/write/verify/emit,
  tiered fetch, coverage logging) and the review sheet. This plan deliberately ships no
  generated drafts — it makes the system *ready* for them.

## Follow-on plans (to be written next)

- **Plan 2 — Generation pipeline:** dossier gather (in-repo record + tiered fetch), grounded
  write, adversarial verify against the OCA-anchor row, emit `draft`/`flagged` per-saint
  files + additive CSV facet enrichment + propose-only PD quote/image rows, coverage logging
  (spec §3–§5, §8).
- **Plan 3 — Review sheet:** Markdown PR job-summary + `dist/profile_review_<batch>.html`
  artifact surfacing prose, verifier flags, coverage verdict, and per-claim sources
  (spec §13).
