// The agent's view of the policy co-signer service (CONTRACTS §3). Agent token only:
// it can read the books and propose half-signed payments, never change limits, suppliers or approvals.
import { env } from "./env.ts";
import type { Approval, Decision, Invoice, Policy, Proposal, PurchaseOrder, Supplier } from "./types.ts";

export class PolicyError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.policyUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.agentToken}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(120_000), // a co-signed payment waits for ledger validation
    });
  } catch (e) {
    throw new PolicyError(`Can't reach the policy service at ${env.policyUrl} (${e instanceof Error ? e.message : String(e)}).`, 0);
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new PolicyError(json.error ?? `${method} ${path} → HTTP ${res.status}`, res.status);
  return json as T;
}

export const policy = {
  health: () => call<{ ok: boolean; network: string; agentAccount: string; currency?: string }>("GET", "/health"),
  limits: () => call<Policy>("GET", "/policy"),
  suppliers: () => call<Supplier[]>("GET", "/suppliers"),
  purchaseOrders: () => call<PurchaseOrder[]>("GET", "/purchase-orders"),
  invoices: (status?: string) => call<Invoice[]>("GET", `/invoices${status ? `?status=${status}` : ""}`),
  updateInvoice: (id: string, patch: { status?: "new" | "processing" | "rejected"; poNumber?: string }) =>
    call<Invoice>("PATCH", `/invoices/${encodeURIComponent(id)}`, patch),
  propose: (p: Proposal) => call<Decision>("POST", "/proposals", p),
  approvedApprovals: () => call<Approval[]>("GET", "/approvals?status=approved"),
  /**
   * Report the compromised agent's direct ledger attempt into the audit trail.
   * Optional route (requested from L at 17:xx); the agent carries on if it isn't there yet.
   */
  reportDirectAttempt: (data: { invoiceId: string; destination: string; engine_result: string; engine_result_message: string; applied: boolean }) =>
    call<unknown>("POST", "/audit/agent-events", { kind: "ledger.direct_attempt", ...data }).then(
      () => true,
      () => false,
    ),
};
