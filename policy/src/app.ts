// Gcina policy co-signer HTTP API (CONTRACTS §3).
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { isValidClassicAddress } from "xrpl";
import { type Amount, toMinor, formatAmount, sameAmount, fromLedgerAmount } from "./amount.ts";
import { evaluate, sastDay, readReference, type RulesConfig } from "./rules.ts";
import type { Ledger } from "./ledger.ts";
import type { Store } from "./store.ts";
import { seedState } from "./seed.ts";
import { fromMinor } from "./amount.ts";
import type { Approval, AuditEvent, Decision, Invoice, Proposal, State, Supplier, InvoiceStatus, PurchaseOrder, InFlight } from "./types.ts";

type Role = "operator" | "agent";
export type AppDeps = {
  store: Store;
  ledger: Ledger;
  rules: RulesConfig;
  tokens: { operator: string; agent: string };
  addresses: { treasury: string; agentAccount: string; supplierA: string; supplierB: string };
  currency: "RLUSD" | "XRP";
  corsOrigins: string[];
  now?: () => Date;
};

const AUDIT_CAP = 2000;

function sha(s: string) {
  return createHash("sha256").update(s).digest();
}
function same(a: string, b: string) {
  return a.length > 0 && b.length > 0 && timingSafeEqual(sha(a), sha(b));
}

function audit(s: State, e: Omit<AuditEvent, "id" | "at">, now: Date) {
  s.audit.push({ id: `evt-${randomUUID().slice(0, 8)}`, at: now.toISOString(), ...e });
  if (s.audit.length > AUDIT_CAP) s.audit.splice(0, s.audit.length - AUDIT_CAP);
}

function isAmount(v: unknown, currency: string): v is Amount {
  if (!v || typeof v !== "object") return false;
  const a = v as Amount;
  if (a.currency !== currency || typeof a.value !== "string") return false;
  try {
    return toMinor(a) >= 0n;
  } catch {
    return false;
  }
}

class HttpError extends Error {
  constructor(public status: 400 | 401 | 403 | 404 | 409 | 502, message: string) {
    super(message);
  }
}

