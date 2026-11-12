// Regression tests for the automated security review of d3e3247 (all three findings).
import { test } from "node:test";
import assert from "node:assert/strict";
import { Wallet } from "xrpl";
import { makeApp, proposal, W, rl } from "./helpers.ts";
import { XrplLedger } from "../src/ledger.ts";

const A = () => W.supplierA.classicAddress;
const B = () => W.supplierB.classicAddress;

// ---- finding 1: repeat detection must fail closed ----
test("[review 1] order already paid → refused even for a DIFFERENT amount and destination", async () => {
  const h = makeApp();
  await h.invoice("inv-001", "Mzansi Catering", "PO-1001");
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  await h.invoice("inv-004", "Khaya Print & Stationery", "PO-1001", "different text entirely");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-004", to: B(), amount: rl("19.00") }));
  assert.equal(r.json.decision, "rejected");
  assert.match(r.json.reasons[0], /order PO-1001 has already been paid/);
});

test("[review 1] identical invoice text check is back (no reference, no PO)", async () => {
  const h = makeApp();
  await h.call("POST", "/invoices", "operator", { id: "inv-001", supplierName: "Mzansi Catering", rawText: "lunch packs for the week, 20 dollars" });
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  await h.call("POST", "/invoices", "operator", { id: "inv-004", supplierName: "Mzansi Catering", rawText: "lunch packs for the week,  20 dollars" });
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-004", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "rejected");
});

test("[review 1] the agent's reference can add a match but can't hide the policy's own reading", async () => {
  const h = makeApp();
  await h.call("POST", "/invoices", "operator", { id: "inv-001", supplierName: "Mzansi Catering", rawText: "Invoice no: MC-2611" });
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  await h.call("POST", "/invoices", "operator", { id: "inv-004", supplierName: "Mzansi Catering", rawText: "Fwd: Invoice no: MC-2611 please pay" });
  const p = { ...proposal({ invoiceId: "inv-004", to: A(), amount: rl("20.00") }), reference: "TOTALLY-NEW-1" };
  const r = await h.call("POST", "/proposals", "agent", p);
  assert.equal(r.json.decision, "rejected");
  assert.match(r.json.reasons[0], /MC-2611/);
});

test("[review 1] the agent can match an invoice to an order once, never move it to another order", async () => {
  const h = makeApp();
  await h.invoice("inv-004");
  assert.equal((await h.call("PATCH", "/invoices/inv-004", "agent", { poNumber: "PO-1001" })).status, 200);
  assert.equal((await h.call("PATCH", "/invoices/inv-004", "agent", { poNumber: "PO-9999" })).status, 403);
  assert.equal((await h.call("PATCH", "/invoices/inv-004", "operator", { poNumber: "PO-1002" })).status, 200);
});

// ---- finding 2: 'expired' only when the server searched the whole range ----
function stubLedger(validatedIndex: number, txError: { error: string; searched_all?: boolean } | null, txResult?: unknown) {
  const l = new XrplLedger("wss://s.altnet.rippletest.net:51233", Wallet.generate().seed!);
  const anyL = l as unknown as { ready: () => Promise<void>; client: { request: (r: { command: string }) => Promise<unknown> } };
  anyL.ready = async () => {};
  anyL.client = {
    request: async (r: { command: string }) => {
      if (r.command === "ledger") return { result: { ledger_index: validatedIndex } };
      if (txError) throw Object.assign(new Error(txError.error), { data: txError });
      return { result: txResult };
    },
  } as never;
  return l;
}

test("[review 2] txnNotFound past expiry but NOT searched_all → pending (fail closed)", async () => {
  assert.deepEqual(await stubLedger(2000, { error: "txnNotFound", searched_all: false }).lookup("H", 900, 1020), { state: "pending" });
  assert.deepEqual(await stubLedger(2000, { error: "txnNotFound" }).lookup("H", 900, 1020), { state: "pending" });
});

test("[review 2] txnNotFound with searched_all but expiry not yet passed → pending", async () => {
  assert.deepEqual(await stubLedger(1010, { error: "txnNotFound", searched_all: true }).lookup("H", 900, 1020), { state: "pending" });
});

test("[review 2] txnNotFound, searched_all and past expiry → expired; validated tx → its result", async () => {
  assert.deepEqual(await stubLedger(2000, { error: "txnNotFound", searched_all: true }).lookup("H", 900, 1020), { state: "expired" });
  const v = await stubLedger(2000, null, { validated: true, meta: { TransactionResult: "tesSUCCESS" } }).lookup("H", 900, 1020);
  assert.equal(v.state, "validated");
});

test("[review 2] any other lookup error propagates (the caller then refuses to re-sign)", async () => {
  await assert.rejects(stubLedger(2000, { error: "noNetwork" }).lookup("H", 900, 1020));
});

// ---- finding 3: unsettled co-signed payments count everywhere ----
async function unsettledInv001(h: ReturnType<typeof makeApp>) {
  await h.call("POST", "/invoices", "operator", { id: "inv-001", supplierName: "Mzansi Catering", rawText: "Invoice no: MC-2611", poNumber: "PO-1001" });
  h.ledger.submitThrows = true;
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  h.ledger.submitThrows = false;
  assert.equal(r.json.ledgerResult, "unknown");
}

test("[review 3] an unsettled co-signed payment counts toward today's daily limit", async () => {
  const h = makeApp();
  await h.call("PUT", "/policy", "operator", { dailyMax: rl("30.00"), perPaymentMax: rl("30.00") });
  await unsettledInv001(h);
  await h.invoice("inv-006", "Khaya Print & Stationery", undefined, "Invoice KPS-7 pens");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-006", to: B(), amount: rl("15.00") }));
  assert.equal(r.json.decision, "held_for_human");
  assert.match(r.json.reasons.join(" "), /daily limit/);
});

test("[review 3] a forwarded copy of an UNSETTLED payment is refused as a repeat (cross-invoice)", async () => {
  const h = makeApp();
  await unsettledInv001(h);
  await h.call("POST", "/invoices", "operator", { id: "inv-004", supplierName: "Mzansi Catering", rawText: "Fwd: Invoice no: MC-2611" });
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-004", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "rejected");
  assert.match(r.json.reasons[0], /still settling/);
  assert.equal(h.ledger.submitted.length, 1);
});
