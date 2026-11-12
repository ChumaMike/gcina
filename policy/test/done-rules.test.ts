// DONE.md L#2: duplicate = same invoice OR same payee + amount + reference; cooling-off; no double pay
// when a co-signed tx's outcome is unknown; spentToday; the agent's direct-attempt audit event.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeApp, proposal, W, rl } from "./helpers.ts";
import { readReference } from "../src/rules.ts";

const A = () => W.supplierA.classicAddress;
const B = () => W.supplierB.classicAddress;
const MC2611 = (lead = "") => `${lead}TAX INVOICE\nMzansi Catering (Pty) Ltd\nInvoice no:  MC-2611\nYour order:  PO-1001\nTOTAL DUE (USD) 20.00`;

test("reference is read from the invoice text by the policy itself", () => {
  assert.equal(readReference(MC2611()), "MC-2611");
  assert.equal(readReference("please pay invoice MC-2611 (your order PO-1001)"), "MC-2611");
  assert.equal(readReference("Invoice #KPS-0937"), "KPS-0937");
  assert.equal(readReference("no reference here"), null);
});

test("rule 6: forwarded copy (new id, no PO given) of a paid invoice → 'Looks like a repeat of inv-001'", async () => {
  const h = makeApp();
  await h.call("POST", "/invoices", "operator", { id: "inv-001", supplierName: "Mzansi Catering", rawText: MC2611() });
  assert.equal((await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }))).json.decision, "cosigned_submitted");
  await h.call("POST", "/invoices", "operator", { id: "inv-004", supplierName: "Mzansi Catering", rawText: MC2611("Fwd: Mzansi lunches, please pay\n") });
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-004", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "rejected");
  // Caught by the order number the policy reads from the text (PO-1001), before the invoice-number check.
  assert.match(r.json.reasons[0], /^Looks like a repeat of inv-001, paid .+: (order PO-1001 has already been paid|same supplier, same amount, same invoice number MC-2611)\.$/);
});

test("rule 6 passes: same supplier + same amount but a DIFFERENT reference and order (next week's lunches)", async () => {
  const h = makeApp();
  await h.call("POST", "/invoices", "operator", { id: "inv-001", supplierName: "Mzansi Catering", rawText: MC2611() });
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  await h.call("POST", "/invoices", "operator", { id: "inv-009", supplierName: "Mzansi Catering", rawText: "Invoice no: MC-2650\nYour order: PO-1009" });
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-009", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "cosigned_submitted");
});

test("rule 6 passes: same reference but a different amount is not a repeat (e.g. a balance payment)", async () => {
  const h = makeApp();
  await h.call("POST", "/invoices", "operator", { id: "inv-001", supplierName: "Mzansi Catering", rawText: MC2611() });
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  await h.call("POST", "/invoices", "operator", { id: "inv-011", supplierName: "Mzansi Catering", rawText: "Invoice no: MC-2611 balance" });
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-011", to: A(), amount: rl("5.00") }));
  assert.equal(r.json.decision, "cosigned_submitted");
});

test("cooling-off: an address approved minutes ago is held; with COOLING_OFF_MINUTES=0 it pays", async () => {
  for (const [mins, want] of [[1440, "held_for_human"], [0, "cosigned_submitted"]] as const) {
    const h = makeApp({ coolingOffMinutes: mins });
    const sup = await h.call("POST", "/suppliers", "operator", { name: "New Bakery", xrplAddress: W.stranger.classicAddress, status: "approved" });
    assert.ok(sup.json.approvedAt);
    await h.invoice("inv-020", "New Bakery");
    const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-020", to: W.stranger.classicAddress, amount: rl("10.00"), supplierId: sup.json.id }));
    assert.equal(r.json.decision, want, `cooling-off ${mins}`);
    if (mins) assert.match(r.json.reasons.join(" "), /New account approved recently: cooling-off/);
  }
});

test("cooling-off never blocks long-standing (seeded) suppliers", async () => {
  const h = makeApp({ coolingOffMinutes: 1440 });
  await h.invoice("inv-001", "Mzansi Catering", "PO-1001");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "cosigned_submitted");
});

test("NO DOUBLE PAY: ledger goes quiet after submit → unknown; a re-sign is refused until the first tx settles", async () => {
  const h = makeApp();
  await h.invoice("inv-001", "Mzansi Catering", "PO-1001");
  h.ledger.submitThrows = true;
  const first = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  assert.equal(first.json.decision, "rejected");
  assert.equal(first.json.ledgerResult, "unknown");
  assert.match(first.json.reasons[0], /do not re-sign/);
  h.ledger.submitThrows = false;

  // still pending on the ledger → refuse to sign anything new for this invoice
  h.ledger.lookupState = { state: "pending" };
  const retry = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  assert.equal(retry.json.decision, "rejected");
  assert.match(retry.json.reasons[0], /still on its way/);
  assert.equal(h.ledger.submitted.length, 1, "nothing new co-signed");

  // it validated after all → recorded as paid, and the retry is a repeat
  h.ledger.lookupState = { state: "validated", result: "tesSUCCESS" };
  const again = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  assert.equal(again.json.decision, "rejected");
  assert.match(again.json.reasons[0], /already been paid/);
  const s = await h.store.read();
  assert.equal(s.payments.length, 1);
  assert.equal(s.invoices[0].status, "paid");
  assert.equal(s.inflight.length, 0);
});

