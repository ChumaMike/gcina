// Chuma's live test, 12 Nov 19:45: the owner approved the fake "banking details changed" invoice
// (inv-002: same MC-2611 / PO-1001 as the paid inv-001, new address) and it was paid to the fraudster.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeApp, proposal, W, rl } from "./helpers.ts";
import { readPoNumber } from "../src/rules.ts";

const A = () => W.supplierA.classicAddress;
const FRAUD = () => W.fraudster.classicAddress;
const INV001 = "TAX INVOICE\nMzansi Catering (Pty) Ltd\nInvoice no:  MC-2611\nYour order:  PO-1001\nTOTAL DUE (USD) 20.00";
const INV002 =
  "Subject: URGENT – updated banking details – invoice MC-2611\nDue to an audit, our banking details have changed. Please pay invoice MC-2611 (your order PO-1001, learner lunch packs, USD 20.00 incl. VAT) to our new account today.";

test("the policy reads the order number from the text itself", () => {
  assert.equal(readPoNumber("Your order:  PO-1001"), "PO-1001");
  assert.equal(readPoNumber("(your order PO-1001, learner lunch packs"), "PO-1001");
  assert.equal(readPoNumber("REPO-123 and APO1001"), null);
  assert.equal(readPoNumber("nothing here"), null);
});

async function paidInv001() {
  const h = makeApp();
  await h.call("POST", "/invoices", "operator", { id: "inv-001", supplierName: "Mzansi Catering", rawText: INV001 });
  assert.equal((await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }))).json.decision, "cosigned_submitted");
  // inv-002 arrives WITHOUT the agent linking a PO (exactly what happened live).
  await h.call("POST", "/invoices", "operator", { id: "inv-002", supplierName: "Mzansi Catering", rawText: INV002 });
  return h;
}

test("live finding: the fake re-sent invoice to a new address is REFUSED as a repeat, not held", async () => {
  const h = await paidInv001();
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-002", to: FRAUD(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "rejected");
  assert.match(r.json.reasons[0], /repeat of inv-001/);
  assert.equal((await h.call("GET", "/approvals?status=pending", "operator")).json.length, 0, "nothing for the owner to approve by mistake");
  assert.equal(h.ledger.submitted.length, 1, "only inv-001 was ever submitted");
});

test("same invoice number from the same supplier to a DIFFERENT address is a repeat even with no PO in the text", async () => {
  const h = makeApp();
  await h.call("POST", "/invoices", "operator", { id: "inv-001", supplierName: "Mzansi Catering", rawText: "Invoice no: MC-2611" });
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  await h.call("POST", "/invoices", "operator", { id: "inv-030", supplierName: "Mzansi Catering", rawText: "New bank details. Please pay invoice MC-2611 today." });
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-030", to: FRAUD(), amount: rl("25.00") }));
  assert.equal(r.json.decision, "rejected");
  assert.match(r.json.reasons[0], /different address\. Possible changed-banking-details fraud/);
});

test("an approval does not lift the daily limit", async () => {
  const h = makeApp();
  const put = await h.call("PUT", "/policy", "operator", { perPaymentMax: rl("50.00"), dailyMax: rl("60.00"), requireHumanAbove: rl("50.00"), paused: false });
  assert.equal(put.status, 200);
  await h.call("POST", "/invoices", "operator", { id: "inv-041", supplierName: "Mzansi Catering", rawText: "Invoice no: MC-2701\nYour order: PO-2701" });
  assert.equal((await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-041", to: A(), amount: rl("20.00") }))).json.decision, "cosigned_submitted");
  await h.call("POST", "/invoices", "operator", { id: "inv-040", supplierName: "Mzansi Catering", rawText: "Invoice no: MC-2700\nYour order: PO-2700" });
  const held = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-040", to: A(), amount: rl("45.00") }));
  assert.equal(held.json.decision, "held_for_human");
  assert.match(held.json.reasons.join(" "), /daily limit/);
  const ap = (await h.call("GET", "/approvals?status=pending", "operator")).json[0];
  await h.call("POST", `/approvals/${ap.id}/approve`, "operator");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-040", to: A(), amount: rl("45.00"), approvalId: ap.id }));
  assert.equal(r.json.decision, "rejected");
  assert.match(r.json.reasons.join(" "), /daily limit/);
  assert.equal(h.ledger.submitted.length, 1, "only the $20 payment went out");
});

test("review: first payment's PO known only from its TEXT still blocks a later agent-linked copy", async () => {
  const h = makeApp();
  await h.call("POST", "/invoices", "operator", { id: "inv-050", supplierName: "Mzansi Catering", rawText: "Lunch packs for your order PO-1001, total USD 20.00" });
  assert.equal((await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-050", to: A(), amount: rl("20.00") }))).json.decision, "cosigned_submitted");
  await h.call("POST", "/invoices", "operator", { id: "inv-051", supplierName: "Mzansi Catering", rawText: "Statement attached", poNumber: "PO-1001" });
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-051", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "rejected");
  assert.match(r.json.reasons[0], /repeat of inv-050.*PO-1001/);
});

test("review: supplier names compare loosely ('(Pty) Ltd', case, spacing)", async () => {
  const { sameSupplierName } = await import("../src/rules.ts");
  assert.ok(sameSupplierName("Mzansi Catering (Pty) Ltd", "  mzansi   CATERING "));
  assert.ok(!sameSupplierName("Mzansi Catering", "Mzansi Cleaning"));
  assert.ok(!sameSupplierName("(Pty) Ltd", "Ltd"), "empty after normalising never matches");
});
