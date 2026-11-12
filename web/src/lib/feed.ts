// How the audit log reads per invoice. Shared by the activity feed and the Overview counters.

import type { Amount, AuditEvent } from "./types";

export const dataOf = (e: AuditEvent) => (e.data ?? {}) as Record<string, unknown>;

/** A ledger engine result that means "not applied" (tef/tem/tel), e.g. tefBAD_QUORUM. */
export function ledgerRefusal(e: AuditEvent): string | null {
  const d = dataOf(e);
  const r = (d.engine_result ?? d.ledgerResult ?? d.result) as string | undefined;
  if (typeof r === "string" && /^te[fml]/.test(r)) return r;
  const m = e.message.match(/\bte[fml][A-Z_]+\b/);
  return m ? m[0] : null;
}

export function invoiceIdOf(e: AuditEvent): string | null {
  const d = dataOf(e);
  if (typeof d.invoiceId === "string") return d.invoiceId;
  return e.message.match(/\binv-[\w-]+\b/)?.[0] ?? null;
}

export function amountOf(e: AuditEvent): Amount | null {
  const d = dataOf(e);
  for (const v of [d.delivered, d.amount]) {
    if (v && typeof v === "object" && "currency" in v && "value" in v) return v as Amount;
  }
  return null;
}

export const isPayment = (e: AuditEvent) => e.kind === "payment.validated" || (e.actor === "ledger" && !!e.txHash && !ledgerRefusal(e));

export type Outcome = "paid" | "ledger-refused" | "declined" | "stopped" | "refused" | "held" | "working";

/** The agent itself marked the invoice rejected (e.g. hidden instructions in inv-005): it signed nothing. */
export const agentStopped = (e: AuditEvent) => e.actor === "agent" && e.kind === "invoice.updated" && /→s*rejected/.test(e.message);
export type Group = { key: string; invoiceId: string | null; events: AuditEvent[]; at: string };

export function outcomeOf(g: Group): Outcome {
  const ev = g.events; // newest first
  if (ev.some(isPayment)) return "paid";
  if (ev.some((e) => ledgerRefusal(e))) return "ledger-refused";
  if (ev.some((e) => e.kind === "approval.rejected")) return "declined";
  if (ev[0]?.kind === "approval.approved") return "working";
  if (ev.some(agentStopped) && !ev.some((e) => /held|rejected|refused/.test(e.kind) && e.actor !== "agent")) return "stopped";
  const last = ev.find((e) => /held|rejected|refused/.test(e.kind));
  if (last && /rejected|refused/.test(last.kind)) return "refused";
  if (last) return "held";
  return "working";
}

export function group(events: AuditEvent[]): Group[] {
  const out: Group[] = [];
  const byInv = new Map<string, Group>();
  for (const e of events) {
    const inv = invoiceIdOf(e);
    if (!inv) {
      out.push({ key: e.id, invoiceId: null, events: [e], at: e.at });
      continue;
    }
    let g = byInv.get(inv);
    if (!g) {
      g = { key: `inv:${inv}`, invoiceId: inv, events: [], at: e.at };
      byInv.set(inv, g);
      out.push(g);
    }
    g.events.push(e);
  }
  return out;
}

// ---------- "Gcina stopped R… for you" ----------

export type StopKind = "fraud" | "repeat" | "attack" | "rules" | "declined";
export type Stopped = { invoiceId: string; kind: StopKind; amount: Amount | null };

const FRAUD = /fraud|banking details|not (?:the )?registered|new (?:pay-to )?address|different address|never approved|hidden|instruction|injection/i;
const REPEAT = /repeat|already paid|duplicate|paid (?:just now|before)/i;

/** The bill's total read from its own text, for an invoice the agent stopped before proposing an amount. */
function totalFromText(raw: string | undefined): Amount | null {
  const v = raw?.match(/TOTAL DUE \(USD\)\s+([\d.]+)/)?.[1] ?? raw?.match(/\bUSD\s+([\d]+\.\d{2})\b/)?.[1];
  return v ? { currency: "RLUSD", value: v } : null;
}

/**
 * Every invoice that did NOT get paid because something stopped it, once each:
 * the ledger refusing the agent alone beats a policy refusal, fraud wording beats repeat wording,
 * and a plain "you said no" is kept apart so it is never counted as fraud.
 */
export function stoppedPayments(events: AuditEvent[] | null, invoices: { id: string; rawText?: string }[] | null): Stopped[] {
  const out: Stopped[] = [];
  for (const g of group(events ?? [])) {
    if (!g.invoiceId) continue;
    const outcome = outcomeOf(g);
    if (!["ledger-refused", "stopped", "refused", "declined"].includes(outcome)) continue;
    const words = g.events
      .map((e) => [e.message, ...(((dataOf(e).reasons as unknown[]) ?? []).filter((r) => typeof r === "string") as string[])].join(" "))
      .join(" ");
    const kind: StopKind =
      outcome === "ledger-refused" ? "attack" : outcome === "stopped" || FRAUD.test(words) ? "fraud" : REPEAT.test(words) ? "repeat" : outcome === "declined" ? "declined" : "rules";
    const amount = g.events.map(amountOf).find(Boolean) ?? totalFromText(invoices?.find((i) => i.id === g.invoiceId)?.rawText);
    out.push({ invoiceId: g.invoiceId, kind, amount });
  }
  return out;
}