export function createApp(d: AppDeps) {
  const now = d.now ?? (() => new Date());
  const app = new Hono<{ Variables: { role: Role } }>();
  let proposalLock: Promise<unknown> = Promise.resolve();

  app.use("*", cors({ origin: d.corsOrigins, allowHeaders: ["Authorization", "Content-Type"], allowMethods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"] }));

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
    console.error("[policy] unhandled:", err instanceof Error ? err.message : err);
    return c.json({ error: "Something went wrong in the policy service." }, 500);
  });

  app.get("/health", async (c) => c.json({ ok: true, network: d.ledger.network, agentAccount: d.addresses.agentAccount, currency: d.currency }));

  // ---- auth: every route below needs a token ----
  app.use("*", async (c, next) => {
    const h = c.req.header("Authorization") ?? "";
    const tok = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
    if (same(tok, d.tokens.operator)) c.set("role", "operator");
    else if (same(tok, d.tokens.agent)) c.set("role", "agent");
    else throw new HttpError(401, "Missing or unknown token.");
    await next();
  });
  const need = (c: Context<{ Variables: { role: Role } }>, ...roles: Role[]) => {
    if (!roles.includes(c.get("role"))) throw new HttpError(403, `This needs the ${roles.join(" or ")} token. The agent can never change limits, suppliers or approvals.`);
    return c.get("role");
  };
  const body = async <T,>(c: Context): Promise<T> => {
    try {
      return (await c.req.json()) as T;
    } catch {
      throw new HttpError(400, "Body must be JSON.");
    }
  };

  // ---- policy ----
  const spentToday = (s: State): Amount => {
    const today = sastDay(now());
    const cur = s.policy.perPaymentMax.currency;
    return fromMinor(cur, s.payments.filter((x) => x.sastDay === today && x.amount.currency === cur).reduce((t, x) => t + toMinor(x.amount), 0n));
  };
  const policyView = (s: State) => ({ ...s.policy, spentToday: spentToday(s), coolingOffMinutes: d.rules.coolingOffMinutes ?? 0 });
  app.get("/policy", async (c) => {
    need(c, "operator", "agent");
    return c.json(policyView(await d.store.read()));
  });
  app.put("/policy", async (c) => {
    need(c, "operator");
    const b = await body<Partial<State["policy"]> & { updatedBy?: string }>(c);
    const out = await d.store.update((s) => {
      const p = { ...s.policy };
      for (const k of ["perPaymentMax", "dailyMax", "requireHumanAbove"] as const) {
        if (b[k] === undefined) continue;
        if (!isAmount(b[k], d.currency)) throw new HttpError(400, `${k} must be { currency: "${d.currency}", value } with a valid value.`);
        p[k] = b[k] as Amount;
      }
      if (b.paused !== undefined) {
        if (typeof b.paused !== "boolean") throw new HttpError(400, "paused must be true or false.");
        p.paused = b.paused;
      }
      if (toMinor(p.perPaymentMax) > toMinor(p.dailyMax)) throw new HttpError(400, "The per-payment limit can't be more than the daily limit.");
      p.updatedAt = now().toISOString();
      p.updatedBy = typeof b.updatedBy === "string" && b.updatedBy.trim() ? b.updatedBy.trim().slice(0, 60) : "operator";
      const before = s.policy;
      s.policy = p;
      audit(s, {
        actor: "operator",
        kind: "policy.updated",
        message: `Limits changed: ${formatAmount(p.perPaymentMax)} per payment, ${formatAmount(p.dailyMax)} a day, ask a person above ${formatAmount(p.requireHumanAbove)}${p.paused ? ". Payments PAUSED" : ""}.`,
        data: { before, after: p },
      }, now());
      return p;
    });
    void out;
    return c.json(policyView(await d.store.read()));
  });

  // ---- suppliers ----
  app.get("/suppliers", async (c) => {
    need(c, "operator", "agent");
    return c.json((await d.store.read()).suppliers);
  });
  app.post("/suppliers", async (c) => {
    need(c, "operator");
    const b = await body<Partial<Supplier>>(c);
    if (!b.name || typeof b.name !== "string") throw new HttpError(400, "name is required.");
    if (!b.xrplAddress || !isValidClassicAddress(b.xrplAddress)) throw new HttpError(400, "xrplAddress must be a valid XRPL classic address (r...).");
    const status = b.status ?? "pending";
    if (!["approved", "pending", "blocked"].includes(status)) throw new HttpError(400, "status must be approved, pending or blocked.");
    const sup = await d.store.update((s) => {
      const t = now().toISOString();
      const sup: Supplier = { id: `sup-${randomUUID().slice(0, 8)}`, name: b.name!.trim(), xrplAddress: b.xrplAddress!, status, createdAt: t, ...(status === "approved" ? { approvedAt: t } : {}) };
      s.suppliers.push(sup);
      audit(s, { actor: "operator", kind: "supplier.created", message: `Supplier ${sup.name} added (${sup.status}) with address ${sup.xrplAddress}.`, data: sup }, now());
      return sup;
    });
    return c.json(sup, 201);
  });
  app.patch("/suppliers/:id", async (c) => {
    need(c, "operator");
    const b = await body<Partial<Supplier>>(c);
    const sup = await d.store.update((s) => {
      const sup = s.suppliers.find((x) => x.id === c.req.param("id"));
      if (!sup) throw new HttpError(404, "Supplier not found.");
      const before = { ...sup };
      if (b.name !== undefined) sup.name = String(b.name).trim();
      if (b.xrplAddress !== undefined) {
        if (!isValidClassicAddress(String(b.xrplAddress))) throw new HttpError(400, "xrplAddress must be a valid XRPL classic address.");
        sup.xrplAddress = String(b.xrplAddress);
        // A changed address is exactly the fraud pattern: it needs a fresh human approval.
        if (b.status === undefined) sup.status = "pending";
      }
      if (b.status !== undefined) {
        if (!["approved", "pending", "blocked"].includes(b.status)) throw new HttpError(400, "status must be approved, pending or blocked.");
        sup.status = b.status;
      }
      if (sup.status === "approved" && (before.status !== "approved" || before.xrplAddress !== sup.xrplAddress)) sup.approvedAt = now().toISOString();
      if (sup.status !== "approved") delete sup.approvedAt;
      audit(s, { actor: "operator", kind: "supplier.updated", message: `Supplier ${sup.name}: ${before.status} → ${sup.status}${before.xrplAddress !== sup.xrplAddress ? `, address changed to ${sup.xrplAddress}` : ""}.`, data: { before, after: sup } }, now());
      return sup;
    });
    return c.json(sup);
  });

  // ---- purchase orders ----
  app.get("/purchase-orders", async (c) => {
    need(c, "operator", "agent");
    return c.json((await d.store.read()).purchaseOrders);
  });
  app.post("/purchase-orders", async (c) => {
    need(c, "operator");
    const b = await body<Partial<PurchaseOrder>>(c);
    if (!b.poNumber || !b.supplierId || !isAmount(b.amount, d.currency)) throw new HttpError(400, `poNumber, supplierId and amount { currency: "${d.currency}", value } are required.`);
    const po = await d.store.update((s) => {
      if (s.purchaseOrders.some((o) => o.poNumber === b.poNumber)) throw new HttpError(409, `${b.poNumber} already exists.`);
      if (!s.suppliers.some((x) => x.id === b.supplierId)) throw new HttpError(400, "Unknown supplierId.");
      const po: PurchaseOrder = { poNumber: b.poNumber!, supplierId: b.supplierId!, amount: b.amount as Amount, description: String(b.description ?? ""), status: "open" };
      s.purchaseOrders.push(po);
      audit(s, { actor: "operator", kind: "po.created", message: `Order ${po.poNumber} for ${formatAmount(po.amount)} created.`, data: po }, now());
      return po;
    });
    return c.json(po, 201);
  });

  // ---- invoices ----
  app.post("/invoices", async (c) => {
    need(c, "operator");
    const b = await body<Partial<Invoice>>(c);
    if (!b.supplierName || !b.rawText) throw new HttpError(400, "supplierName and rawText are required.");
    const inv = await d.store.update((s) => {
      const id = b.id ? String(b.id) : `inv-${randomUUID().slice(0, 8)}`;
      if (s.invoices.some((i) => i.id === id)) throw new HttpError(409, `Invoice ${id} already exists. Reset the demo (POST /admin/reset) to replay fixtures.`);
      const inv: Invoice = { id, supplierName: String(b.supplierName), rawText: String(b.rawText), receivedAt: now().toISOString(), status: "new", ...(b.poNumber ? { poNumber: String(b.poNumber) } : {}) };
      s.invoices.push(inv);
      audit(s, { actor: "operator", kind: "invoice.received", message: `Invoice ${id} from ${inv.supplierName} arrived.` }, now());
      return inv;
    });
    return c.json(inv, 201);
  });
  app.get("/invoices", async (c) => {
    need(c, "operator", "agent");
    const status = c.req.query("status");
    const all = (await d.store.read()).invoices;
    return c.json(status ? all.filter((i) => i.status === status) : all);
  });
  app.patch("/invoices/:id", async (c) => {
    const role = need(c, "operator", "agent");
    const b = await body<{ status?: InvoiceStatus; poNumber?: string }>(c);
    const allowed: InvoiceStatus[] = role === "agent" ? ["new", "processing", "rejected"] : ["new", "processing", "paid", "held", "rejected"];
    if (b.status !== undefined && !allowed.includes(b.status)) throw new HttpError(role === "agent" ? 403 : 400, `The ${role} can set status to: ${allowed.join(", ")}.`);
    const inv = await d.store.update((s) => {
      const inv = s.invoices.find((i) => i.id === c.req.param("id"));
      if (!inv) throw new HttpError(404, "Invoice not found.");
      if (role === "agent" && (inv.status === "paid" || inv.status === "held")) throw new HttpError(409, `Invoice ${inv.id} is ${inv.status}; the agent can't change it.`);
      const from = inv.status;
      if (b.status) inv.status = b.status;
      if (b.poNumber !== undefined) {
        // The agent may match an invoice to an order once; it can never move it to another order (that would dodge the repeat check).
        if (role === "agent" && inv.poNumber && inv.poNumber !== String(b.poNumber)) throw new HttpError(403, `Invoice ${inv.id} is already matched to ${inv.poNumber}; only the owner can change that.`);
        inv.poNumber = String(b.poNumber);
      }
      audit(s, { actor: role, kind: "invoice.updated", message: `Invoice ${inv.id}: ${from} → ${inv.status}${b.poNumber ? `, matched to ${b.poNumber}` : ""}.` }, now());
      return inv;
    });
    return c.json(inv);
  });

  // ---- proposals: the co-sign decision ----
  app.post("/proposals", async (c) => {
    need(c, "agent");
    const p = await body<Proposal>(c);
    if (!p || typeof p.invoiceId !== "string" || typeof p.destination !== "string" || typeof p.agentSignedTxBlob !== "string" || !p.amount || typeof p.amount !== "object") {
      throw new HttpError(400, "Proposal needs invoiceId, destination, amount { currency, value }, reasoning and agentSignedTxBlob.");
    }
    const run = proposalLock.then(() => d.store.exclusive(() => decide(p)));
    proposalLock = run.catch(() => undefined);
    return c.json(await run);
  });

  const describe = (p: Proposal) => {
    try {
      return `${formatAmount(p.amount)} to ${p.destination} for ${p.invoiceId}`;
    } catch {
      return `a payment to ${p.destination} for ${p.invoiceId}`;
    }
  };
  const pdata = (p: Proposal, id: string, extra: Record<string, unknown> = {}) => ({ proposalId: id, invoiceId: p.invoiceId, amount: p.amount, destination: p.destination, ...extra });

  /** Records a validated, successful payment (idempotent per tx hash). */
  function recordPaid(s: State, f: InFlight, result: { engineResult: string; delivered?: unknown }, t: Date) {
    s.inflight = (s.inflight ?? []).filter((x) => x.txHash !== f.txHash);
    if (s.payments.some((x) => x.txHash === f.txHash)) return;
    const inv = s.invoices.find((i) => i.id === f.invoiceId);
    const ref = inv ? readReference(inv.rawText) : null;
    s.payments.push({
      invoiceId: f.invoiceId,
      amount: f.amount,
      destination: f.destination,
      txHash: f.txHash,
      at: t.toISOString(),
      sastDay: sastDay(t),
      ...(f.approvalId ? { approvalId: f.approvalId } : {}),
      ...(ref ? { reference: ref } : {}),
      ...(inv?.poNumber ? { poNumber: inv.poNumber } : {}),
    });
    if (f.approvalId) s.approvalUses.push({ approvalId: f.approvalId, txHash: f.txHash });
    if (inv) {
      inv.status = "paid";
      const po = inv.poNumber ? s.purchaseOrders.find((o) => o.poNumber === inv.poNumber) : undefined;
      if (po) po.status = "paid";
    }
    const delivered = result.delivered !== undefined ? fromLedgerAmount(result.delivered, d.rules.rlusdIssuer) : null;
    audit(s, {
      actor: "ledger",
      kind: "payment.validated",
      message: `Paid on the XRP Ledger: ${formatAmount(f.amount)} to ${f.destination} for ${f.invoiceId}. Result ${result.engineResult}.`,
      data: { invoiceId: f.invoiceId, amount: f.amount, destination: f.destination, delivered: delivered ?? result.delivered ?? null },
      txHash: f.txHash,
    }, t);
    if (delivered && !sameAmount(delivered, f.amount)) {
      audit(s, { actor: "ledger", kind: "payment.delivered_mismatch", message: `Warning: the ledger delivered ${formatAmount(delivered)}, not ${formatAmount(f.amount)}.`, data: { invoiceId: f.invoiceId }, txHash: f.txHash }, t);
    }
  }

  /**
   * Before anything new is signed for an invoice, settle any earlier co-signed tx whose result we never saw.
   * Returns a reason to refuse while it might still apply: no double pay, ever.
   */
  async function settleInflight(invoiceId: string): Promise<string | null> {
    const pending = ((await d.store.read()).inflight ?? []).filter((f) => f.invoiceId === invoiceId);
    for (const f of pending) {
      let st: Awaited<ReturnType<Ledger["lookup"]>>;
      try {
        // Records without an observed firstLedger search from ledger 1: on a node without full history searched_all is false → stays pending (fail closed).
        st = await d.ledger.lookup(f.txHash, typeof f.firstLedger === "number" && f.firstLedger > 0 ? f.firstLedger : 1, f.lastLedger);
      } catch {
        return `An earlier co-signed payment for ${invoiceId} (${f.txHash.slice(0, 12)}…) has no final result yet and the ledger can't be reached to check. Nothing new will be signed until it settles.`;
      }
      if (st.state === "pending") {
        return `An earlier co-signed payment for ${invoiceId} (${f.txHash.slice(0, 12)}…) is still on its way to the ledger. Nothing new will be signed until it settles (about a minute).`;
      }
      const settled = st;
      await d.store.update((s) => {
        if (settled.state === "validated" && settled.result === "tesSUCCESS") {
          recordPaid(s, f, { engineResult: settled.result, delivered: settled.delivered }, now());
        } else {
          s.inflight = (s.inflight ?? []).filter((x) => x.txHash !== f.txHash);
          audit(s, {
            actor: "ledger",
            kind: "payment.failed",
            message: `An earlier co-signed payment for ${invoiceId} did not go through (${settled.state === "validated" ? settled.result : "expired"}). Nothing was paid.`,
            data: { invoiceId, proposalId: f.proposalId, engine_result: settled.state === "validated" ? settled.result : "expired" },
            ...(settled.state === "validated" ? { txHash: f.txHash } : {}),
          }, now());
        }
      });
    }
    return null;
  }

  async function decide(p: Proposal): Promise<Decision> {
    const id = `prop-${randomUUID().slice(0, 8)}`;
    const at = now();
    const stored = {
      id,
      at: at.toISOString(),
      invoiceId: p.invoiceId,
      supplierId: p.supplierId ?? null,
      destination: p.destination,
      amount: p.amount,
      reasoning: String(p.reasoning ?? "").slice(0, 2000),
      ...(p.approvalId ? { approvalId: p.approvalId } : {}),
      ...(typeof p.reference === "string" ? { reference: p.reference.slice(0, 40) } : {}),
    };
    const what = describe(p);
    const received = (s: State) => audit(s, { actor: "agent", kind: "proposal.received", message: `Agent proposed ${what}.`, data: pdata(p, id, { reasoning: stored.reasoning }) }, at);

    const inflightReason = await settleInflight(p.invoiceId);
    if (inflightReason) {
      const decision: Decision = { proposalId: id, decision: "rejected", reasons: [inflightReason] };
      await d.store.update((s) => {
        s.proposals.push({ ...stored, decision });
        received(s);
        audit(s, { actor: "policy", kind: "proposal.rejected", message: `Refused: ${what}. ${inflightReason}`, data: pdata(p, id, { reasons: decision.reasons }) }, at);
      });
      return decision;
    }

    // Fail closed: without a ledger index we can't enforce the expiry window or bound the later search, so sign nothing.
    let ledgerIndex: number;
    try {
      ledgerIndex = await d.ledger.ledgerIndex();
    } catch (e) {
      const decision: Decision = { proposalId: id, decision: "rejected", reasons: [`The policy can't reach the XRP Ledger right now (${e instanceof Error ? e.message : String(e)}), so it can't check this payment's expiry. Nothing was signed; try again shortly.`] };
      await d.store.update((s) => {
        s.proposals.push({ ...stored, decision });
        received(s);
        audit(s, { actor: "policy", kind: "proposal.rejected", message: `Refused: ${what}. ${decision.reasons[0]}`, data: pdata(p, id, { reasons: decision.reasons }) }, at);
      });
      return decision;
    }
    const verdict = evaluate(p, await d.store.read(), d.rules, at, ledgerIndex);

    if (verdict.kind === "reject" || verdict.kind === "hold") {
      const decision: Decision = { proposalId: id, decision: verdict.kind === "reject" ? "rejected" : "held_for_human", reasons: verdict.reasons };
      await d.store.update((s) => {
        s.proposals.push({ ...stored, decision });
        received(s);
        const inv = s.invoices.find((i) => i.id === p.invoiceId);
        if (verdict.kind === "hold") {
          const existing = s.approvals.find((a) => a.status === "pending" && a.invoiceId === p.invoiceId && a.destination === p.destination && sameAmount(a.amount, p.amount));
          let approvalId = existing?.id;
          if (!existing) {
            const ap: Approval = { id: `apr-${randomUUID().slice(0, 8)}`, proposalId: id, invoiceId: p.invoiceId, amount: p.amount, destination: p.destination, reasons: verdict.reasons, status: "pending" };
            s.approvals.push(ap);
            approvalId = ap.id;
          }
          if (inv) inv.status = "held";
          audit(s, { actor: "policy", kind: "proposal.held", message: `Held for a person: ${what}. ${verdict.reasons.join(" ")}`, data: pdata(p, id, { reasons: verdict.reasons, approvalId }) }, at);
        } else {
          const paused = verdict.reasons[0]?.startsWith("Payments are paused");
          if (inv && !paused && inv.status !== "paid") inv.status = "rejected";
          audit(s, { actor: "policy", kind: "proposal.rejected", message: `Refused: ${what}. ${verdict.reasons.join(" ")}`, data: pdata(p, id, { reasons: verdict.reasons }) }, at);
        }
      });
      return decision;
    }

    // Co-sign. The hash is known before submitting and is saved first, so an unknown outcome can never lead to a second signature.
    const { blob, hash } = d.ledger.cosign(verdict.tx, p.agentSignedTxBlob);
    const inv = (await d.store.read()).invoices.find((i) => i.id === p.invoiceId);
    const lastLedger = Number(verdict.tx.LastLedgerSequence);
    const ref = inv ? readReference(inv.rawText) : null;
    const flight: InFlight = {
      invoiceId: p.invoiceId,
      txHash: hash,
      // Lower bound for the ledger search: the ledger index observed BEFORE signing (minus a small margin). Never derived from the tx.
      firstLedger: Math.max(1, ledgerIndex - 5),
      lastLedger,
      ...(ref ? { reference: ref } : {}),
      ...(inv?.poNumber ? { poNumber: inv.poNumber } : {}),
      at: at.toISOString(),
      proposalId: id,
      amount: p.amount,
      destination: p.destination,
      ...(verdict.approvalId ? { approvalId: verdict.approvalId } : {}),
    };
    await d.store.update((s) => {
      // Fail closed: re-run the rules on the row-locked, current books before claiming the payment.
      // If anything changed since the first check (another instance claimed it, limits changed, paused),
      // this throws, the transaction rolls back and the co-signed blob is never submitted.
      // Correctness therefore never depends on the advisory lock staying held.
      const recheck = evaluate(p, s, d.rules, at, ledgerIndex);
      if (recheck.kind !== verdict.kind) {
        throw new HttpError(409, `Not co-signed: the books changed while deciding. ${recheck.reasons.join(" ")} Nothing was sent to the ledger.`);
      }
      (s.inflight ??= []).push(flight);
      received(s);
      audit(s, {
        actor: "policy",
        kind: "proposal.cosigned",
        message: `Co-signed ${what}${verdict.approvalId ? ` (approved by a person, ${verdict.approvalId})` : ""}. ${verdict.reasons.join(" ")}`,
        data: pdata(p, id, { reasons: verdict.reasons }),
        txHash: hash,
      }, at);
    });

    let result: Awaited<ReturnType<Ledger["submit"]>>;
    try {
      result = await d.ledger.submit(blob, hash, flight.firstLedger, flight.lastLedger);
    } catch (e) {
      const decision: Decision = {
        proposalId: id,
        decision: "rejected",
        reasons: [`Co-signed, but the ledger stopped answering (${e instanceof Error ? e.message : String(e)}). The result is UNKNOWN: do not re-sign. The policy checks ${hash.slice(0, 12)}… before it signs anything else for ${p.invoiceId}.`],
        txHash: hash,
        ledgerResult: "unknown",
      };
      await d.store.update((s) => {
        s.proposals.push({ ...stored, decision, txHashSignedByAgent: hash });
        audit(s, { actor: "ledger", kind: "submit.unknown", message: decision.reasons[0], data: pdata(p, id) }, at);
      });
      return decision;
    }

    const ok = result.engineResult === "tesSUCCESS" && result.validated;
    const decision: Decision = ok
      ? { proposalId: id, decision: "cosigned_submitted", reasons: verdict.reasons, txHash: hash, ledgerResult: result.engineResult, explorerUrl: result.explorerUrl }
      : {
          proposalId: id,
          decision: "rejected",
          reasons: [`Co-signed, but the ledger refused it (${result.engineResult}). Nothing was paid. Re-propose with a freshly signed transaction.`],
          txHash: hash,
          ledgerResult: result.engineResult,
          ...(result.explorerUrl ? { explorerUrl: result.explorerUrl } : {}),
        };
    const final = result;
    await d.store.update((s) => {
      s.proposals.push({ ...stored, decision, txHashSignedByAgent: hash });
      if (ok) {
        recordPaid(s, flight, final, now());
      } else {
        s.inflight = (s.inflight ?? []).filter((x) => x.txHash !== hash);
        audit(s, {
          actor: "ledger",
          kind: "payment.failed",
          message: `The ledger refused ${what}: ${final.engineResult}. Nothing was paid.`,
          data: pdata(p, id, { engine_result: final.engineResult }),
          ...(final.validated ? { txHash: hash } : {}),
        }, at);
      }
    });
    return decision;
  }

  // The agent reports its own direct ledger attempts (compromised-mode demo). Audit only; changes nothing.
  app.post("/audit/agent-events", async (c) => {
    need(c, "agent");
    const b = await body<{ kind?: string; invoiceId?: string; destination?: string; engine_result?: string; engine_result_message?: string; applied?: boolean }>(c);
    if (b.kind !== "ledger.direct_attempt") throw new HttpError(400, 'kind must be "ledger.direct_attempt".');
    if (typeof b.engine_result !== "string" || !/^[a-z]{3}[A-Z_]{2,40}$/.test(b.engine_result)) throw new HttpError(400, "engine_result must be an XRPL result code.");
    if (typeof b.invoiceId !== "string" || typeof b.destination !== "string" || !isValidClassicAddress(b.destination)) {
      throw new HttpError(400, "invoiceId and a valid destination are required.");
    }
    const code = b.engine_result;
    const refused = !code.startsWith("tes");
    const ev = await d.store.update((s) => {
      audit(s, {
        actor: "ledger",
        kind: "ledger.direct_attempt",
        message: refused
          ? `Ledger refused: agent alone (${code}). The agent tried to pay ${b.destination} for ${b.invoiceId} with only its own key. No money moved.`
          : `WARNING: the ledger accepted a payment signed by the agent alone (${code}) for ${b.invoiceId}. Check the SignerList now.`,
        data: {
          invoiceId: b.invoiceId,
          destination: b.destination,
          engine_result: code,
          engine_result_message: String(b.engine_result_message ?? "").slice(0, 200),
          applied: b.applied === true,
          reportedBy: "agent",
        },
      }, now());
      return s.audit[s.audit.length - 1];
    });
    return c.json(ev, 201);
  });

  app.get("/proposals", async (c) => {
    need(c, "operator");
    return c.json((await d.store.read()).proposals.slice().reverse());
  });

  // ---- approvals (human queue) ----
  app.get("/approvals", async (c) => {
    const role = need(c, "operator", "agent");
    const status = c.req.query("status");
    const s = await d.store.read();
    if (role === "agent") {
      if (status !== "approved") throw new HttpError(403, "The agent can only read approved approvals (?status=approved).");
      return c.json(s.approvals.filter((a) => a.status === "approved" && !s.approvalUses.some((u) => u.approvalId === a.id)));
    }
    return c.json(status ? s.approvals.filter((a) => a.status === status) : s.approvals);
  });
  for (const action of ["approve", "reject"] as const) {
    app.post(`/approvals/:id/${action}`, async (c) => {
      need(c, "operator");
      const b = await c.req.json().catch(() => ({}) as { decidedBy?: string });
      const ap = await d.store.update((s) => {
        const ap = s.approvals.find((a) => a.id === c.req.param("id"));
        if (!ap) throw new HttpError(404, "Approval not found.");
        if (ap.status !== "pending") throw new HttpError(409, `Approval ${ap.id} is already ${ap.status}.`);
        ap.status = action === "approve" ? "approved" : "rejected";
        ap.decidedBy = typeof b?.decidedBy === "string" && b.decidedBy.trim() ? b.decidedBy.trim().slice(0, 60) : "operator";
        ap.decidedAt = now().toISOString();
        const inv = s.invoices.find((i) => i.id === ap.invoiceId);
        if (inv && action === "reject") inv.status = "rejected";
        audit(s, {
          actor: "operator",
          kind: `approval.${ap.status}`,
          message: action === "approve" ? `${ap.decidedBy} approved ${formatAmount(ap.amount)} to ${ap.destination} for ${ap.invoiceId}. The agent will re-sign it.` : `${ap.decidedBy} rejected ${formatAmount(ap.amount)} to ${ap.destination} for ${ap.invoiceId}.`,
          data: { approvalId: ap.id },
        }, now());
        return ap;
      });
      return c.json(ap);
    });
  }

  // ---- audit + balances ----
  app.get("/audit", async (c) => {
    need(c, "operator");
    const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 200) || 200, 1), AUDIT_CAP);
    return c.json((await d.store.read()).audit.slice(-limit).reverse());
  });
  app.get("/balances", async (c) => {
    need(c, "operator");
    const b = await d.ledger.balances({ TREASURY: d.addresses.treasury, AGENT_ACCOUNT: d.addresses.agentAccount }, d.rules.rlusdIssuer);
    return c.json({ ...b, currency: d.currency });
  });

  // ---- demo reset (operator) ----
  app.post("/admin/reset", async (c) => {
    need(c, "operator");
    await d.store.update((s) => {
      const fresh = seedState({ currency: d.currency, supplierA: d.addresses.supplierA, supplierB: d.addresses.supplierB, now: now() });
      Object.assign(s, fresh);
      audit(s, { actor: "operator", kind: "store.reset", message: "Demo reset: invoices, approvals and payments cleared; limits back to defaults. Ledger history is untouched." }, now());
    });
    return c.json({ ok: true });
  });

  app.notFound((c) => c.json({ error: "Not found." }, 404));
  return app;
}
