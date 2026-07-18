#!/usr/bin/env bash
#
# Apply the Cloudflare cache rules for orthodoxsaintfinder.com.
#
# Idempotent: this PUTs the *entire* http_request_cache_settings phase entrypoint
# from cache-rules.json, so re-running it always converges the zone to exactly the
# rules in that file. It is the source of truth for the zone's Cache Rules — any
# cache rules created by hand in the dashboard will be overwritten. Edit the JSON,
# re-run this, done.
#
# Usage:
#   CF_API_TOKEN=... ZONE_ID=... ./apply.sh
#
# Requirements:
#   - curl, python3 (both standard on dev machines / CI)
#   - CF_API_TOKEN: a Cloudflare API token scoped to this zone with
#       "Cache Rules: Edit"  (to write the ruleset)
#     Create at: https://dash.cloudflare.com/profile/api-tokens
#   - ZONE_ID: the zone id, from the domain's Overview page in the Cloudflare
#     dashboard (right column, "API" section).
set -euo pipefail

: "${CF_API_TOKEN:?set CF_API_TOKEN (Cloudflare API token with 'Cache Rules: Edit')}"
: "${ZONE_ID:?set ZONE_ID (Cloudflare zone id for orthodoxsaintfinder.com)}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_FILE="$DIR/cache-rules.json"
[ -f "$RULES_FILE" ] || { echo "error: $RULES_FILE not found" >&2; exit 1; }

# Fail early on malformed JSON rather than sending garbage to the API.
python3 -m json.tool "$RULES_FILE" >/dev/null || { echo "error: $RULES_FILE is not valid JSON" >&2; exit 1; }

echo "Applying $(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["rules"]))' "$RULES_FILE") cache rule(s) to zone ${ZONE_ID}..."

resp="$(curl -sS -X PUT \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/phases/http_request_cache_settings/entrypoint" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data @"$RULES_FILE")"

# Pretty-print, then exit non-zero if the API reported failure.
echo "$resp" | python3 -m json.tool || { echo "$resp"; }
echo "$resp" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if d.get("success"):
    rules = d.get("result", {}).get("rules", [])
    print(f"\n✓ Applied. Zone now has {len(rules)} active cache rule(s).")
    sys.exit(0)
print("\n✗ Failed:", d.get("errors"), file=sys.stderr)
sys.exit(1)
'