test("unknown outcome that EXPIRED (past LastLedgerSequence) → cleared, a fresh signature is allowed", async () => {
  const h = makeApp();
  await h.invoice("inv-001", "Mzansi Catering", "PO-1001");
  h.ledger.submitThrows = true;
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  h.ledger.submitThrows = false;
  h.ledger.lookupState = { state: "expired" };
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "cosigned_submitted");
  assert.equal((await h.store.read()).payments.length, 1);
});

test("the in-flight guard is per invoice: other invoices still pay", async () => {
  const h = makeApp();
  await h.invoice("inv-001", "Mzansi Catering", "PO-1001");
  await h.invoice("inv-005", "Khaya Print & Stationery", undefined, "Invoice KPS-1 pens");
  h.ledger.submitThrows = true;
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  h.ledger.submitThrows = false;
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-005", to: B(), amount: rl("5.00") }));
  assert.equal(r.json.decision, "cosigned_submitted");
});

test("GET /policy carries spentToday (SAST) and coolingOffMinutes", async () => {
  const h = makeApp();
  await h.invoice("inv-001", "Mzansi Catering", "PO-1001");
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  const p = await h.call("GET", "/policy", "operator");
  assert.deepEqual(p.json.spentToday, rl("20.00"));
  assert.equal(p.json.coolingOffMinutes, 0);
});

test("audit shapes: payment events carry invoiceId+amount+txHash; held events carry reasons + approvalId", async () => {
  const h = makeApp();
  await h.invoice("inv-001", "Mzansi Catering", "PO-1001");
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  await h.invoice("inv-002", "Mzansi Catering", undefined, "URGENT new banking details");
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-002", to: W.fraudster.classicAddress, amount: rl("20.00"), supplierId: "sup-a" }));
  const audit = (await h.call("GET", "/audit", "operator")).json as any[];
  const paid = audit.find((e) => e.kind === "payment.validated");
  assert.equal(paid.data.invoiceId, "inv-001");
  assert.deepEqual(paid.data.amount, rl("20.00"));
  assert.ok(paid.txHash);
  const held = audit.find((e) => e.kind === "proposal.held");
  assert.equal(held.data.invoiceId, "inv-002");
  assert.ok(held.data.approvalId?.startsWith("apr-"));
  assert.ok(held.data.reasons.length >= 1);
});

test("POST /audit/agent-events: tefBAD_QUORUM recorded as 'Ledger refused: agent alone', no txHash; operator can't post", async () => {
  const h = makeApp();
  const body = { kind: "ledger.direct_attempt", invoiceId: "inv-002b", destination: W.fraudster.classicAddress, engine_result: "tefBAD_QUORUM", engine_result_message: "Signatures provided do not meet the quorum.", applied: false };
  const r = await h.call("POST", "/audit/agent-events", "agent", body);
  assert.equal(r.status, 201);
  assert.match(r.json.message, /^Ledger refused: agent alone \(tefBAD_QUORUM\)/);
  assert.equal(r.json.txHash, undefined);
  assert.equal(r.json.data.engine_result, "tefBAD_QUORUM");
  assert.equal((await h.call("POST", "/audit/agent-events", "operator", body)).status, 403);
  assert.equal((await h.call("POST", "/audit/agent-events", "agent", { ...body, kind: "policy.updated" })).status, 400);
  assert.equal((await h.call("POST", "/audit/agent-events", "agent", { ...body, engine_result: "<script>" })).status, 400);
});

test("POST /audit/agent-events agent.thought: stored as the agent's note, capped and cleaned; never changes an invoice", async () => {
  const h = makeApp();
  const t = { kind: "agent.thought", invoiceId: "inv-001", step: "read", text: "Reading the invoice\u0007 from Mzansi Catering" };
  const r = await h.call("POST", "/audit/agent-events", "agent", t);
  assert.equal(r.status, 201);
  assert.equal(r.json.actor, "agent");
  assert.equal(r.json.kind, "agent.thought");
  assert.equal(r.json.message, "Reading the invoice from Mzansi Catering");
  assert.deepEqual(r.json.data, { invoiceId: "inv-001", step: "read" });
  assert.equal((await h.call("POST", "/audit/agent-events", "agent", { ...t, text: "x".repeat(900) })).json.message.length, 240);
  assert.equal((await h.call("POST", "/audit/agent-events", "operator", t)).status, 403);
  assert.equal((await h.call("POST", "/audit/agent-events", "agent", { ...t, step: "pay" })).status, 400);
  assert.equal((await h.call("POST", "/audit/agent-events", "agent", { ...t, text: "   " })).status, 400);
  assert.equal((await h.call("POST", "/audit/agent-events", "agent", { ...t, invoiceId: "a b" })).status, 400);
});
