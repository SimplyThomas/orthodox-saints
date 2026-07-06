export const meta = {
  name: "feastgen",
  description:
    "Grounded feast-profile generation: gather → write → verify → emit",
  phases: [
    {
      title: "Gather",
      detail: "fetch sources into a cited dossier (retry once if thin)",
      model: "sonnet",
    },
    {
      title: "Write",
      detail: "original encyclopedic feast profile (history + meaning first)",
      model: "opus",
    },
    {
      title: "Verify",
      detail: "adversarial check vs the feasts.csv anchor row",
      model: "sonnet",
    },
    {
      title: "Emit",
      detail: "write verbatim artifacts + run pinned bookkeeping",
      model: "haiku",
    },
  ],
};

// Mirrors tools/feastgen/dossier.py — strict, parseable JSON so the Emit stage
// can derive `sources` + the coverage row deterministically.
const DOSSIER_SCHEMA_JSON = {
  type: "object",
  required: ["id", "name", "anchor", "external"],
  properties: {
    id: { type: "string", pattern: "^FF-\\d{4,}$" },
    name: { type: "string" },
    anchor: {
      type: "object",
      required: ["sources"],
      properties: {
        brief: { type: "string" },
        notes: { type: "string" },
        customs: { type: "string" },
        fastingNotes: { type: "string" },
        context: { type: "object" },
        relatedSaints: { type: "array", items: { type: "string" } },
        sources: { type: "array", items: { type: "string" } },
      },
    },
    external: {
      type: "array",
      items: {
        type: "object",
        required: ["text", "source"],
        properties: {
          text: { type: "string" },
          source: { type: "string" },
        },
      },
    },
  },
};

// The `feasts` content-collection shape (src/content.config.ts). `history` and
// `meaning` are the two priority fields — the reason this database exists.
const PROFILE_SCHEMA_JSON = {
  type: "object",
  required: ["id", "overview", "sources"],
  properties: {
    id: { type: "string", pattern: "^FF-\\d{4,}$" },
    // Copied from the dossier (anchor.sources + each external source). Generated
    // profiles MUST cite >=1 source or `npm run build` fails (Zod gate).
    sources: { type: "array", items: { type: "string" } },
    overview: { type: "array", items: { type: "string" }, minItems: 1 },
    history: { type: "array", items: { type: "string" } },
    meaning: { type: "array", items: { type: "string" } },
    timeline: {
      type: "array",
      items: {
        type: "object",
        required: ["when", "title", "body"],
        properties: {
          when: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
        },
      },
    },
    scripture: {
      type: "array",
      items: {
        type: "object",
        required: ["ref"],
        properties: {
          ref: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    iconography: { type: "array", items: { type: "string" } },
    hymnography: { type: "array", items: { type: "string" } },
    fastingPractice: { type: "array", items: { type: "string" } },
    customs: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        required: ["heading", "body"],
        properties: {
          heading: { type: "string" },
          body: { type: "array", items: { type: "string" } },
        },
      },
    },
    // Declared explicitly so the StructuredOutput layer rejects the stringified-
    // array drift seen in the 2026-07-05 bulk run (43/83 profiles emitted
    // `related` as a JSON-encoded STRING; undeclared fields pass through
    // unvalidated and only fail later at the Astro/Zod gate).
    related: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "note"],
        properties: {
          name: { type: "string" },
          note: { type: "string" },
          href: { type: "string" },
        },
      },
    },
  },
};

const VERDICT_SCHEMA_JSON = {
  type: "object",
  required: ["status", "claims"],
  properties: {
    status: { enum: ["pass", "flagged"] },
    claims: {
      type: "array",
      items: {
        type: "object",
        required: ["claim", "quote", "supported", "reason"],
        properties: {
          claim: { type: "string" },
          // Verbatim span of the PROFILE the claim judges; emit_one discards a
          // flag whose quote isn't found in the profile (phantom-flag guard).
          quote: { type: "string" },
          supported: { type: "boolean" },
          reason: { type: "string" },
        },
      },
    },
  },
};

// Feast IDs (from `make feast-batch`). Accept an array, an object {ids, date},
// a JSON-encoded string of EITHER (the harness sometimes stringifies args), or a
// whitespace/comma-separated string. Parse a JSON string FIRST so a stringified
// {ids,date} object isn't naively split into garbage tokens.
let ids = args;
let GENERATED = "2026-07-05"; // batch date; pass args.date to override per run.
if (typeof ids === "string") {
  const s = ids.trim();
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      ids = JSON.parse(s);
    } catch {
      /* not JSON — fall through to the delimited-string parse below */
    }
  }
}
if (ids && typeof ids === "object" && !Array.isArray(ids)) {
  if (ids.date) GENERATED = ids.date;
  ids = ids.ids;
}
if (typeof ids === "string") {
  ids = ids
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
}
if (!Array.isArray(ids)) {
  throw new Error(
    `feastgen: expected an array of Feast IDs, got ${typeof args}: ${JSON.stringify(args)}`,
  );
}
// Fail loudly on malformed IDs rather than letting a downstream agent "recover"
// a garbage token into a fabricated feast (profilegen calibration lesson).
const malformed = ids.filter((id) => !/^FF-\d{4,}$/.test(id));
if (malformed.length) {
  throw new Error(
    `feastgen: malformed Feast IDs (expected FF-####): ${JSON.stringify(malformed)}`,
  );
}

const SCRATCH = "dist/feastgen/scratch";

