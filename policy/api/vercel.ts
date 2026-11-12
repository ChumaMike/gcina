// Vercel entry for the policy service. Bundled by scripts/build-vercel.mjs into a single
// Node function (Build Output API); state lives in Postgres (DATABASE_URL).
import { getRequestListener } from "@hono/node-server";
import { createApp } from "../src/app.ts";
import { depsFromEnv } from "../src/config.ts";

const app = createApp(depsFromEnv());
export default getRequestListener(app.fetch);
