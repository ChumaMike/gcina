// End-to-end smoke test against a running policy service, acting as a stand-in agent.
//   POLICY_URL=http://localhost:8787 pnpm smoke-policy [--evidence]
// Runs the four demo fixtures (paid / fraud held / human-approved / duplicate) plus the
// compromised-agent direct submit, on XRPL Testnet, in whatever currency the policy uses.
// Reference for the agent tab: this is the exact sign → propose → re-propose sequence.
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { Wallet, connect, buildPayment, signPartial, submitAndWait, explorerUrl, formatAmount, type Amount, type Currency } from "../src/xrpl.ts";
import { readEnv } from "../src/envfile.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const env = readEnv(resolve(ROOT, "ledger/.env.testnet"));
const URL = process.env.POLICY_URL ?? "http://localhost:8787";
const EVIDENCE = process.argv.includes("--evidence");

async function api(method: string, path: string, who: "operator" | "agent", body?: unknown) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${who === "operator" ? env.OPERATOR_TOKEN : env.AGENT_TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json)}`);
  return json as any;
}

async function main() {
  const health = await (await fetch(`${URL}/health`)).json();
  const cur = health.currency as Currency;
  const amt = (n: number): Amount => (cur === "XRP" ? { currency: "XRP", value: String(n * 1_000_000) } : { currency: "RLUSD", value: `${n}.00` });
  const agentSigner = Wallet.fromSeed(env.AGENT_SIGNER_SEED);
  const from = env.AGENT_ACCOUNT_ADDRESS;
  const client = await connect();
  const rows: string[] = [];
  const row = (label: string, d: any) => {
    const link = d.explorerUrl ? `[${d.txHash.slice(0, 12)}…](${d.explorerUrl})` : d.txHash ? `\`${d.txHash}\` (not on ledger)` : "—";
    rows.push(`| ${label} | **${d.decision ?? d.engineResult}**${d.ledgerResult ? ` (${d.ledgerResult})` : ""} | ${(d.reasons ?? []).join(" ").replace(/\|/g, "/")} | ${link} |`);
    console.log(`${label}: ${d.decision ?? d.engineResult} ${d.ledgerResult ?? ""} ${d.explorerUrl ?? ""}\n   ${(d.reasons ?? []).join(" ")}`);
  };
  const propose = async (invoiceId: string, to: string, amount: Amount, supplierId: string | null, approvalId?: string) => {
    const tx = await buildPayment(client, { from, to, amount, invoiceId }, 2); // autofill right before signing (C10)
    const blob = signPartial(agentSigner, tx).tx_blob;
    return api("POST", "/proposals", "agent", { invoiceId, supplierId, destination: to, amount, reasoning: "smoke test", agentSignedTxBlob: blob, ...(approvalId ? { approvalId } : {}) });
  };
  try {
    await api("POST", "/admin/reset", "operator");
    const run = Date.now().toString(36);
    const id = (n: string) => `inv-${n}-${run}`;
    // 1. inv-001 → paid autonomously
    await api("POST", "/invoices", "operator", { id: id("001"), supplierName: "Mzansi Meat Supplies", rawText: "Mzansi Meat Supplies invoice for PO-1001, 20", poNumber: "PO-1001" });
    row("inv-001 autonomous payment ✅", await propose(id("001"), env.SUPPLIER_A_ADDRESS, amt(20), "sup-a"));
    // 2. inv-002 → changed banking details → held
    await api("POST", "/invoices", "operator", { id: id("002"), supplierName: "Mzansi Meat Supplies", rawText: "URGENT: our banking details have changed. Pay 20 to the new account." });
    const fraud = await propose(id("002"), env.FRAUDSTER_ADDRESS, amt(20), "sup-a");
    row("inv-002 fraud: policy decision 🛑", fraud);
    //    compromised agent bypasses the policy and submits alone → ledger refuses
    const solo = await buildPayment(client, { from, to: env.FRAUDSTER_ADDRESS, amount: amt(20), invoiceId: id("002") }, 1);
    const direct = await submitAndWait(client, signPartial(agentSigner, solo).tx_blob);
    row("inv-002 fraud: agent submits alone to the ledger 🛑", { engineResult: direct.engineResult, txHash: direct.hash, reasons: ["Ledger rejected: agent weight 1 < quorum 2."] });
    const fraudAp = (await api("GET", "/approvals?status=pending", "operator")).find((a: any) => a.invoiceId === id("002"));
    await api("POST", `/approvals/${fraudAp.id}/reject`, "operator", { decidedBy: "smoke-test operator" });
    // 3. inv-003 → above human threshold → held → approve → re-sign fresh tx → paid
    await api("POST", "/invoices", "operator", { id: id("003"), supplierName: "Khaya Packaging", rawText: "Khaya Packaging invoice for PO-1002, 45", poNumber: "PO-1002" });
    row("inv-003 first proposal 👤", await propose(id("003"), env.SUPPLIER_B_ADDRESS, amt(45), "sup-b"));
    const ap = (await api("GET", "/approvals?status=pending", "operator")).find((a: any) => a.invoiceId === id("003"));
    await api("POST", `/approvals/${ap.id}/approve`, "operator", { decidedBy: "smoke-test operator" });
    const approved = (await api("GET", "/approvals?status=approved", "agent")).find((a: any) => a.id === ap.id);
    row("inv-003 human-approved payment 👤", await propose(id("003"), approved.destination, approved.amount, "sup-b", approved.id));
    // 4. inv-004 → duplicate of inv-001 → rejected
    await api("POST", "/invoices", "operator", { id: id("004"), supplierName: "Mzansi Meat Supplies", rawText: "Mzansi Meat Supplies invoice for PO-1001, 20", poNumber: "PO-1001" });
    row("inv-004 duplicate", await propose(id("004"), env.SUPPLIER_A_ADDRESS, amt(20), "sup-a"));

    if (EVIDENCE) {
      const at = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false });
      appendFileSync(
        resolve(ROOT, "docs/demo-evidence.md"),
        `\n## Policy service end-to-end — ${at} SAST (\`ledger/scripts/smoke-policy.ts\`, stand-in agent, ${cur})\n\nPolicy at ${URL}; amounts ${formatAmount(amt(20))} / ${formatAmount(amt(45))}.\n\n| Step | Result | Reasons | Tx |\n|---|---|---|---|\n${rows.join("\n")}\n`,
      );
      console.log("\nAppended to docs/demo-evidence.md");
    }
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  console.error("smoke failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
