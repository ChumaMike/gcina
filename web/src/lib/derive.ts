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
 * otherwise adds up validated payments in the audit log (`data.amount` or L's `data.delivered`).
 */
export function spentToday(raw: unknown, audit: AuditEvent[] | null, currency: Currency): Amount {
  const server = amountFrom(raw) ?? (typeof raw === "string" ? { currency, value: raw } : null);
  if (server) return server;
  const today = sastDay(new Date().toISOString());
  let sum = 0n;
  for (const e of audit ?? []) {
    if (!e.txHash || e.actor !== "ledger" || sastDay(e.at) !== today) continue;
    const d = e.data as Record<string, unknown> | undefined;
    const a = amountFrom(d?.amount) ?? amountFrom(d?.delivered) ?? amountFrom(d?.delivered_amount);
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

/**
 * The approved supplier a held payment claims to be for, when it's going somewhere else:
 * the "old vs new address" pair. Matches the invoice's sender name, a supplier named in the
 * policy's reasons, or the same first word ("Mzansi …"), in that order.
 */
export function registeredFor(suppliers: Supplier[] | null, senderName: string | undefined, reasons: string[], destination: string): Supplier | undefined {
  const approved = (suppliers ?? []).filter((s) => s.status === "approved" && s.xrplAddress !== destination);
  const norm = (s: string) => s.trim().toLowerCase();
  const first = (s: string) => norm(s).split(/\s+/)[0];
  return (
    (senderName && approved.find((s) => norm(s.name) === norm(senderName))) ||
    approved.find((s) => reasons.some((r) => r.includes(s.name))) ||
    (senderName ? approved.find((s) => first(s.name) === first(senderName)) : undefined)
  );
}

export function supplierByAddress(suppliers: Supplier[] | null, addr: string): Supplier | undefined {
  return suppliers?.find((s) => s.xrplAddress === addr);
}

export async function savePolicy(change: Partial<Policy>, legacyDrops: boolean) {
  return api("PUT", "/policy", policyBody(change, legacyDrops));
}
