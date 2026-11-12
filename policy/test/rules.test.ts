// Every co-sign rule: a passing and a failing case. Run: pnpm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeApp, proposal, payment, W, rl } from "./helpers.ts";

const A = () => W.supplierA.classicAddress;
const B = () => W.supplierB.classicAddress;

async function paidInv001(h: ReturnType<typeof makeApp>) {
  await h.invoice("inv-001", "Mzansi Meat Supplies", "PO-1001");
  return h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00"), supplierId: "sup-a" }));
}

// ---- happy path (rule 8) ----
test("rule 8: approved supplier inside limits → co-signed, invoice + PO paid, audit written", async () => {
  const h = makeApp();
  const r = await paidInv001(h);
  assert.equal(r.status, 200);
  assert.equal(r.json.decision, "cosigned_submitted");
  assert.match(r.json.txHash, /^HASH1/);
  assert.equal(r.json.ledgerResult, "tesSUCCESS");
  const s = await h.store.read();
  assert.equal(s.invoices[0].status, "paid");
  assert.equal(s.purchaseOrders.find((p) => p.poNumber === "PO-1001")!.status, "paid");
  assert.ok(s.audit.some((e) => e.kind === "proposal.cosigned" && e.txHash === r.json.txHash));
  // the policy signs the agent's exact tx with Signers stripped
  assert.equal(h.ledger.submitted[0].Signers, undefined);
  assert.equal(h.ledger.submitted[0].Destination, A());
});

// ---- rule 1 ----
test("rule 1: paused → rejected, nothing submitted", async () => {
  const h = makeApp();
  await h.call("PUT", "/policy", "operator", { paused: true });
  await h.invoice("inv-001");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "rejected");
  assert.match(r.json.reasons[0], /paused/);
  assert.equal(h.ledger.submitted.length, 0);
});

// ---- rule 2: signed tx must match the proposal ----
const mismatchCases: Array<[string, (to: string) => { tx?: Record<string, unknown>; to?: string; amount?: ReturnType<typeof rl>; invoiceId?: string; signer?: typeof W.stranger }]> = [
  ["amount differs (signs 45, proposes 20)", (to) => ({ tx: payment({ to, amount: rl("45.00"), invoiceId: "inv-001" }) })],
  ["destination differs (signs fraudster, proposes supplier)", (to) => ({ tx: payment({ to: W.fraudster.classicAddress, amount: rl("20.00"), invoiceId: "inv-001" }), to })],
  ["memo invoice differs", (to) => ({ tx: payment({ to, amount: rl("20.00"), invoiceId: "inv-999" }) })],
  ["not a Payment (SignerListSet takeover)", () => ({ tx: { TransactionType: "AccountSet", Account: W.agentAccount.classicAddress, Fee: "36", Sequence: 1, LastLedgerSequence: 1020, SetFlag: 4 } })],
  ["from another account", (to) => ({ tx: { ...payment({ to, amount: rl("20.00"), invoiceId: "inv-001" }), Account: W.stranger.classicAddress } })],
  ["partial payment flag", (to) => ({ tx: payment({ to, amount: rl("20.00"), invoiceId: "inv-001", extra: { Flags: 0x00020000 } }) })],
  ["SendMax set", (to) => ({ tx: payment({ to, amount: rl("20.00"), invoiceId: "inv-001", extra: { SendMax: "999999999" } }) })],
  ["fee burn above cap", (to) => ({ tx: payment({ to, amount: rl("20.00"), invoiceId: "inv-001", extra: { Fee: "5000000" } }) })],
  ["expiry too far away", (to) => ({ tx: payment({ to, amount: rl("20.00"), invoiceId: "inv-001", extra: { LastLedgerSequence: 999999 } }) })],
  ["signed by a key that isn't the agent's", () => ({ signer: W.stranger })],
  ["RLUSD from a fake issuer", (to) => ({ tx: payment({ to, amount: rl("20.00"), invoiceId: "inv-001", extra: { Amount: { currency: "524C555344000000000000000000000000000000", issuer: W.stranger.classicAddress, value: "20" } } }) })],
];
for (const [name, mk] of mismatchCases) {
  test(`rule 2 fails: ${name} → rejected "doesn't match proposal"`, async () => {
    const h = makeApp();
    await h.invoice("inv-001");
    const m = mk(A());
    const p = proposal({ invoiceId: "inv-001", to: m.to ?? A(), amount: rl("20.00"), tx: m.tx, signer: m.signer });
    const r = await h.call("POST", "/proposals", "agent", p);
    assert.equal(r.json.decision, "rejected");
    assert.match(r.json.reasons.join(" "), /signed transaction doesn't match the proposal/);
    assert.equal(h.ledger.submitted.length, 0);
  });
}

test("rule 2 fails: tampered signature → rejected", async () => {
  const h = makeApp();
  await h.invoice("inv-001");
  const p = proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") });
  // flip a byte inside the signature region (end of blob is memo; signature sits before it)
  const i = p.agentSignedTxBlob.indexOf("7440") + 20;
  p.agentSignedTxBlob = p.agentSignedTxBlob.slice(0, i) + (p.agentSignedTxBlob[i] === "A" ? "B" : "A") + p.agentSignedTxBlob.slice(i + 1);
  const r = await h.call("POST", "/proposals", "agent", p);
  assert.equal(r.json.decision, "rejected");
  assert.equal(h.ledger.submitted.length, 0);
});

test("rule 2 passes: '20' on the ledger equals '20.00' proposed (cents-exact)", async () => {
  const h = makeApp();
  await h.invoice("inv-001");
  const tx = payment({ to: A(), amount: rl("20.00"), invoiceId: "inv-001", extra: { Amount: { currency: "524C555344000000000000000000000000000000", issuer: "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV", value: "20" } } });
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00"), tx }));
  assert.equal(r.json.decision, "cosigned_submitted");
});

// ---- rule 3 ----
test("rule 3 fails: changed banking details (fraudster address) → held with fraud reason + approval queued", async () => {
  const h = makeApp();
  await h.invoice("inv-002");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-002", to: W.fraudster.classicAddress, amount: rl("20.00"), supplierId: "sup-a" }));
  assert.equal(r.json.decision, "held_for_human");
  assert.match(r.json.reasons[0], /Destination is not the registered address for Mzansi Meat Supplies\. Possible changed-banking-details fraud\./);
  const ap = await h.call("GET", "/approvals?status=pending", "operator");
  assert.equal(ap.json.length, 1);
  assert.equal((await h.store.read()).invoices[0].status, "held");
});

test("rule 3 fails: supplier pending (not yet approved by a person) → held", async () => {
  const h = makeApp();
  await h.call("PATCH", "/suppliers/sup-a", "operator", { status: "pending" });
  await h.invoice("inv-001");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "held_for_human");
});

