// Contract types, copied from CONTRACTS.md §2 + §3 (never imported across folders).
// §2: read every `xxxDrops: Drops` as `xxx: Amount`. `normalize.ts` also accepts the old
// `*Drops` field names, so the UI keeps working whichever shape the policy service sends.

export type Drops = string; // integer string
export type Currency = "RLUSD" | "XRP";
/** RLUSD: decimal string (e.g. "20.00"). XRP: drops (integer string). */
export type Amount = { currency: Currency; value: string };

export type Policy = {
  perPaymentMax: Amount;
  dailyMax: Amount;
  requireHumanAbove: Amount;
  paused: boolean;
  updatedAt: string;
  updatedBy: string;
};

export type SupplierStatus = "approved" | "pending" | "blocked";
export type Supplier = {
  id: string;
  name: string;
  xrplAddress: string;
  status: SupplierStatus;
  createdAt: string;
};

export type InvoiceStatus = "new" | "processing" | "paid" | "held" | "rejected";
export type Invoice = {
  id: string;
  supplierName: string;
  rawText: string;
  receivedAt: string;
  status: InvoiceStatus;
  poNumber?: string;
};

export type PurchaseOrder = {
  poNumber: string;
  supplierId: string;
  amount: Amount;
  description: string;
  status: "open" | "paid";
};

export type Proposal = {
  invoiceId: string;
  supplierId: string | null;
  destination: string;
  amount: Amount;
  reasoning: string;
  agentSignedTxBlob: string;
  approvalId?: string;
};

export type Decision = {
  proposalId: string;
  decision: "cosigned_submitted" | "held_for_human" | "rejected";
  reasons: string[];
  txHash?: string;
  ledgerResult?: string;
  explorerUrl?: string;
};

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type Approval = {
  id: string;
  proposalId: string;
  invoiceId: string;
  amount: Amount;
  destination: string;
  reasons: string[];
  status: ApprovalStatus;
  decidedBy?: string;
  decidedAt?: string;
};

export type Actor = "agent" | "policy" | "operator" | "ledger";
export type AuditEvent = {
  id: string;
  at: string;
  actor: Actor;
  kind: string;
  message: string;
  data?: unknown;
  txHash?: string;
};

export type Health = { ok: boolean; network: string; agentAccount: string };

/** GET /balances: shape not pinned in the contract; normalised in normalize.ts. */
export type AccountBalance = { name: string; address?: string; xrp?: string; rlusd?: string };
export type Balances = { treasury: AccountBalance; agent: AccountBalance };
