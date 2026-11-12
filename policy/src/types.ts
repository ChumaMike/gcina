// Contract types, copied from CONTRACTS.md §2 + §3 (never imported across folders).
// §2: every `xxxDrops: Drops` is read as `xxx: Amount`.
import type { Amount } from "./amount.ts";
export type { Amount, Currency } from "./amount.ts";

export type Drops = string; // integer string

export type Policy = {
  perPaymentMax: Amount;
  dailyMax: Amount;
  requireHumanAbove: Amount;
  paused: boolean;
  updatedAt: string;
  updatedBy: string;
};
export type Supplier = { id: string; name: string; xrplAddress: string; status: "approved" | "pending" | "blocked"; createdAt: string };
export type InvoiceStatus = "new" | "processing" | "paid" | "held" | "rejected";
export type Invoice = { id: string; supplierName: string; rawText: string; receivedAt: string; status: InvoiceStatus; poNumber?: string };
export type PurchaseOrder = { poNumber: string; supplierId: string; amount: Amount; description: string; status: "open" | "paid" };
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
export type Approval = {
  id: string;
  proposalId: string;
  invoiceId: string;
  amount: Amount;
  destination: string;
  reasons: string[];
  status: "pending" | "approved" | "rejected";
  decidedBy?: string;
  decidedAt?: string;
};
export type AuditEvent = {
  id: string;
  at: string;
  actor: "agent" | "policy" | "operator" | "ledger";
  kind: string;
  message: string;
  data?: unknown;
  txHash?: string;
};

// ---- policy-internal records (not part of the shared contract) ----
export type StoredProposal = Omit<Proposal, "agentSignedTxBlob"> & { id: string; at: string; txHashSignedByAgent?: string; decision?: Decision };
export type Payment = { invoiceId: string; amount: Amount; destination: string; txHash: string; at: string; sastDay: string; approvalId?: string };
export type ApprovalUse = { approvalId: string; txHash: string };

export type State = {
  version: 1;
  policy: Policy;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  proposals: StoredProposal[];
  approvals: Approval[];
  approvalUses: ApprovalUse[];
  payments: Payment[];
  audit: AuditEvent[];
};
