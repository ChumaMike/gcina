#!/usr/bin/env bash
# Copies the Xero app's client id and secret from web/.env.xero.local to the gcina Vercel project
# (Production) and to web/.env.local for local runs. Run by the owner, not by an assistant.
# Values are piped, never printed.
set -euo pipefail
cd "$(dirname "$0")/.."
V="npx vercel --global-config C:/Users/HomePC/.vercel-gcina --scope chumamikes-projects"
[ -f .env.xero.local ] || { echo "web/.env.xero.local is missing."; exit 1; }
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"
  case "$line" in ''|\#*) continue ;; esac
  name="${line%%=*}"; value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"
  case "$name" in XERO_CLIENT_ID|XERO_CLIENT_SECRET|XERO_SCOPES) ;; *) continue ;; esac
  [ -z "$value" ] && { echo "skip  $name (empty)"; continue; }
  if printf '%s' "$value" | $V env add "$name" production --force >/dev/null 2>&1; then echo "added $name (Vercel)"; else echo "FAILED $name (Vercel)"; fi
  grep -v "^$name=" .env.local > .env.local.tmp || true
  printf '%s=%s\n' "$name" "$value" >> .env.local.tmp
  mv .env.local.tmp .env.local
  echo "added $name (local)"
done < .env.xero.local
echo "Done."
