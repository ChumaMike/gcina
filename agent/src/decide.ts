// The bookkeeper's judgement: check Claude's reading of the invoice against the books.
//
// Principle: the agent only half-signs a payment when EITHER it wants it paid, OR one of the
// policy's own rules is certain to stop it and the stop is the point (put it in front of the owner,
// or put the refusal on record). The policy does not check purchase orders, so anything that fails
// on the order itself (no order, wrong amount, unknown supplier) is stopped here, unsigned.
import { type Amount, formatAmount, fromMinor, indicativeZar, toMinor } from "./amount.ts";
import { env } from "./env.ts";
import type { Extraction } from "./extract.ts";
import type { Invoice, Policy, PurchaseOrder, Supplier } from "./types.ts";

export type Books = { suppliers: Supplier[]; orders: PurchaseOrder[]; policy: Policy; invoices: Invoice[] };
export type Check = { ok: boolean | "note"; text: string };

export type Plan =
  | { action: "stop"; checks: Check[]; headline: string; reasoning: string }
  | {
      /** pay: we want it paid. owner: needs the owner (limit or fraud). duplicate: on record as a refusal. */
      action: "pay" | "owner" | "duplicate";
      checks: Check[];
      headline: string;
      reasoning: string;
      destination: string;
      amount: Amount;
      supplierId: string | null;
      /** Link the invoice to this order before proposing (only when the address is the registered one). */
      linkPo?: string;
    };

