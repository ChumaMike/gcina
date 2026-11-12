import "server-only";
import { hiddenParts } from "./hidden-text";
// In-memory stand-in for the policy service (USE_MOCK=1). It speaks the contract's
// operator API in the new Amount shape and plays the agent + policy + ledger, so every
// screen and all four fixtures can be clicked through before the real service is up.
import { randomBytes } from "node:crypto";
import { fromMinor, toMinor } from "./money";
import type { Amount, Approval, AuditEvent, Invoice, Policy, Supplier } from "./types";

const ADDR = {
  treasury: "rK8V7hu4LjNpHyLZwqRxL2NUFKvdqzRQMD",
  agent: "rGnmtEMkzCECGn1mkdxZt8cieEU62kV6hq",
  mzansi: "rfhJ9sf6ELqiii5nBP15upCegibK8REhii",
  khaya: "rEnW1VfKaFVAMMwANE475SZ7kTRk2h82Zx",
  fraud: "rNFSsyd6gm9m9KzsEJfPGnRUwEf2LMNgaQ",
};

const rl = (v: string): Amount => ({ currency: "RLUSD", value: v });
const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${randomBytes(4).toString("hex")}`;
const hash = () => randomBytes(32).toString("hex").toUpperCase();

type Store = {
  policy: Policy;
  suppliers: Supplier[];
  invoices: Invoice[];
  approvals: Approval[];
  audit: AuditEvent[];
  paid: { invoiceId: string; amount: Amount; at: string; destination: string; ref?: string }[];
  balances: { treasuryRl: bigint; agentRl: bigint; treasuryXrp: number; agentXrp: number };
};

function seed(): Store {
  const t0 = Date.now() - 60 * 60 * 1000;
  const at = (min: number) => new Date(t0 + min * 60_000).toISOString();
  return {
    policy: {
      perPaymentMax: rl("50.00"),
      dailyMax: rl("120.00"),
      requireHumanAbove: rl("30.00"),
      paused: false,
      updatedAt: at(0),
      updatedBy: "operator",
    },
    suppliers: [
      { id: "sup-a", name: "Mzansi Catering", xrplAddress: ADDR.mzansi, status: "approved", createdAt: at(1) },
      { id: "sup-b", name: "Khaya Print & Stationery", xrplAddress: ADDR.khaya, status: "approved", createdAt: at(2) },
    ],
    invoices: [],
    approvals: [],
    audit: [
      { id: id("ev"), at: at(0), actor: "operator", kind: "policy.updated", message: "You set the limits: $ 50.00 per payment, $ 120.00 a day, ask you above $ 30.00." },
      { id: id("ev"), at: at(1), actor: "operator", kind: "supplier.approved", message: "You approved Mzansi Catering." },
      { id: id("ev"), at: at(2), actor: "operator", kind: "supplier.approved", message: "You approved Khaya Print & Stationery." },
      { id: id("ev"), at: at(3), actor: "agent", kind: "agent.started", message: "Your agent is watching for new invoices." },
    ],
    paid: [],
    balances: { treasuryRl: 100000n, agentRl: 20000n, treasuryXrp: 89.99, agentXrp: 9.99 },
  };
}

const g = globalThis as unknown as { __gcinaMock?: Store };
/** Supplier's own invoice number (MC-2611…) per invoice id, for the repeat-payment rule. */
const refs = new Map<string, string | undefined>();
const timeAgoShort = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};
const db = (): Store => (g.__gcinaMock ??= seed());

function log(actor: AuditEvent["actor"], kind: string, message: string, extra: Partial<AuditEvent> = {}) {
  db().audit.unshift({ id: id("ev"), at: now(), actor, kind, message, ...extra });
}

const fmt = (a: Amount) => `$ ${fromMinor("RLUSD", toMinor(a)).value}`;
const supplierFor = (addr: string) => db().suppliers.find((s) => s.xrplAddress === addr);

function sastDay(iso: string) {
  return new Date(new Date(iso).getTime() + 2 * 3600_000).toISOString().slice(0, 10);
}
function spentToday(): bigint {
  const today = sastDay(now());
  return db().paid.filter((p) => sastDay(p.at) === today).reduce((s, p) => s + toMinor(p.amount), 0n);
}

function settle(inv: Invoice, amount: Amount, destination: string, viaApproval = false) {
  const s = db();
  const tx = hash();
  inv.status = "paid";
  s.paid.push({ invoiceId: inv.id, amount, at: now(), destination, ref: refs.get(inv.id) });
  s.balances.agentRl -= toMinor(amount);
  s.balances.agentXrp -= 0.000024;
  const sup = supplierFor(destination);
  log("policy", "cosigned", `Within your limits${viaApproval ? " (you approved it)" : ""}. Policy co-signed ${inv.id} (2 of 2).`);
  log("ledger", "payment.validated", `Your agent paid ${sup?.name ?? destination} ${fmt(amount)} RLUSD. Confirmed on the XRP Ledger.`, { txHash: tx, data: { invoiceId: inv.id, amount } });
}

function hold(inv: Invoice, amount: Amount, destination: string, reasons: string[]) {
  inv.status = "held";
  db().approvals.unshift({
    id: id("apr"), proposalId: id("prop"), invoiceId: inv.id, amount, destination, reasons, status: "pending",
  });
  log("policy", "held_for_human", `Held ${inv.id}: ${reasons[0]}`);
}

/** Plays agent → policy → ledger for a freshly arrived invoice. */
function process(inv: Invoice) {
  const s = db();
  const text = inv.rawText;
  // Same fields the agent pulls out of A's fixtures: total, pay-to address, our order, their invoice number.
  const total = text.match(/TOTAL DUE \(USD\)\s+([\d.]+)/)?.[1] ?? text.match(/USD\s+([\d.]+)/)?.[1] ?? "0";
  const amount = rl(Number(total).toFixed(2));
  const destination = text.match(/\br[1-9A-HJ-NP-Za-km-z]{24,34}\b/)?.[0] ?? "";
  const po = text.match(/\bPO-\d+\b/)?.[0];
  const ref = text.match(/\b(?:MC|KPS)-\d+\b/)?.[0];
  refs.set(inv.id, ref);
  inv.status = "processing";
  log("agent", "invoice.read", `Read ${inv.id} from ${inv.supplierName}: ${fmt(amount)} for ${po ?? "no order number"}.`);

  // Like the real agent: text a person can't see that gives orders to an AI = stop, sign nothing.
  if (hiddenParts(text).some((x) => x.hidden && /(?:AI|assistant|automated)/i.test(x.text))) {
    setTimeout(() => {
      inv.status = "rejected";
      log("agent", "invoice.updated", `Invoice ${inv.id}: processing → rejected.`);
    }, 1800);
    return;
  }

  setTimeout(() => {
    const p = s.policy;
    log("agent", "proposal.signed", `Proposed paying ${fmt(amount)} to ${inv.supplierName} for ${inv.id}. Signed 1 of 2.`);
    if (p.paused) {
      inv.status = "rejected";
      log("policy", "rejected", `Refused ${inv.id}: you've paused the agent.`);
      return;
    }
    const sup = supplierFor(destination);
    if (!sup || sup.status !== "approved") {
      const known = s.suppliers.find((x) => x.name === inv.supplierName && x.status === "approved");
      if (known && !s.suppliers.some((x) => x.xrplAddress === destination)) {
        s.suppliers.push({ id: id("sup"), name: inv.supplierName, xrplAddress: destination, status: "pending", createdAt: now() });
      }
      hold(inv, amount, destination, [
        `Destination is not the registered address for ${inv.supplierName}. Possible changed-banking-details fraud.`,
      ]);
      log("ledger", "agent_only.refused", `Agent tried to send ${inv.id} alone (1 of 2 signatures). The XRP Ledger refused: tefBAD_QUORUM. No money moved.`, { data: { invoiceId: inv.id, engine_result: "tefBAD_QUORUM", applied: false } });
      return;
    }
    const twin = s.paid.find((x) => x.invoiceId !== inv.id && x.destination === destination && x.amount.value === amount.value && x.ref === ref);
    if (twin) {
      inv.status = "rejected";
      log("policy", "rejected", `Refused ${inv.id}: looks like a repeat of ${twin.invoiceId} (${ref ?? "same bill"}), paid ${timeAgoShort(twin.at)}. Nothing sent.`);
      return;
    }
    const a = toMinor(amount);
    const reasons: string[] = [];
    if (a > toMinor(p.perPaymentMax)) reasons.push(`${fmt(amount)} is more than your per-payment limit of ${fmt(p.perPaymentMax)}.`);
    if (spentToday() + a > toMinor(p.dailyMax)) reasons.push(`This would take today's spend past your daily limit of ${fmt(p.dailyMax)}.`);
    if (a > toMinor(p.requireHumanAbove)) reasons.push(`${fmt(amount)} is above ${fmt(p.requireHumanAbove)}, where you asked to approve payments yourself.`);
    if (reasons.length) return hold(inv, amount, destination, reasons);
    settle(inv, amount, destination);
  }, 1800);
}

