// Local server: pnpm dev  (http://localhost:8787)
import { resolve } from "node:path";
import { config } from "dotenv";
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { depsFromEnv } from "./config.ts";

config({ path: resolve(import.meta.dirname, "..", ".env"), quiet: true });

const deps = depsFromEnv();
const port = Number(process.env.PORT ?? 8787);
serve({ fetch: createApp(deps).fetch, port }, () => {
  console.log(`[policy] listening on http://localhost:${port} · ${deps.currency} · agent account ${deps.addresses.agentAccount}`);
});
