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
      detail: "write draft/flagged file + proposals",
      model: "haiku",
    },
  ],
};

const PROFILE_SCHEMA_JSON = {
  type: "object",
  required: ["id", "overview"],
  properties: {
    id: { type: "string", pattern: "^OS-\\d{4,}$" },
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

const ids = args; // array of Saint IDs (from `make profile-batch`)
const GENERATED = "PASS_THE_DATE_IN"; // set by the caller; scripts can't read the clock

const results = await pipeline(
  ids,
  // Gather (Haiku): seed from the record, then fetch external sources.
  (id) =>
    agent(
      `Read tools/profilegen/prompts/gather.md. Seed the dossier with:\n` +
        `  python -m tools.profilegen.dossier ${id}\n` +
        `Then fetch external sources per the tiers and return the completed dossier JSON.`,
      { label: `gather:${id}`, phase: "Gather", model: "haiku" },
    ),

  // Write (Opus): produce the SaintProfile JSON.
  (dossier, id) =>
    agent(
      `Read tools/profilegen/prompts/write.md and tools/profilegen/schemas.py ` +
        `(PROFILE_SCHEMA). Using ONLY this dossier, write the profile:\n${dossier}`,
      {
        label: `write:${id}`,
        phase: "Write",
        model: "opus",
        schema: PROFILE_SCHEMA_JSON,
      },
    ),

  // Verify (Sonnet): adversarial check.
  (profile, id) =>
    agent(
      `Read tools/profilegen/prompts/verify.md. Verify this profile against its ` +
        `dossier/anchor and return {status, claims}:\n${JSON.stringify(profile)}`,
      {
        label: `verify:${id}`,
        phase: "Verify",
        model: "sonnet",
        schema: VERDICT_SCHEMA_JSON,
      },
    ).then((verdict) => ({ id, profile, verdict })),

  // Emit (Haiku/code): write the file + log coverage + proposals.
  ({ id, profile, verdict }) =>
    agent(
      `Write the profile for ${id}. Status is "${verdict.status === "pass" ? "draft" : "flagged"}". Run:\n` +
        `  python -c "from pathlib import Path; from tools.profilegen import emit; ` +
        `emit.write_profile(Path('src/content/profiles'), ${JSON.stringify(profile)}, ` +
        `sources=${JSON.stringify(profile.sources || [])}, generated='${GENERATED}', ` +
        `status='${verdict.status === "pass" ? "draft" : "flagged"}')"\n` +
        `Then prettier --write the file; append a coverage row (tools.profilegen.coverage) ` +
        `and any PD-gated quote/image proposals (tools.profilegen.proposals) to dist/; and ` +
        `append this saint's verdict {id, status, claims} to ` +
        `dist/profilegen_${GENERATED}_verdicts.json (a JSON array — Plan 3 reads it).`,
      { label: `emit:${id}`, phase: "Emit", model: "haiku" },
    ),
);

log(`Generated ${results.filter(Boolean).length}/${ids.length} profiles.`);
return results.filter(Boolean);
