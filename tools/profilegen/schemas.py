"""JSON Schemas for the Write output (a SaintProfile) and the Verify verdict.
Exposed as JSON so the Workflow can pass them to agent({schema})."""
import json

PROFILE_SCHEMA = {
    "type": "object",
    "required": ["id", "overview"],
    "properties": {
        "id": {"type": "string", "pattern": r"^OS-\d{4,}$"},
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
    print(json.dumps({"profile": PROFILE_SCHEMA, "verdict": VERDICT_SCHEMA}))
