// Co-sign rules (CONTRACTS §3), in order. Pure: no network, no clock except `now`.
// Every failure carries a reason a business owner can read.
import { decode, encodeForMultisigning } from "ripple-binary-codec";
import { deriveAddress, verify } from "ripple-keypairs";
import { type Amount, fromLedgerAmount, toMinor, formatAmount, sameAmount } from "./amount.ts";
import type { Proposal, State, Supplier, Invoice } from "./types.ts";

export type RulesConfig = {
  agentAccount: string;
  agentSignerAddress: string;
  rlusdIssuer: string;
  maxFeeDrops: bigint; // C4: agent + policy must never co-sign a fee burn
  maxLedgerWindow: number; // C4: LastLedgerSequence must be present and near
};

export type Verdict =
  | { kind: "reject"; reasons: string[] }
  | { kind: "hold"; reasons: string[] }
  | { kind: "cosign"; reasons: string[]; tx: Record<string, unknown>; approvalId?: string };

const MISMATCH = "The signed transaction doesn't match the proposal";
const tfPartialPayment = 0x00020000;

/** YYYY-MM-DD in South African time (SAST, UTC+2, no DST). */
export function sastDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function readMemoInvoiceId(tx: Record<string, unknown>): string | null {
  const memos = (tx.Memos as Array<{ Memo?: { MemoData?: string } }>) ?? [];
  for (const m of memos) {
    const hex = m.Memo?.MemoData;
    if (!hex) continue;
    try {
      const parsed = JSON.parse(Buffer.from(hex, "hex").toString("utf8"));
      if (parsed?.app === "gcina" && typeof parsed.invoiceId === "string") return parsed.invoiceId;
    } catch {
      /* not ours */
    }
  }
  return null;
}

/** Rule 2 in full. Returns the unsigned tx (Signers stripped) or the list of mismatches. */
export function checkSignedTx(p: Proposal, cfg: RulesConfig, ledgerIndex?: number): { tx?: Record<string, unknown>; problems: string[] } {
  let tx: Record<string, unknown>;
  try {
    tx = decode(p.agentSignedTxBlob) as Record<string, unknown>;
  } catch {
    return { problems: [`${MISMATCH}: the blob could not be decoded.`] };
  }
  const problems: string[] = [];
  // C5: load-bearing. Agent + policy = quorum for ANY tx type (SignerListSet, SetRegularKey, AccountSet...).
  if (tx.TransactionType !== "Payment") problems.push(`${MISMATCH}: it is a ${String(tx.TransactionType)}, not a Payment. The policy only ever co-signs payments.`);
  if (tx.Account !== cfg.agentAccount) problems.push(`${MISMATCH}: it pays from ${String(tx.Account)}, not the agent account.`);
  if (tx.Destination !== p.destination) problems.push(`${MISMATCH}: it pays ${String(tx.Destination)}, but the proposal says ${p.destination}.`);
  const amt = fromLedgerAmount(tx.Amount, cfg.rlusdIssuer);
  let propAmountOk = true;
  try {
    toMinor(p.amount);
  } catch {
    propAmountOk = false;
    problems.push(`${MISMATCH}: the proposed amount is not a valid amount.`);
  }
  if (!amt) problems.push(`${MISMATCH}: the signed amount is not XRP or RLUSD from the expected issuer.`);
  else if (propAmountOk && !sameAmount(amt, p.amount)) problems.push(`${MISMATCH}: it pays ${formatAmount(amt)}, but the proposal says ${formatAmount(p.amount)}.`);
  const memo = readMemoInvoiceId(tx);
  if (memo !== p.invoiceId) problems.push(`${MISMATCH}: the invoice memo says ${memo ?? "nothing"}, but the proposal is for ${p.invoiceId}.`);
  // C4 / C4-RLUSD: no partial payments, no paths, no fee burn, must expire soon.
  const flags = Number(tx.Flags ?? 0);
  if (flags & tfPartialPayment) problems.push(`${MISMATCH}: it is a partial payment, which could deliver far less than the amount.`);
  else if (flags !== 0 && flags !== 0x80000000) problems.push(`${MISMATCH}: it sets unexpected flags (${flags}).`);
  for (const f of ["SendMax", "DeliverMin", "Paths"]) if (tx[f] !== undefined) problems.push(`${MISMATCH}: it sets ${f}, which the policy never allows.`);
  let fee: bigint;
  try {
    fee = BigInt(String(tx.Fee));
  } catch {
    fee = -1n;
  }
  if (fee < 0n || fee > cfg.maxFeeDrops) problems.push(`${MISMATCH}: the network fee (${String(tx.Fee)} drops) is above the ${cfg.maxFeeDrops}-drop cap.`);
  const lls = Number(tx.LastLedgerSequence);
  if (!Number.isInteger(lls) || lls <= 0) problems.push(`${MISMATCH}: it has no expiry (LastLedgerSequence).`);
  else if (ledgerIndex !== undefined && lls > ledgerIndex + cfg.maxLedgerWindow) problems.push(`${MISMATCH}: its expiry is too far in the future.`);
  // The one signature must be the agent's, and valid.
  const signers = (tx.Signers as Array<{ Signer: { Account: string; SigningPubKey: string; TxnSignature: string } }>) ?? [];
  if (tx.SigningPubKey !== "" || signers.length !== 1) {
    problems.push(`${MISMATCH}: it must carry exactly one multi-sign signature, the agent's.`);
  } else {
    const s = signers[0].Signer;
    const unsigned = { ...tx };
    delete unsigned.Signers;
    let ok = false;
    try {
      ok =
        s.Account === cfg.agentSignerAddress &&
        deriveAddress(s.SigningPubKey) === cfg.agentSignerAddress &&
        verify(encodeForMultisigning(unsigned, s.Account), s.TxnSignature, s.SigningPubKey);
    } catch {
      ok = false;
    }
    if (!ok) problems.push(`${MISMATCH}: it is not validly signed by the agent's key.`);
  }
  if (problems.length) return { problems };
  const unsigned = { ...tx };
  delete unsigned.Signers;
  return { tx: unsigned, problems };
}

