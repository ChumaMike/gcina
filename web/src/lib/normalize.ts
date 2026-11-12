// Tolerant adapters from whatever the policy service returns to the UI types.
// CONTRACTS §2 renamed `xxxDrops` → `xxx: Amount`; we accept both so a half-migrated
// API never blanks the dashboard. Mismatches get reported in docs/status.md, not hidden.
import type {
  AccountBalance,
  Amount,
  Approval,
  AuditEvent,
  Balances,
  Invoice,
  Policy,
  Supplier,
} from "./types";

type Raw = Record<string, unknown>;

function asAmount(raw: Raw, key: string): Amount {
  const v = raw[key];
  if (v && typeof v === "object" && "value" in (v as Raw)) {
    const o = v as Raw;
    const cur = String(o.currency ?? "RLUSD");
    return {
      currency: cur === "XRP" ? "XRP" : "RLUSD", // 40-hex RLUSD code → RLUSD
      value: String(o.value ?? "0"),
    };
  }
  if (typeof v === "string" || typeof v === "number") {
    return { currency: "RLUSD", value: String(v) };
  }
  const drops = raw[`${key}Drops`];
  if (drops !== undefined) return { currency: "XRP", value: String(drops) };
  return { currency: "RLUSD", value: "0" };
}

export function normPolicy(raw: Raw): Policy {
  return {
    perPaymentMax: asAmount(raw, "perPaymentMax"),
    dailyMax: asAmount(raw, "dailyMax"),
    requireHumanAbove: asAmount(raw, "requireHumanAbove"),
    paused: Boolean(raw.paused),
    updatedAt: String(raw.updatedAt ?? ""),
    updatedBy: String(raw.updatedBy ?? ""),
  };
}

/** Send limits in the shape the API currently uses (mirror what we received). */
export function policyBody(p: Partial<Policy>, legacyDrops: boolean): Raw {
  const out: Raw = {};
  if (p.paused !== undefined) out.paused = p.paused;
  for (const k of ["perPaymentMax", "dailyMax", "requireHumanAbove"] as const) {
    const a = p[k];
    if (!a) continue;
    if (legacyDrops) out[`${k}Drops`] = a.value;
    else out[k] = a;
  }
  return out;
}

export function normApproval(raw: Raw): Approval {
  return {
    id: String(raw.id),
    proposalId: String(raw.proposalId ?? ""),
    invoiceId: String(raw.invoiceId ?? ""),
    amount: asAmount(raw, "amount"),
    destination: String(raw.destination ?? ""),
    reasons: Array.isArray(raw.reasons) ? raw.reasons.map(String) : [],
    status: (raw.status as Approval["status"]) ?? "pending",
    decidedBy: raw.decidedBy ? String(raw.decidedBy) : undefined,
    decidedAt: raw.decidedAt ? String(raw.decidedAt) : undefined,
  };
}

export const normSupplier = (raw: Raw): Supplier => raw as unknown as Supplier;
export const normInvoice = (raw: Raw): Invoice => raw as unknown as Invoice;
export const normAudit = (raw: Raw): AuditEvent => raw as unknown as AuditEvent;

/** Arrays may come bare or wrapped ({ items }, { suppliers }, ...). */
export function asList(raw: unknown): Raw[] {
  if (Array.isArray(raw)) return raw as Raw[];
  if (raw && typeof raw === "object") {
    for (const v of Object.values(raw as Raw)) if (Array.isArray(v)) return v as Raw[];
  }
  return [];
}

function normAccount(name: string, raw: unknown): AccountBalance {
  if (!raw || typeof raw !== "object") return { name };
  const o = raw as Raw;
  const pick = (...keys: string[]) => {
    for (const k of keys) if (o[k] !== undefined && o[k] !== null) return String(o[k]);
    return undefined;
  };
  return {
    name,
    address: pick("address", "account"),
    xrp: pick("xrp", "XRP", "xrpBalance"),
    rlusd: pick("rlusd", "RLUSD", "rlusdBalance"),
  };
}

export function normBalances(raw: unknown): Balances {
  const o = (raw ?? {}) as Raw;
  return {
    treasury: normAccount("Business account", o.TREASURY ?? o.treasury),
    agent: normAccount("Agent wallet", o.AGENT_ACCOUNT ?? o.agentAccount ?? o.agent),
  };
}
