import { api } from "./api";
import { fromMinor, toMinor } from "./money";
import { policyBody } from "./normalize";
import type { Amount, AuditEvent, Currency, Policy, Supplier } from "./types";

const sastDay = (iso: string) => new Date(new Date(iso).getTime() + 2 * 3600_000).toISOString().slice(0, 10);

function amountFrom(v: unknown): Amount | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.value === undefined) return null;
  return { currency: o.currency === "XRP" ? "XRP" : "RLUSD", value: String(o.value) };
}

/**
 * Today's (SAST) spend. Prefers a server figure (`spentToday` on GET /policy) and
 * otherwise adds up validated payments in the audit log that carry `data.amount`.
 */
export function spentToday(raw: unknown, audit: AuditEvent[] | null, currency: Currency): Amount {
  const server = amountFrom(raw) ?? (typeof raw === "string" ? { currency, value: raw } : null);
  if (server) return server;
  const today = sastDay(new Date().toISOString());
  let sum = 0n;
  for (const e of audit ?? []) {
    if (!e.txHash || e.actor !== "ledger" || sastDay(e.at) !== today) continue;
    const d = e.data as Record<string, unknown> | undefined;
    const a = amountFrom(d?.amount) ?? amountFrom(d?.delivered_amount);
    if (a && a.currency === currency) sum += toMinor(a);
  }
  return fromMinor(currency, sum);
}

/** Pending supplier entries that reuse an existing supplier's name = an address change. */
export function addressChanges(suppliers: Supplier[]): Map<string, Supplier> {
  const out = new Map<string, Supplier>();
  const norm = (s: string) => s.trim().toLowerCase();
  for (const s of suppliers) {
    if (s.status !== "pending") continue;
    const old = suppliers.find((o) => o.id !== s.id && o.status === "approved" && norm(o.name) === norm(s.name));
    if (old) out.set(s.id, old);
  }
  return out;
}

export function supplierByAddress(suppliers: Supplier[] | null, addr: string): Supplier | undefined {
  return suppliers?.find((s) => s.xrplAddress === addr);
}

export async function savePolicy(change: Partial<Policy>, legacyDrops: boolean) {
  return api("PUT", "/policy", policyBody(change, legacyDrops));
}