test("rule 3 fails: another approved supplier's address for this supplier's invoice → held", async () => {
  const h = makeApp();
  await h.invoice("inv-001");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: B(), amount: rl("20.00"), supplierId: "sup-a" }));
  assert.equal(r.json.decision, "held_for_human");
});

// ---- rule 4 ----
test("rule 4 fails: above per-payment max → held", async () => {
  const h = makeApp();
  await h.call("PUT", "/policy", "operator", { requireHumanAbove: rl("50.00") });
  await h.invoice("inv-010", "Khaya Packaging");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-010", to: B(), amount: rl("50.01") }));
  assert.equal(r.json.decision, "held_for_human");
  assert.match(r.json.reasons.join(" "), /per-payment limit of \$ 50\.00 RLUSD/);
});

test("rule 4 fails: today's (SAST) total would pass the daily max → held; passes under it", async () => {
  const h = makeApp();
  await h.call("PUT", "/policy", "operator", { dailyMax: rl("50.00"), perPaymentMax: rl("30.00") });
  await h.invoice("inv-a", "Khaya Packaging", undefined, "box order one");
  await h.invoice("inv-b", "Khaya Packaging", undefined, "box order two");
  const ok = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-a", to: B(), amount: rl("30.00") }));
  assert.equal(ok.json.decision, "cosigned_submitted");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-b", to: B(), amount: rl("20.01") }));
  assert.equal(r.json.decision, "held_for_human");
  assert.match(r.json.reasons.join(" "), /daily limit/);
});

test("rule 4 fails: payment in XRP while limits are in RLUSD → held", async () => {
  const h = makeApp();
  await h.invoice("inv-001");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: { currency: "XRP", value: "20000000" } }));
  assert.equal(r.json.decision, "held_for_human");
});

// ---- rule 5 ----
test("rule 5 fails: above requireHumanAbove (45 > 30) → held; 30.00 exactly passes", async () => {
  const h = makeApp();
  await h.invoice("inv-003", "Khaya Packaging", "PO-1002");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-003", to: B(), amount: rl("45.00") }));
  assert.equal(r.json.decision, "held_for_human");
  assert.match(r.json.reasons.join(" "), /approve payments yourself/);
  await h.invoice("inv-030", "Khaya Packaging", undefined, "thirty exactly");
  const ok = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-030", to: B(), amount: rl("30.00") }));
  assert.equal(ok.json.decision, "cosigned_submitted");
});