// ---------- operator API (same paths as the policy service) ----------

type Res = { status: number; body: unknown };
const ok = (body: unknown): Res => ({ status: 200, body });
const err = (status: number, error: string): Res => ({ status, body: { error } });

export async function mockRequest(method: string, path: string, body: unknown): Promise<Res> {
  const s = db();
  const [pathname] = path.split("?");
  const parts = pathname.split("/").filter(Boolean);
  const b = (body ?? {}) as Record<string, unknown>;

  if (method === "GET" && pathname === "/health") return ok({ ok: true, network: "testnet (mock)", agentAccount: ADDR.agent });
  if (pathname === "/policy") {
    if (method === "GET") return ok(s.policy);
    if (method === "PUT") {
      const before = s.policy;
      s.policy = { ...before, ...(b as Partial<Policy>), updatedAt: now(), updatedBy: "operator" };
      if (b.paused !== undefined && b.paused !== before.paused) {
        log("operator", b.paused ? "agent.paused" : "agent.resumed", b.paused ? "You paused the agent. Nothing will be paid until you resume." : "You resumed the agent.");
      } else {
        log("operator", "policy.updated", `You changed the limits: ${fmt(s.policy.perPaymentMax)} per payment, ${fmt(s.policy.dailyMax)} a day, ask you above ${fmt(s.policy.requireHumanAbove)}.`);
      }
      return ok(s.policy);
    }
  }
  if (pathname === "/suppliers") {
    if (method === "GET") return ok(s.suppliers);
    if (method === "POST") {
      const sup: Supplier = { id: id("sup"), name: String(b.name), xrplAddress: String(b.xrplAddress), status: "pending", createdAt: now() };
      s.suppliers.push(sup);
      log("operator", "supplier.added", `You added ${sup.name}. Waiting for your approval.`);
      return ok(sup);
    }
  }
  if (parts[0] === "suppliers" && parts[1] && method === "PATCH") {
    const sup = s.suppliers.find((x) => x.id === parts[1]);
    if (!sup) return err(404, "Supplier not found");
    sup.status = b.status as Supplier["status"];
    log("operator", `supplier.${sup.status}`, `You ${sup.status === "approved" ? "approved" : sup.status === "blocked" ? "blocked" : "updated"} ${sup.name} (${sup.xrplAddress.slice(0, 6)}…).`);
    return ok(sup);
  }
  if (pathname === "/invoices") {
    if (method === "GET") return ok(s.invoices);
    if (method === "POST") {
      const existing = s.invoices.find((x) => x.id === b.id);
      if (existing && existing.status !== "rejected") return err(409, "That invoice has already arrived.");
      const inv: Invoice = {
        id: String(b.id), supplierName: String(b.supplierName), rawText: String(b.rawText),
        poNumber: b.poNumber ? String(b.poNumber) : undefined, receivedAt: now(), status: "new",
      };
      s.invoices = [inv, ...s.invoices.filter((x) => x.id !== inv.id)];
      log("operator", "invoice.received", `Invoice ${inv.id} from ${inv.supplierName} arrived.`);
      setTimeout(() => process(inv), 1200);
      return ok(inv);
    }
  }
  if (pathname === "/approvals" && method === "GET") return ok(s.approvals);
  if (parts[0] === "approvals" && parts[1] && method === "POST" && (parts[2] === "approve" || parts[2] === "reject")) {
    const a = s.approvals.find((x) => x.id === parts[1]);
    if (!a) return err(404, "Approval not found");
    if (a.status !== "pending") return err(409, "Already decided");
    a.status = parts[2] === "approve" ? "approved" : "rejected";
    a.decidedBy = "operator";
    a.decidedAt = now();
    const inv = s.invoices.find((x) => x.id === a.invoiceId);
    if (a.status === "rejected") {
      if (inv) inv.status = "rejected";
      log("operator", "approval.rejected", `You rejected ${a.invoiceId}. Nothing was paid.`);
    } else {
      log("operator", "approval.approved", `You approved ${a.invoiceId} for ${fmt(a.amount)}.`);
      setTimeout(() => {
        log("agent", "proposal.signed", `Re-signed ${a.invoiceId} with your approval. Signed 1 of 2.`);
        if (inv) settle(inv, a.amount, a.destination, true);
      }, 1500);
    }
    return ok(a);
  }
  if (pathname === "/admin/reset" && method === "POST") {
    resetMock();
    return ok({ ok: true });
  }
  if (pathname === "/audit" && method === "GET") return ok(s.audit.slice(0, 200));
  if (pathname === "/balances" && method === "GET") {
    const v = (n: bigint) => fromMinor("RLUSD", n).value;
    return ok({
      TREASURY: { address: ADDR.treasury, xrp: s.balances.treasuryXrp.toFixed(6), rlusd: v(s.balances.treasuryRl) },
      AGENT_ACCOUNT: { address: ADDR.agent, xrp: s.balances.agentXrp.toFixed(6), rlusd: v(s.balances.agentRl) },
    });
  }
  if (pathname === "/purchase-orders" && method === "GET") {
    return ok([
      { poNumber: "PO-1001", supplierId: "sup-a", amount: rl("20.00"), description: "Learner lunch packs", status: s.paid.some((p) => p.amount.value === "20.00") ? "paid" : "open" },
      { poNumber: "PO-1002", supplierId: "sup-b", amount: rl("45.00"), description: "Learner packs", status: s.paid.some((p) => p.amount.value === "45.00") ? "paid" : "open" },
    ]);
  }
  return err(404, `Mock has no ${method} ${pathname}`);
}

export function resetMock() {
  g.__gcinaMock = seed();
  refs.clear();
}
