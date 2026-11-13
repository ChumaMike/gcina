// Hosted agent (Vercel). The dashboard pokes POST /run when a bill arrives or the owner approves;
// the agent then does exactly what `pnpm agent watch` does on a laptop. It is its own deployment,
// with only the agent's token and the agent's signing key: never the operator's or the policy's.
import type { IncomingMessage, ServerResponse } from "node:http";
import { env } from "../src/env.ts";
import { policy } from "../src/policy.ts";
import { tick } from "../src/tick.ts";
import { closeLedger } from "../src/xrpl.ts";

const BUDGET_MS = 50_000; // stay inside the 60 s function limit
let running: Promise<void> | null = null;
let again = false;

async function work(): Promise<void> {
  const started = Date.now();
  try {
    const health = await policy.health();
    if (health.agentAccount !== env.agentAccount) throw new Error("The policy service guards a different account from this agent's.");
    // Keep going while there is work, and look once more if a poke arrived meanwhile.
    for (let quiet = 0; quiet < 2 && Date.now() - started < BUDGET_MS; ) {
      again = false;
      const did = await tick();
      if (did || again) quiet = 0;
      else {
        quiet++;
        if (quiet < 2) await new Promise((r) => setTimeout(r, 1500));
      }
    }
  } finally {
    await closeLedger().catch(() => undefined);
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const path = (req.url ?? "/").split("?")[0];
  const send = (code: number, body: unknown) => {
    res.statusCode = code;
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify(body));
  };
  if (req.method === "GET" && (path === "/" || path === "/health")) {
    return send(200, { ok: true, service: "gcina-agent", mode: env.mode, busy: running !== null, agentAccount: env.agentAccount, policy: env.policyUrl });
  }
  if (req.method === "POST" && path === "/run") {
    if (running) {
      again = true;
      return send(202, { ok: true, status: "already working; will look again" });
    }
    running = work();
    try {
      await running;
      return send(200, { ok: true, status: "done" });
    } catch (e) {
      console.error(e);
      return send(500, { ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      running = null;
    }
  }
  return send(404, { error: "Not found." });
}
