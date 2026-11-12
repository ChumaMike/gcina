// Demo seed (CONTRACTS §5): 2 approved suppliers, PO-1001 and PO-1002, default limits.
import { fromMinor, type Currency, type Amount } from "./amount.ts";
import type { State } from "./types.ts";

/** Whole units (20 = $20.00 RLUSD or 20 XRP) in the payment currency. */
export function units(currency: Currency, n: number): Amount {
  return fromMinor(currency, BigInt(n) * (currency === "XRP" ? 1_000_000n : 100n));
}

export function seedState(opts: { currency: Currency; supplierA: string; supplierB: string; now?: Date }): State {
  const now = opts.now ?? new Date();
  const at = now.toISOString();
  // Long-standing suppliers: approved 30 days ago, so a production cooling-off (e.g. 24 h) never blocks them.
  const longAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const u = (n: number) => units(opts.currency, n);
  return {
    version: 1,
    policy: { perPaymentMax: u(50), dailyMax: u(120), requireHumanAbove: u(30), paused: false, updatedAt: at, updatedBy: "seed" },
    suppliers: [
      { id: "sup-a", name: "Mzansi Catering", xrplAddress: opts.supplierA, status: "approved", createdAt: longAgo, approvedAt: longAgo },
      { id: "sup-b", name: "Khaya Print & Stationery", xrplAddress: opts.supplierB, status: "approved", createdAt: longAgo, approvedAt: longAgo },
    ],
    purchaseOrders: [
      { poNumber: "PO-1001", supplierId: "sup-a", amount: u(20), description: "Learner lunch packs", status: "open" },
      { poNumber: "PO-1002", supplierId: "sup-b", amount: u(45), description: "Learner packs (print & stationery)", status: "open" },
    ],
    invoices: [],
    proposals: [],
    approvals: [],
    approvalUses: [],
    payments: [],
    inflight: [],
    audit: [{ id: "evt-seed", at, actor: "policy", kind: "store.seeded", message: "Demo data loaded: 2 approved suppliers, 2 open orders, default limits." }],
  };
}
