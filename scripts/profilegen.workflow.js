export const meta = {
  name: "profilegen",
  description:
    "Grounded saint-profile generation: gather → write → verify → emit",
  phases: [
    {
      title: "Gather",
      detail: "fetch sources into a cited dossier",
      model: "haiku",
    },
    { title: "Write", detail: "original encyclopedic profile", model: "opus" },
    {
      title: "Verify",
      detail: "adversarial check vs the anchor row",
      model: "sonnet",
    },
    {
      title: "Emit",
      detail: "write verbatim artifacts + run pinned bookkeeping",
      model: "haiku",
    },
  ],
};

// Mirrors tools/profilegen/schemas.py DOSSIER_SCHEMA — strict, parseable JSON so
// the Emit stage can derive `sources` + the coverage row deterministically.
const DOSSIER_SCHEMA_JSON = {
  type: "object",
  required: ["id", "name", "anchor", "external"],
  properties: {
    id: { type: "string", pattern: "^OS-\\d{4,}$" },
    name: { type: "string" },
    anchor: {
      type: "object",
      required: ["sources"],
      properties: {
        brief: { type: "string" },
        notes: { type: "string" },
        customs: { type: "string" },
        context: { type: "object" },
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

const PROFILE_SCHEMA_JSON = {
  type: "object",
  required: ["id", "overview", "sources"],
  properties: {
    id: { type: "string", pattern: "^OS-\\d{4,}$" },
    // Copied from the dossier (anchor.sources + each external source). Generated
    // profiles MUST cite >=1 source or `npm run build` fails (Zod gate).
    sources: { type: "array", items: { type: "string" } },
    lifespan: { type: "string" },
    overview: { type: "array", items: { type: "string" }, minItems: 1 },
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
    patronage: { type: "array", items: { type: "string" } },
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
        required: ["claim", "supported", "reason"],
        properties: {
          claim: { type: "string" },
          supported: { type: "boolean" },
          reason: { type: "string" },
        },
      },
    },
  },
};

// Saint IDs (from `make profile-batch`). Accept an array, an object {ids, date},
// a JSON-encoded string of EITHER (the harness sometimes stringifies args), or a
// whitespace/comma-separated string. Parse a JSON string FIRST so a stringified
// {ids,date} object isn't naively split into garbage tokens (calibration batch 2).
let ids = args;
let GENERATED = "2026-06-17"; // batch date; pass args.date to override per run.
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
    `profilegen: expected an array of Saint IDs, got ${typeof args}: ${JSON.stringify(args)}`,
  );
}
// Fail loudly on malformed IDs rather than letting a downstream agent "recover"
// a garbage token into a fabricated saint (calibration batch 2: a mangled token
// was improvised into OS-0511, an unrequested real saint).
const malformed = ids.filter((id) => !/^OS-\d{4,}$/.test(id));
if (malformed.length) {
  throw new Error(
    `profilegen: malformed Saint IDs (expected OS-####): ${JSON.stringify(malformed)}`,
  );
}

const SCRATCH = "dist/profilegen/scratch";

// One independent gather→write→verify→emit chain per saint. A per-item chain
// (not a shared pipeline) keeps the dossier in closure so the Emit stage can hand
// it to the deterministic bookkeeping helper.
async function generate(id) {
  // Gather (Haiku): seed from the record, then fetch external sources.
  const dossier = await agent(
    `Read tools/profilegen/prompts/gather.md. Seed the dossier with:\n` +
      `  python -m tools.profilegen.dossier ${id}\n` +
      `Then fetch external sources per the tiers and return the completed dossier ` +
      `as strict JSON (DOSSIER_SCHEMA).`,
    {
      label: `gather:${id}`,
      phase: "Gather",
      model: "haiku",
      schema: DOSSIER_SCHEMA_JSON,
    },
  );
  if (!dossier) return null;

  // Write (Opus): produce the SaintProfile JSON, populating `sources`.
  const profile = await agent(
    `Read tools/profilegen/prompts/write.md and tools/profilegen/schemas.py ` +
      `(PROFILE_SCHEMA). Using ONLY this dossier, write the profile (copy ` +
      `sources from the dossier's anchor.sources + each external source):\n` +
      `${JSON.stringify(dossier)}`,
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
    `Read tools/profilegen/prompts/verify.md. Verify this profile against its ` +
      `dossier/anchor and return {status, claims}:\n` +
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
  // verdict log) is owned by tools/profilegen/emit_one.py.
  await agent(
    `Emit the profile for ${id} (status "${status}"). Do EXACTLY these steps, ` +
      `nothing more — do not hand-write any CSV/JSON bookkeeping:\n` +
      `1. Write this JSON VERBATIM to ${SCRATCH}/${id}.profile.json:\n` +
      `${JSON.stringify(profile, null, 2)}\n` +
      `2. Write this JSON VERBATIM to ${SCRATCH}/${id}.verdict.json:\n` +
      `${JSON.stringify(verdict, null, 2)}\n` +
      `3. Write this JSON VERBATIM to ${SCRATCH}/${id}.dossier.json:\n` +
      `${JSON.stringify(dossier, null, 2)}\n` +
      `4. Run this one command (it writes the YAML, the pinned coverage row, and ` +
      `the verbatim verdict — all to canonical paths):\n` +
      `   python -m tools.profilegen.emit_one --id ${id} --date ${GENERATED} ` +
      `--status ${status} --profile-file ${SCRATCH}/${id}.profile.json ` +
      `--verdict-file ${SCRATCH}/${id}.verdict.json ` +
      `--dossier-file ${SCRATCH}/${id}.dossier.json\n` +
      `5. prettier --write src/content/profiles/${id}.yaml\n` +
      `Report the emit_one stdout line.`,
    { label: `emit:${id}`, phase: "Emit", model: "haiku" },
  );
  return { id, status };
}

const results = (await parallel(ids.map((id) => () => generate(id)))).filter(
  Boolean,
);

log(
  `Generated ${results.length}/${ids.length} profiles ` +
    `(coverage: dist/profilegen_${GENERATED}.csv, ` +
    `verdicts: dist/profilegen_${GENERATED}_verdicts.json).`,
);
return results;
