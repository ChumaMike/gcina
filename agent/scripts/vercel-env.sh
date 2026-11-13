#!/usr/bin/env bash
# Copies the agent's settings from agent/.env to the gcina-agent Vercel project (Production).
# Run by the owner, not by an assistant. Values are piped, never printed.
set -euo pipefail
cd "$(dirname "$0")/.."
V="npx vercel --global-config C:/Users/HomePC/.vercel-gcina --scope chumamikes-projects"
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"
  case "$line" in ''|\#*) continue ;; esac
  name="${line%%=*}"; value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"
  [ -z "$value" ] && { echo "skip  $name (empty)"; continue; }
  if printf '%s' "$value" | $V env add "$name" production --force >/dev/null 2>&1; then echo "added $name"; else echo "FAILED $name"; fi
done < .env
echo "Done."