/** Rule 6 (run straight after rule 2, see status C14): already-paid invoices, POs, or identical invoice text. */
export function duplicateReason(p: Proposal, s: State): string | null {
  const inv = s.invoices.find((i) => i.id === p.invoiceId);
  if (s.payments.some((x) => x.invoiceId === p.invoiceId)) return `Invoice ${p.invoiceId} has already been paid. Paying it again would be a duplicate.`;
  if (inv?.poNumber) {
    const po = s.purchaseOrders.find((o) => o.poNumber === inv.poNumber);
    const paidFor = s.payments.find((x) => s.invoices.find((i) => i.id === x.invoiceId)?.poNumber === inv.poNumber);
    if (po?.status === "paid" || paidFor) return `Order ${inv.poNumber} has already been paid${paidFor ? ` (invoice ${paidFor.invoiceId})` : ""}. This looks like a duplicate invoice.`;
  }
  if (inv) {
    const norm = (t: string) => t.replace(/\b(inv|invoice)[-\s#:]*[a-z0-9-]+/gi, "").replace(/\s+/g, " ").trim().toLowerCase();
    const twin = s.invoices.find((o) => o.id !== inv.id && o.status === "paid" && o.supplierName === inv.supplierName && norm(o.rawText) === norm(inv.rawText));
    if (twin) return `This invoice is the same as ${twin.id}, which has already been paid. This looks like a duplicate.`;
  }
  return null;
}

function supplierLabel(p: Proposal, s: State, inv?: Invoice): string {
  const byId = p.supplierId ? s.suppliers.find((x) => x.id === p.supplierId) : undefined;
  return byId?.name ?? inv?.supplierName ?? "this supplier";
}

/** Rules 3–5. Collects every reason so the human sees the full picture. */
export function limitReasons(p: Proposal, s: State, now: Date): string[] {
  const reasons: string[] = [];
  const inv = s.invoices.find((i) => i.id === p.invoiceId);
  const label = supplierLabel(p, s, inv);
  // 3. destination must be an approved supplier's registered address
  const owner: Supplier | undefined = s.suppliers.find((x) => x.xrplAddress === p.destination);
  const named = p.supplierId ? s.suppliers.find((x) => x.id === p.supplierId) : s.suppliers.find((x) => x.name === inv?.supplierName);
  if (!owner || owner.status !== "approved" || (named && named.id !== owner.id)) {
    reasons.push(`Destination is not the registered address for ${label}. Possible changed-banking-details fraud.`);
  }
  // 4. per-payment and daily (SAST) limits, in the policy currency
  const pol = s.policy;
  if (p.amount.currency !== pol.perPaymentMax.currency) {
    reasons.push(`This payment is in ${p.amount.currency}, but your limits are set in ${pol.perPaymentMax.currency}.`);
    return reasons;
  }
  const a = toMinor(p.amount);
  if (a > toMinor(pol.perPaymentMax)) reasons.push(`${formatAmount(p.amount)} is more than your per-payment limit of ${formatAmount(pol.perPaymentMax)}.`);
  const today = sastDay(now);
  const spent = s.payments.filter((x) => x.sastDay === today && x.amount.currency === p.amount.currency).reduce((t, x) => t + toMinor(x.amount), 0n);
  if (spent + a > toMinor(pol.dailyMax)) reasons.push(`This would take today's payments past your daily limit of ${formatAmount(pol.dailyMax)}.`);
  // 5. human approval threshold
  if (a > toMinor(pol.requireHumanAbove)) reasons.push(`${formatAmount(p.amount)} is above ${formatAmount(pol.requireHumanAbove)}, where you asked to approve payments yourself.`);
  return reasons;
}

/** Rule 7: an approval waives 3–5 only for that exact invoice, destination and amount, once. */
export function approvalCheck(p: Proposal, s: State): { ok: true } | { ok: false; reason: string } {
  const ap = s.approvals.find((x) => x.id === p.approvalId);
  if (!ap) return { ok: false, reason: `Approval ${p.approvalId} does not exist.` };
  if (ap.status !== "approved") return { ok: false, reason: `Approval ${ap.id} is ${ap.status}, not approved.` };
  if (ap.invoiceId !== p.invoiceId || ap.destination !== p.destination || !sameAmount(ap.amount, p.amount)) {
    return { ok: false, reason: `Approval ${ap.id} was for ${formatAmount(ap.amount)} to ${ap.destination} on ${ap.invoiceId}; this proposal is different.` };
  }
  if (s.approvalUses.some((u) => u.approvalId === ap.id)) return { ok: false, reason: `Approval ${ap.id} has already been used for a payment.` };
  return { ok: true };
}

export function evaluate(p: Proposal, s: State, cfg: RulesConfig, now: Date, ledgerIndex?: number): Verdict {
  // 1. paused
  if (s.policy.paused) return { kind: "reject", reasons: ["Payments are paused by the business owner."] };
  if (!s.invoices.some((i) => i.id === p.invoiceId)) return { kind: "reject", reasons: [`Invoice ${p.invoiceId} is not on record, so there is nothing to pay.`] };
  // 2. the signed tx must be exactly what is proposed
  const checked = checkSignedTx(p, cfg, ledgerIndex);
  if (!checked.tx) return { kind: "reject", reasons: checked.problems };
  // 6. duplicates (moved up per C14 so a used-up daily limit can't turn "duplicate" into "held")
  const dup = duplicateReason(p, s);
  if (dup) return { kind: "reject", reasons: [dup] };
  // 7. human approval waives 3–5 for that exact payment
  if (p.approvalId) {
    const ap = approvalCheck(p, s);
    if (!ap.ok) return { kind: "reject", reasons: [ap.reason] };
    return { kind: "cosign", reasons: [`Approved by a person (${p.approvalId}).`], tx: checked.tx, approvalId: p.approvalId };
  }
  // 3–5
  const held = limitReasons(p, s, now);
  if (held.length) return { kind: "hold", reasons: held };
  // 8. co-sign
  return { kind: "cosign", reasons: ["Approved supplier, matches the proposal, inside your limits."], tx: checked.tx };
}

export type { Amount };
