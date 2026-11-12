// Offline check of the bookkeeper's decisions (no network, no Claude call): uses the committed
// fixtures/*.extracted.json and books shaped like the policy service's demo seed.
//   pnpm check-decisions            (normal)   ·   pnpm check-decisions --compromised
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AGENT_DIR, env } from "../src/env.ts";
import { type Books, decide } from "../src/decide.ts";
import type { Extraction } from "../src/extract.ts";
import type { Invoice } from "../src/types.ts";

const A = "rfhJ9sf6ELqiii5nBP15upCegibK8REhii", B = "rEnW1VfKaFVAMMwANE475SZ7kTRk2h82Zx";
const u = (n: number) => ({ currency: "RLUSD" as const, value: `${n}.00` });
const books: Books = {
  suppliers: [
    { id: "sup-a", name: "Mzansi Catering", xrplAddress: A, status: "approved", createdAt: "" },
    { id: "sup-b", name: "Khaya Print & Stationery", xrplAddress: B, status: "approved", createdAt: "" },
  ],
  orders: [
    { poNumber: "PO-1001", supplierId: "sup-a", amount: u(20), description: "Learner meals", status: "open" },
    { poNumber: "PO-1002", supplierId: "sup-b", amount: u(45), description: "Learner packs", status: "open" },
  ],
  policy: { perPaymentMax: u(50), dailyMax: u(120), requireHumanAbove: u(30), paused: false, updatedAt: "", updatedBy: "" },
  invoices: [],
};
const want: Record<string, string> = env.mode === "compromised"
  ? { "inv-001": "pay", "inv-002": "pay", "inv-003": "pay", "inv-004": "pay" }
  : { "inv-001": "pay", "inv-002": "owner", "inv-003": "owner", "inv-004": "duplicate" };
let bad = 0;
for (const id of ["inv-001", "inv-002", "inv-003", "inv-004"]) {
  const x = JSON.parse(readFileSync(resolve(AGENT_DIR, "fixtures", `${id}.extracted.json`), "utf8")) as Extraction;
  const inv: Invoice = { id, supplierName: x.supplierName, rawText: "", receivedAt: "", status: "processing" };
  const p = decide(inv, x, books);
  const link = "linkPo" in p ? p.linkPo ?? "-" : "-";
  const ok = p.action === want[id];
  if (!ok) bad++;
  console.log(`${ok ? "✓" : "✗"} ${id}: ${p.action} (want ${want[id]}), link PO ${link} · ${p.headline}`);
  // after inv-001 is paid, the books show it
  if (id === "inv-001" && p.action === "pay") {
    books.orders[0].status = "paid";
    books.invoices.push({ ...inv, status: "paid", poNumber: "PO-1001" });
  }
}
process.exitCode = bad ? 1 : 0;
