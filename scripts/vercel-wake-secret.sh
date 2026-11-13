#!/usr/bin/env bash
# Makes one random shared secret and sets it as AGENT_WAKE_SECRET on both the gcina (web) and
# gcina-agent Vercel projects (Production). After the next deploy of each, only the dashboard can
# wake the agent or ask it to read a photo of a bill. Run by the owner. The value is never printed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
V="npx vercel --global-config C:/Users/HomePC/.vercel-gcina --scope chumamikes-projects"
SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
for dir in web agent; do
  cd "$ROOT/$dir"
  if printf '%s' "$SECRET" | $V env add AGENT_WAKE_SECRET production --force >/dev/null 2>&1; then echo "added AGENT_WAKE_SECRET ($dir)"; else echo "FAILED AGENT_WAKE_SECRET ($dir)"; fi
done
echo "Done. Tell Claude to redeploy web and agent."
