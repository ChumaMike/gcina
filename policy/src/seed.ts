// Demo seed (CONTRACTS §5): 2 approved suppliers, PO-1001 and PO-1002, default limits.
import { fromMinor, type Currency, type Amount } from "./amount.ts";
import type { State } from "./types.ts";

/** Whole units (20 = $20.00 RLUSD or 20 XRP) in the payment currency. */
export function units(currency: Currency, n: number): Amount {
  return fromMinor(currency, BigInt(n) * (currency === "XRP" ? 1_000_000n : 100n));
}

export function seedState(opts: { currency: Currency; supplierA: string; supplierB: string; now?: Date }): State {
  const at = (opts.now ?? new Date()).toISOString();
  const u = (n: number) => units(opts.currency, n);
  return {
    version: 1,
    policy: { perPaymentMax: u(50), dailyMax: u(120), requireHumanAbove: u(30), paused: false, updatedAt: at, updatedBy: "seed" },
    suppliers: [
      { id: "sup-a", name: "Mzansi Meat Supplies", xrplAddress: opts.supplierA, status: "approved", createdAt: at },
      { id: "sup-b", name: "Khaya Packaging", xrplAddress: opts.supplierB, status: "approved", createdAt: at },
    ],
    purchaseOrders: [
      { poNumber: "PO-1001", supplierId: "sup-a", amount: u(20), description: "Meat order for the week", status: "open" },
      { poNumber: "PO-1002", supplierId: "sup-b", amount: u(45), description: "Takeaway packaging", status: "open" },
    ],
    invoices: [],
    proposals: [],
    approvals: [],
    approvalUses: [],
    payments: [],
    audit: [{ id: "evt-seed", at, actor: "policy", kind: "store.seeded", message: "Demo data loaded: 2 approved suppliers, 2 open orders, default limits." }],
  };
}
