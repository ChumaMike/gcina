// Hosted agent (Vercel). The dashboard pokes POST /run when a bill arrives or the owner approves;
// the agent then does exactly what `pnpm agent watch` does on a laptop. It is its own deployment,
// with only the agent's token and the agent's signing key: never the operator's or the policy's.
import type { IncomingMessage, ServerResponse } from "node:http";
import { env } from "../src/env.ts";
import { policy } from "../src/policy.ts";
import { tick } from "../src/tick.ts";
import { DOCUMENT_TYPES, transcribe, type DocumentType } from "../src/transcribe.ts";
import { createHash, timingSafeEqual } from "node:crypto";
import { closeLedger } from "../src/xrpl.ts";

const BUDGET_MS = 50_000; // stay inside the 60 s function limit
const MAX_BODY = 4_400_000; // Vercel's request limit is 4.5 MB
let running: Promise<void> | null = null;

// Shared secret with the dashboard. A wake-up carries no authority, so /run only enforces it once
// it is configured; /read-document spends model credit, so it is closed until the secret exists.
const WAKE_SECRET = (process.env.AGENT_WAKE_SECRET ?? "").trim();
const sha = (s: string) => createHash("sha256").update(s).digest();
function hasSecret(req: IncomingMessage): boolean {
  const got = req.headers["x-gcina-wake"];
  return WAKE_SECRET.length >= 16 && typeof got === "string" && timingSafeEqual(sha(got), sha(WAKE_SECRET));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) throw new Error("too large");
    chunks.push(c as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
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
    return send(200, { ok: true, service: "gcina-agent", mode: env.mode, busy: running !== null, locked: WAKE_SECRET.length >= 16, agentAccount: env.agentAccount, policy: env.policyUrl });
  }
  if (req.method === "POST" && path === "/read-document") {
    if (!hasSecret(req)) return send(WAKE_SECRET ? 401 : 503, { error: "Reading documents isn't switched on." });
    let b: { mediaType?: unknown; data?: unknown };
    try {
      b = (await readJson(req)) as typeof b;
    } catch {
      return send(400, { error: "Send JSON { mediaType, data } under 4 MB." });
    }
    if (typeof b.data !== "string" || !b.data || !DOCUMENT_TYPES.includes(b.mediaType as DocumentType) || !/^[A-Za-z0-9+/=]+$/.test(b.data)) {
      return send(400, { error: "Send a JPEG, PNG, WebP or PDF." });
    }
    try {
      return send(200, { text: await transcribe(b.mediaType as DocumentType, b.data) });
    } catch (e) {
      return send(422, { error: e instanceof Error ? e.message : "Couldn't read that document." });
    }
  }
  if (req.method === "POST" && path === "/run") {
    if (WAKE_SECRET && !hasSecret(req)) return send(401, { error: "Not allowed." });
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
