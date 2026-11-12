// Plays the business's EMAIL INBOX, not the agent: it drops a fixture in as "an invoice arrived".
// It needs the OPERATOR token, so it reads agent/.env.operator-sim (gitignored), never agent/.env.
// The agent process itself never holds the operator token (src/env.ts refuses to start if it does).
//   pnpm inbox inv-001            post one fixture
//   pnpm inbox inv-001 inv-002    post several, in order
//   pnpm inbox reset              demo reset on the policy service (POST /admin/reset)
//   pnpm inbox approve:inv-003    rehearsal stand-in for the OWNER tapping Approve on the dashboard
//   pnpm inbox reject:inv-002     … or Reject (recorded as decidedBy "owner (rehearsal)")
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

const AGENT_DIR = resolve(import.meta.dirname, "..");
const simPath = resolve(AGENT_DIR, ".env.operator-sim");
if (!existsSync(simPath)) {
  console.error("Missing agent/.env.operator-sim. Create it with one line: OPERATOR_TOKEN=<the operator token from policy/.env>");
  process.exit(1);
}
const simEnv = parse(readFileSync(simPath));
const agentEnv = parse(readFileSync(resolve(AGENT_DIR, ".env")));
const URL = (process.env.POLICY_URL ?? simEnv.POLICY_URL ?? agentEnv.POLICY_URL ?? "http://localhost:8787").replace(/\/$/, "");
if (!simEnv.OPERATOR_TOKEN) {
  console.error("agent/.env.operator-sim needs OPERATOR_TOKEN=…");
  process.exit(1);
}

// Who each fixture appears to come from, as an inbox would show it.
const FROM: Record<string, string> = {
  "inv-001": "Mzansi Catering",
  "inv-002": "Mzansi Catering",
  "inv-003": "Khaya Print & Stationery",
  "inv-004": "Mzansi Catering",
};

async function op(method: string, path: string, body?: unknown) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${simEnv.OPERATOR_TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? `${method} ${path} → ${res.status}`);
  return json;
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: pnpm inbox reset | inv-001 [inv-002 …]");
  process.exit(1);
}
for (const a of args) {
  if (a === "reset") {
    await op("POST", "/admin/reset");
    console.log("📭 Demo reset: invoices, approvals and payments cleared on the policy service.");
    continue;
  }
  const owner = /^(approve|reject):(.+)$/.exec(a);
  if (owner) {
    const [, action, invoiceId] = owner;
    const aps = (await op("GET", "/approvals?status=pending")) as unknown as Array<{ id: string; invoiceId: string }>;
    const ap = aps.find((x) => x.invoiceId === invoiceId);
    if (!ap) throw new Error(`No pending approval for ${invoiceId}`);
    await op("POST", `/approvals/${ap.id}/${action}`, { decidedBy: "owner (rehearsal)" });
    console.log(`${action === "approve" ? "👍 Owner approved" : "👎 Owner rejected"} ${invoiceId} (${ap.id})`);
    continue;
  }
  // "inv-002=inv-002b" sends fixture inv-002 again under a new id (a held invoice can't be re-posted under its old id).
  const [fixture, newId] = a.replace(/\.txt$/, "").split("=");
  const id = newId || fixture;
  const rawText = readFileSync(resolve(AGENT_DIR, "fixtures", `${fixture}.txt`), "utf8");
  // No poNumber: the inbox doesn't know the order. Matching it is the agent's job.
  await op("POST", "/invoices", { id, supplierName: FROM[fixture] ?? "Unknown sender", rawText });
  console.log(`📨 ${id} arrived from ${FROM[fixture] ?? "an unknown sender"}`);
}
