// Two-token auth and the operator/agent split. Run: pnpm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeApp, rl } from "./helpers.ts";
import { toMinor, fromLedgerAmount, RLUSD_HEX, RLUSD_TESTNET_ISSUER } from "../src/amount.ts";
import { sastDay } from "../src/rules.ts";

test("no token → 401; health is public", async () => {
  const h = makeApp();
  assert.equal((await h.call("GET", "/policy", null)).status, 401);
  assert.equal((await h.call("GET", "/health", null)).status, 200);
});

test("agent token → 403 on every operator-only route", async () => {
  const h = makeApp();
  const routes: Array<[string, string, unknown?]> = [
    ["PUT", "/policy", { paused: true }],
    ["POST", "/suppliers", { name: "x", xrplAddress: "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV" }],
    ["PATCH", "/suppliers/sup-a", { status: "approved" }],
    ["POST", "/purchase-orders", {}],
    ["POST", "/invoices", { supplierName: "x", rawText: "y" }],
    ["GET", "/approvals"],
    ["POST", "/approvals/apr-x/approve"],
    ["POST", "/approvals/apr-x/reject"],
    ["GET", "/audit"],
    ["GET", "/balances"],
    ["POST", "/admin/reset"],
  ];
  for (const [m, p, b] of routes) assert.equal((await h.call(m, p, "agent", b)).status, 403, `${m} ${p}`);
  assert.equal((await h.store.read()).policy.paused, false);
});

test("operator token can't submit proposals (only the agent proposes)", async () => {
  const h = makeApp();
  assert.equal((await h.call("POST", "/proposals", "operator", {})).status, 403);
});

test("agent can read suppliers, POs, new invoices; can mark processing but never paid", async () => {
  const h = makeApp();
  await h.invoice("inv-001");
  assert.equal((await h.call("GET", "/suppliers", "agent")).status, 200);
  assert.equal((await h.call("GET", "/purchase-orders", "agent")).status, 200);
  assert.equal((await h.call("GET", "/invoices?status=new", "agent")).json.length, 1);
  assert.equal((await h.call("PATCH", "/invoices/inv-001", "agent", { status: "processing", poNumber: "PO-1001" })).status, 200);
  assert.equal((await h.call("PATCH", "/invoices/inv-001", "agent", { status: "paid" })).status, 403);
});

test("PUT /policy validates currency and per-payment ≤ daily; every change is audited", async () => {
  const h = makeApp();
  assert.equal((await h.call("PUT", "/policy", "operator", { perPaymentMax: { currency: "XRP", value: "1" } })).status, 400);
  assert.equal((await h.call("PUT", "/policy", "operator", { perPaymentMax: rl("20.005") })).status, 400);
  assert.equal((await h.call("PUT", "/policy", "operator", { perPaymentMax: rl("500.00") })).status, 400);
  const ok = await h.call("PUT", "/policy", "operator", { requireHumanAbove: rl("10.00"), updatedBy: "Chuma" });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.updatedBy, "Chuma");
  const audit = await h.call("GET", "/audit", "operator");
  assert.equal(audit.json[0].kind, "policy.updated");
});

test("changing a supplier's address puts it back to pending (needs a person again)", async () => {
  const h = makeApp();
  const r = await h.call("PATCH", "/suppliers/sup-a", "operator", { xrplAddress: "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV" });
  assert.equal(r.json.status, "pending");
});

test("audit never contains a seed", async () => {
  const h = makeApp();
  await h.invoice("inv-001");
  const text = JSON.stringify((await h.store.read()).audit);
  assert.doesNotMatch(text, /\bs[a-km-zA-HJ-NP-Z1-9]{28}\b/);
});

test("money: cents-exact, no floats", () => {
  assert.equal(toMinor(rl("20.10")), 2010n);
  assert.equal(toMinor(rl("0.1")), 10n);
  assert.throws(() => toMinor(rl("1e3")));
  assert.throws(() => toMinor(rl("-1.00")));
  assert.deepEqual(fromLedgerAmount({ currency: RLUSD_HEX, issuer: RLUSD_TESTNET_ISSUER, value: "2e1" }), rl("20.00"));
  assert.equal(fromLedgerAmount({ currency: RLUSD_HEX, issuer: RLUSD_TESTNET_ISSUER, value: "20.001" }), null);
});

test("SAST day boundary: 22:30 UTC is already tomorrow in South Africa", () => {
  assert.equal(sastDay(new Date("2026-11-12T21:59:00Z")), "2026-11-12");
  assert.equal(sastDay(new Date("2026-11-12T22:30:00Z")), "2026-11-13");
});