// Dossier richness helpers — mirror tools/feastgen/emit_one.py (dossier_chars /
// coverage_verdict): a "full" dossier has >=2 distinct external sources AND
// >=1500 total chars. Used to decide whether Gather needs a second pass.
function dossierChars(d) {
  const a = (d && d.anchor) || {};
  let n = ["brief", "notes", "customs", "fastingNotes"].reduce(
    (s, k) => s + (a[k] || "").length,
    0,
  );
  for (const e of (d && d.external) || []) n += ((e && e.text) || "").length;
  return n;
}
function distinctExternalSources(d) {
  return new Set(
    ((d && d.external) || [])
      .map((e) => ((e && e.source) || "").trim())
      .filter(Boolean),
  ).size;
}
function isFullDossier(d) {
  return distinctExternalSources(d) >= 2 && dossierChars(d) >= 1500;
}

// One independent gather→write→verify→emit chain per feast. A per-item chain
// (not a shared pipeline) keeps the dossier in closure so the Emit stage can hand
// it to the deterministic bookkeeping helper.
async function generate(id) {
  // Gather (Sonnet): seed from the feasts.csv row, then fetch external sources.
  let dossier = await agent(
    `Read tools/feastgen/prompts/gather.md. Seed the dossier with:\n` +
      `  python -m tools.feastgen.dossier ${id}\n` +
      `Then fetch external sources per the tiers and return the completed dossier ` +
      `as strict JSON (DOSSIER_SCHEMA).`,
    {
      label: `gather:${id}`,
      phase: "Gather",
      model: "sonnet",
      schema: DOSSIER_SCHEMA_JSON,
    },
  );
  if (!dossier) return null;

  // Retry Gather ONCE if the dossier wouldn't earn a "full" rating — push for
  // extraction depth. Keep the richer of the two; one retry only.
  if (!isFullDossier(dossier)) {
    const retry = await agent(
      `Read tools/feastgen/prompts/gather.md. Your previous dossier for ${id} was ` +
        `too THIN — ${dossierChars(dossier)} chars across ` +
        `${distinctExternalSources(dossier)} external source(s). Re-fetch the FULL ` +
        `article bodies (NOT just the lead) and extract far more factual material per ` +
        `the fact checklist (event, historical development, theology, services, ` +
        `iconography, customs, fasting); aim for >=2 substantial sources and >=1500 ` +
        `total chars. Return the enriched dossier as strict JSON (DOSSIER_SCHEMA). ` +
        `Previous thin dossier for reference:\n${JSON.stringify(dossier)}`,
      {
        label: `gather-retry:${id}`,
        phase: "Gather",
        model: "sonnet",
        schema: DOSSIER_SCHEMA_JSON,
      },
    );
    if (retry && dossierChars(retry) > dossierChars(dossier)) dossier = retry;
  }

  // Write (Opus): produce the FeastProfile JSON, populating `sources`.
  const profile = await agent(
    `Read tools/feastgen/prompts/write.md. Using ONLY this dossier, write the ` +
      `feast profile (PROFILE schema; history and meaning are the priority ` +
      `fields; copy sources from the dossier's anchor.sources + each external ` +
      `source):\n${JSON.stringify(dossier)}`,
    {
      label: `write:${id}`,
      phase: "Write",
      model: "opus",
      schema: PROFILE_SCHEMA_JSON,
    },
  );
  if (!profile) return null;

  // Verify (Sonnet): adversarial check vs the anchor.
  const verdict = await agent(
    `Read tools/feastgen/prompts/verify.md. Verify this feast profile against ` +
      `its dossier/anchor and return {status, claims}:\n` +
      `dossier: ${JSON.stringify(dossier)}\nprofile: ${JSON.stringify(profile)}`,
    {
      label: `verify:${id}`,
      phase: "Verify",
      model: "sonnet",
      schema: VERDICT_SCHEMA_JSON,
    },
  );
  if (!verdict) return null;

  const status = verdict.status === "pass" ? "draft" : "flagged";

  // Emit (Haiku): the agent ONLY writes the three upstream artifacts verbatim and
  // runs ONE pinned command — no freelanced filenames, row schemas, or JSON. All
  // bookkeeping (YAML emit, dossier-derived sources, pinned coverage CSV, verbatim
  // verdict log, phantom-flag reconciliation) is owned by tools/feastgen/emit_one.py.
  await agent(
    `Emit the feast profile for ${id} (status "${status}"). Do EXACTLY these ` +
      `steps, nothing more — do not hand-write any CSV/JSON bookkeeping:\n` +
      `1. Write this JSON VERBATIM to ${SCRATCH}/${id}.profile.json:\n` +
      `${JSON.stringify(profile, null, 2)}\n` +
      `2. Write this JSON VERBATIM to ${SCRATCH}/${id}.verdict.json:\n` +
      `${JSON.stringify(verdict, null, 2)}\n` +
      `3. Write this JSON VERBATIM to ${SCRATCH}/${id}.dossier.json:\n` +
      `${JSON.stringify(dossier, null, 2)}\n` +
      `4. Run this one command (it writes the YAML, the pinned coverage row, and ` +
      `the verbatim verdict — all to canonical paths):\n` +
      `   python -m tools.feastgen.emit_one --id ${id} --date ${GENERATED} ` +
      `--status ${status} --profile-file ${SCRATCH}/${id}.profile.json ` +
      `--verdict-file ${SCRATCH}/${id}.verdict.json ` +
      `--dossier-file ${SCRATCH}/${id}.dossier.json\n` +
      `5. prettier --write src/content/feasts/${id}.yaml\n` +
      `Report the emit_one stdout line.`,
    { label: `emit:${id}`, phase: "Emit", model: "haiku" },
  );
  return { id, status };
}

const results = (await parallel(ids.map((id) => () => generate(id)))).filter(
  Boolean,
);

log(
  `Generated ${results.length}/${ids.length} feast profiles ` +
    `(coverage: dist/feastgen_${GENERATED}.csv, ` +
    `verdicts: dist/feastgen_${GENERATED}_verdicts.json).`,
);
return results;