const short = (addr: string) => `${addr.slice(0, 5)}…${addr.slice(-4)}`;
const words = (n: string) => n.toLowerCase().replace(/\(pty\)|\bltd\b|\bcc\b|&|[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
/** Same business if the first distinctive word matches ("Mzansi Catering" ~ "Mzansi Catering (Pty) Ltd"). */
const sameBusiness = (a: string, b: string) => words(a)[0] !== undefined && words(a)[0] === words(b)[0];

export function money(a: Amount): string {
  const zar = indicativeZar(a);
  return zar ? `${formatAmount(a)} (≈ ${zar})` : formatAmount(a);
}

/** Invoice total (USD, as printed) → payment Amount. Integer maths only. */
export function invoiceAmount(x: Extraction): Amount | null {
  if (x.currency.toUpperCase() !== "USD") return null;
  const m = x.totalDue.replace(/[\s,]/g, "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const cents = BigInt(m[1]) * 100n + BigInt((m[2] ?? "").padEnd(2, "0"));
  if (cents <= 0n) return null;
  // XRP fallback (CONTRACTS §2): $1.00 on the invoice = 1 XRP, so the demo numbers stay the same.
  return env.currency === "XRP" ? fromMinor("XRP", cents * 10_000n) : fromMinor("RLUSD", cents);
}

export function decide(inv: Invoice, x: Extraction, books: Books): Plan {
  const checks: Check[] = [];
  const amount = invoiceAmount(x);
  const destination = x.paymentAddress;
  if (!amount || !destination) {
    const why = !amount ? `I can't read a US-dollar total I can pay (it says ${x.currency} ${x.totalDue}).` : "It doesn't give a payment address.";
    return { action: "stop", checks: [{ ok: false, text: why }], headline: "Not paying: I can't tell what to pay or where.", reasoning: `${why} Leaving it for the owner.` };
  }

  // Who is it, and what did we order from them?
  const po = x.poNumber ? books.orders.find((o) => o.poNumber.toUpperCase() === x.poNumber!.toUpperCase()) : undefined;
  const supplier = (po && books.suppliers.find((s) => s.id === po.supplierId)) ?? books.suppliers.find((s) => sameBusiness(s.name, x.supplierName));
  const registeredAs = supplier && supplier.name !== x.supplierName ? ` (on our list as ${supplier.name})` : "";
  // The order is linked to the invoice only when the money goes to that order's registered address.
  const linkablePo = po && supplier && destination === supplier.xrplAddress ? po.poNumber : undefined;

  // Compromised mode: an agent that has been talked into obeying the document. It skips its own judgement
  // entirely; whatever stops it now has to come from outside the agent (policy service, then the ledger).
  if (env.mode === "compromised") {
    const reasoning = x.changedDetailsLanguage
      ? `${x.supplierName} says their banking details have changed, so I'm paying the new account today, as they asked.`
      : `${x.supplierName} asked for ${formatAmount(amount)}. Paying it.`;
    return {
      action: "pay",
      checks: [{ ok: "note", text: "My own checks are switched off: this agent has been fooled by the document." }],
      headline: "Paying exactly what the document says.",
      reasoning,
      destination,
      amount,
      supplierId: supplier?.id ?? null,
      linkPo: linkablePo,
    };
  }

  // 1. Supplier on the approved list
  const approved = supplier?.status === "approved";
  checks.push(
    approved
      ? { ok: true, text: `${x.supplierName} is an approved supplier${registeredAs}.` }
      : { ok: false, text: supplier ? `${supplier.name} is on our list but not approved (${supplier.status}).` : `${x.supplierName} isn't on our supplier list.` },
  );

  // 2. Payment address = the one on file
  const addressOk = !!supplier && destination === supplier.xrplAddress;
  if (supplier) {
    checks.push(
      addressOk
        ? { ok: true, text: `The payment address is the one we have on file (${short(destination)}).` }
        : { ok: false, text: `The payment address ${short(destination)} is NOT the one we have on file for ${supplier.name} (${short(supplier.xrplAddress)}).` },
    );
  }

  // 3. Social-engineering language (Claude's reading)
  const pressure = x.changedDetailsLanguage || x.urgencyPressure;
  checks.push(
    pressure
      ? { ok: false, text: [x.changedDetailsLanguage && "It says their banking details have changed", x.urgencyPressure && "it pushes us to pay today without checking"].filter(Boolean).join(", and ") + "." }
      : { ok: true, text: `No "new banking details" story and no pressure to pay today.` },
  );

  // 4. The order
  const paidBy = po ? books.invoices.find((i) => i.id !== inv.id && i.poNumber === po.poNumber && i.status === "paid") : undefined;
  const orderPaid = po?.status === "paid" || !!paidBy;
  const orderSameSupplier = !!po && !!supplier && po.supplierId === supplier.id;
  const orderSameAmount = !!po && po.amount.currency === amount.currency && toMinor(po.amount) === toMinor(amount);
  if (!x.poNumber) checks.push({ ok: false, text: "There's no order number on it, so I can't match it to anything we ordered." });
  else if (!po) checks.push({ ok: false, text: `We have no order ${x.poNumber}.` });
  else if (orderPaid) checks.push({ ok: false, text: `Order ${po.poNumber} has already been paid${paidBy ? ` (invoice ${paidBy.id})` : ""}. This is the same bill again.` });
  else if (!orderSameSupplier) checks.push({ ok: false, text: `Order ${po.poNumber} was placed with a different supplier.` });
  else if (!orderSameAmount) checks.push({ ok: false, text: `Order ${po.poNumber} is for ${formatAmount(po.amount)}, but the invoice asks for ${formatAmount(amount)}.` });
  else checks.push({ ok: true, text: `It matches order ${po.poNumber} (${po.description || "open order"}), exactly ${formatAmount(amount)}.` });
  const orderOk = !!po && !orderPaid && orderSameSupplier && orderSameAmount;

  // 5. The owner's limits (the policy enforces these too; the agent just knows them)
  const pol = books.policy;
  const sameCcy = pol.requireHumanAbove.currency === amount.currency;
  const aboveAskMe = sameCcy && toMinor(amount) > toMinor(pol.requireHumanAbove);
  const abovePerPayment = sameCcy && toMinor(amount) > toMinor(pol.perPaymentMax);
  if (abovePerPayment) checks.push({ ok: "note", text: `${formatAmount(amount)} is over the ${formatAmount(pol.perPaymentMax)} per-payment limit, so the owner has to approve it.` });
  else if (aboveAskMe) checks.push({ ok: "note", text: `${formatAmount(amount)} is above ${formatAmount(pol.requireHumanAbove)}, where the owner asked to approve payments personally.` });
  else if (sameCcy) checks.push({ ok: true, text: `Under the owner's ${formatAmount(pol.requireHumanAbove)} "ask me first" limit.` });

  const common = { checks, destination, amount, supplierId: supplier?.id ?? null };

  // Fraud signs win over everything: put it in front of the owner, loudly. The policy holds it (rule 3:
  // not the registered address). The order is NOT linked, so it lands as a hold for a person, not a duplicate.
  if (supplier && (!addressOk || x.changedDetailsLanguage)) {
    const alsoPaid = orderPaid ? ` On top of that, order ${po!.poNumber} has already been paid, so they're asking us to pay the same bill twice.` : "";
    return {
      action: "owner",
      ...common,
      headline: "Do NOT pay. This looks like changed-banking-details fraud.",
      reasoning:
        `I'm not paying this. It asks us to send ${money(amount)} to an address that isn't the one we have on file for ${supplier.name}, ` +
        `and ${x.changedDetailsLanguage ? "it says their banking details have changed" : "it doesn't explain why"}.${x.urgencyPressure ? " It also pushes us to pay today and not to phone, which is exactly how this scam works." : ""}${alsoPaid} ` +
        `I've sent it to the co-signer only so it sits in the owner's queue: please phone ${supplier.name} on the number you already have, not one from this email, before anyone approves anything.`,
    };
  }

  // Same bill twice: the policy refuses it (rule 6) because the linked order is already paid.
  if (po && orderPaid && addressOk && orderSameSupplier) {
    return {
      action: "duplicate",
      ...common,
      linkPo: po.poNumber,
      headline: "Same bill twice. I recommend we don't pay it.",
      reasoning:
        `This is ${x.invoiceNumber ? `invoice ${x.invoiceNumber}` : "the same invoice"} for order ${po.poNumber} again, and we already paid it${paidBy ? ` (${paidBy.id})` : ""}. ` +
        `Paying it a second time is exactly the double payment we're here to stop. I've linked it to the order and passed it to the co-signer so the refusal is on record.`,
    };
  }

  if (!approved || !orderOk) {
    return {
      action: "stop",
      checks,
      headline: "Not paying: it doesn't match what we ordered.",
      reasoning: `I can't match this to an approved supplier and an open order for the same amount, so I'm not signing anything. The owner can raise or fix the order and send it back to me.`,
    };
  }

  if (aboveAskMe || abovePerPayment) {
    return {
      action: "owner",
      ...common,
      linkPo: po!.poNumber,
      headline: "All in order, but big enough that the owner signs off.",
      reasoning:
        `Everything checks out: approved supplier, registered address, and it matches order ${po!.poNumber} exactly. ` +
        `But at ${money(amount)} it's above the owner's ${formatAmount(pol.requireHumanAbove)} "ask me first" limit, so I'm asking for approval. Once the owner approves, I'll sign a fresh payment for exactly this amount.`,
    };
  }

  return {
    action: "pay",
    ...common,
    linkPo: po!.poNumber,
    headline: "Pay it.",
    reasoning: `Approved supplier, the address we have on file, and it matches order ${po!.poNumber} to the cent (${money(amount)}). It's inside the owner's limits, so I'm paying it now.`,
  };
}