// ---- rule 6 ----
test("rule 6 fails: same invoice id again → rejected as duplicate", async () => {
  const h = makeApp();
  await paidInv001(h);
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "rejected");
  assert.match(r.json.reasons[0], /already been paid/);
});

test("rule 6 fails: inv-004 re-bills an already-paid PO → rejected (even with the daily limit used up, C14)", async () => {
  const h = makeApp();
  await paidInv001(h);
  await h.call("PUT", "/policy", "operator", { dailyMax: rl("20.00"), perPaymentMax: rl("20.00") });
  await h.invoice("inv-004", "Mzansi Meat Supplies", "PO-1001");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-004", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "rejected");
  assert.match(r.json.reasons[0], /duplicate/);
});

test("rule 6 fails: identical invoice text under a new id → rejected", async () => {
  const h = makeApp();
  await h.invoice("inv-001", "Mzansi Meat Supplies", undefined, "Invoice INV-77 Mzansi Meat 20 RLUSD for PO-1001");
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-001", to: A(), amount: rl("20.00") }));
  await h.invoice("inv-004", "Mzansi Meat Supplies", undefined, "Invoice INV-77 Mzansi Meat 20 RLUSD for PO-1001");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-004", to: A(), amount: rl("20.00") }));
  assert.equal(r.json.decision, "rejected");
});

test("rule 6 passes: a different invoice to the same supplier is fine", async () => {
  const h = makeApp();
  await paidInv001(h);
  await h.invoice("inv-005", "Mzansi Meat Supplies", undefined, "Invoice 5 chicken 5 RLUSD");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-005", to: A(), amount: rl("5.00") }));
  assert.equal(r.json.decision, "cosigned_submitted");
});

// ---- rule 7 ----
async function heldInv003(h: ReturnType<typeof makeApp>) {
  await h.invoice("inv-003", "Khaya Packaging", "PO-1002");
  await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-003", to: B(), amount: rl("45.00") }));
  return (await h.call("GET", "/approvals?status=pending", "operator")).json[0];
}

test("rule 7 passes: human approves → agent re-signs a fresh tx with approvalId → co-signed once", async () => {
  const h = makeApp();
  const ap = await heldInv003(h);
  assert.equal((await h.call("GET", "/approvals?status=approved", "agent")).json.length, 0);
  await h.call("POST", `/approvals/${ap.id}/approve`, "operator", { decidedBy: "Chuma" });
  assert.equal((await h.call("GET", "/approvals?status=approved", "agent")).json.length, 1);
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-003", to: B(), amount: rl("45.00"), approvalId: ap.id }));
  assert.equal(r.json.decision, "cosigned_submitted");
  assert.equal((await h.call("GET", "/approvals?status=approved", "agent")).json.length, 0, "used approvals disappear from the agent's queue");
  const again = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-003", to: B(), amount: rl("45.00"), approvalId: ap.id }));
  assert.equal(again.json.decision, "rejected");
});

test("rule 7 fails: approval used for a different amount or destination → rejected", async () => {
  const h = makeApp();
  const ap = await heldInv003(h);
  await h.call("POST", `/approvals/${ap.id}/approve`, "operator");
  const more = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-003", to: B(), amount: rl("49.00"), approvalId: ap.id }));
  assert.equal(more.json.decision, "rejected");
  const elsewhere = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-003", to: W.fraudster.classicAddress, amount: rl("45.00"), approvalId: ap.id }));
  assert.equal(elsewhere.json.decision, "rejected");
  assert.equal(h.ledger.submitted.length, 0);
});

test("rule 7 fails: approval still pending, or rejected by the human → rejected", async () => {
  const h = makeApp();
  const ap = await heldInv003(h);
  const pending = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-003", to: B(), amount: rl("45.00"), approvalId: ap.id }));
  assert.equal(pending.json.decision, "rejected");
  await h.call("POST", `/approvals/${ap.id}/reject`, "operator");
  const r = await h.call("POST", "/proposals", "agent", proposal({ invoiceId: "inv-003", to: B(), amount: rl("45.00"), approvalId: ap.id }));
  assert.equal(r.json.decision, "rejected");
});

// ---- ledger refusal after co-signing ----
test("ledger refuses after co-sign (e.g. tecPATH_DRY) → rejected, invoice not paid", async () => {
  const h = makeApp();
  h.ledger.next = { engineResult: "tecPATH_DRY", validated: true };
  const r = await paidInv001(h);
  assert.equal(r.json.decision, "rejected");
  assert.equal(r.json.ledgerResult, "tecPATH_DRY");
  assert.notEqual((await h.store.read()).invoices[0].status, "paid");
});
