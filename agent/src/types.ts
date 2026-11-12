// Contract types, copied from CONTRACTS.md §3 as ratified at 16:35 (amounts are `Amount`, not drops).
// Never imported across folders.
import type { Amount } from "./amount.ts";
export type { Amount, Currency } from "./amount.ts";

export type Policy = { perPaymentMax: Amount; dailyMax: Amount; requireHumanAbove: Amount; paused: boolean; updatedAt: string; updatedBy: string; spentToday?: Amount };
export type Supplier = { id: string; name: string; xrplAddress: string; status: "approved" | "pending" | "blocked"; createdAt: string };
export type InvoiceStatus = "new" | "processing" | "paid" | "held" | "rejected";
export type Invoice = { id: string; supplierName: string; rawText: string; receivedAt: string; status: InvoiceStatus; poNumber?: string };
export type PurchaseOrder = { poNumber: string; supplierId: string; amount: Amount; description: string; status: "open" | "paid" };
export type Proposal = { invoiceId: string; supplierId: string | null; destination: string; amount: Amount; reasoning: string; agentSignedTxBlob: string; approvalId?: string };
export type Decision = { proposalId: string; decision: "cosigned_submitted" | "held_for_human" | "rejected"; reasons: string[]; txHash?: string; ledgerResult?: string; explorerUrl?: string };
export type Approval = { id: string; proposalId: string; invoiceId: string; amount: Amount; destination: string; reasons: string[]; status: "pending" | "approved" | "rejected"; decidedBy?: string; decidedAt?: string };
export type AuditEvent = { id: string; at: string; actor: "agent" | "policy" | "operator" | "ledger"; kind: string; message: string; data?: unknown; txHash?: string };
