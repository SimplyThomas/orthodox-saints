"""JSON Schemas for the Write output (a SaintProfile) and the Verify verdict.
Exposed as JSON so the Workflow can pass them to agent({schema})."""
import json

PROFILE_SCHEMA = {
    "type": "object",
    "required": ["id", "overview"],
    "properties": {
        "id": {"type": "string", "pattern": r"^OS-\d{4,}$"},
        # The source URLs/citations backing the profile — copied from the dossier
        # (anchor.sources + each external source). Generated profiles MUST cite at
        # least one (Zod gate in src/content.config.ts), else the build fails.
        "sources": {"type": "array", "items": {"type": "string"}},
        "lifespan": {"type": "string"},
        "overview": {"type": "array", "items": {"type": "string"}, "minItems": 1},
        "timeline": {"type": "array", "items": {
            "type": "object", "required": ["when", "title", "body"],
            "properties": {"when": {"type": "string"}, "title": {"type": "string"},
                           "body": {"type": "string"}}}},
        "sections": {"type": "array", "items": {
            "type": "object", "required": ["heading", "body"],
            "properties": {"heading": {"type": "string"},
                           "body": {"type": "array", "items": {"type": "string"}}}}},
        "patronage": {"type": "array", "items": {"type": "string"}},
        # family/related/works/reading omitted here for brevity — add as needed,
        # matching the Zod schema in src/content.config.ts exactly.
    },
}

DOSSIER_SCHEMA = {
    "type": "object",
    "required": ["id", "name", "anchor", "external"],
    "properties": {
        "id": {"type": "string", "pattern": r"^OS-\d{4,}$"},
        "name": {"type": "string"},
        "anchor": {
            "type": "object",
            "required": ["sources"],
            "properties": {
                "brief": {"type": "string"},
                "notes": {"type": "string"},
                "customs": {"type": "string"},
                "context": {"type": "object"},
                "sources": {"type": "array", "items": {"type": "string"}},
            },
        },
        # Gather appends external extracts here — each MUST record its source URL
        # so the profile's sources and coverage verdict are verifiable.
        "external": {"type": "array", "items": {
            "type": "object",
            "required": ["text", "source"],
            "properties": {"text": {"type": "string"},
                           "source": {"type": "string"}}}},
    },
}

VERDICT_SCHEMA = {
    "type": "object",
    "required": ["status", "claims"],
    "properties": {
        "status": {"enum": ["pass", "flagged"]},
        "claims": {"type": "array", "items": {
            "type": "object",
            "required": ["claim", "supported", "reason"],
            "properties": {"claim": {"type": "string"},
                           "supported": {"type": "boolean"},
                           "reason": {"type": "string"}}}},
    },
}

if __name__ == "__main__":
    print(json.dumps({"profile": PROFILE_SCHEMA, "verdict": VERDICT_SCHEMA,
                      "dossier": DOSSIER_SCHEMA}))
