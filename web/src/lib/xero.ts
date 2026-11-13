import "server-only";
// Xero connection (owner side only). Gcina reads bills and purchase orders from the books, hands each
// bill to the agent exactly like an emailed one, and records the payment back in Xero once the
// XRP Ledger has settled it. Demo guard: it only ever connects to a Xero DEMO company.
//
// Tokens live in the policy service's private "integrations" notebook (operator token only);
// the agent never sees them and they are never sent to the browser.
import { AGENT_ACCOUNT } from "./addresses";
import { callPolicy } from "./policy-client";
import { getZarRate } from "./rate";
import type { AuditEvent, Invoice, PurchaseOrder, Supplier } from "./types";

const AUTHORIZE = "https://login.xero.com/identity/connect/authorize";
const TOKEN = "https://identity.xero.com/connect/token";
const CONNECTIONS = "https://api.xero.com/connections";
const API = "https://api.xero.com/api.xro/2.0";
const WALLET_ACCOUNT = "Gcina RLUSD wallet";

const scopes = () =>
  (process.env.XERO_SCOPES ?? "offline_access accounting.invoices accounting.payments accounting.contacts.read accounting.settings").trim();
const creds = () => ({ id: (process.env.XERO_CLIENT_ID ?? "").trim(), secret: (process.env.XERO_CLIENT_SECRET ?? "").trim() });
export const xeroConfigured = () => !!creds().id && !!creds().secret;

export type XeroImport = {
  invoiceId: string;
  billNumber: string;
  contact: string;
  /** Bill total as it stands in Xero, e.g. "340.00". */
  total: string;
  currency: string;
  /** What the agent is asked to pay, in RLUSD. */
  usd: string;
  rate: number;
  at: string;
  po?: string;
  paymentId?: string;
  paidAt?: string;
  txHash?: string;
  error?: string;
};
type XeroState = {
  tokens?: { access: string; exp: number; refresh: string };
  tenantId?: string;
  orgName?: string;
  account?: { id: string; name: string };
  imports?: Record<string, XeroImport>;
};

export class XeroError extends Error {}

// ---- storage ----
async function load(): Promise<XeroState> {
  const r = await callPolicy("GET", "/integrations/xero");
  if (r.status !== 200) throw new XeroError("Couldn't reach the rules service to read the Xero connection.");
  return (r.body as XeroState | null) ?? {};
}
async function save(s: XeroState): Promise<void> {
  const r = await callPolicy("PUT", "/integrations/xero", s);
  if (r.status !== 200) throw new XeroError("Couldn't save the Xero connection.");
}

// ---- OAuth ----
export function authorizeUrl(state: string, redirectUri: string): string {
  const q = new URLSearchParams({ response_type: "code", client_id: creds().id, redirect_uri: redirectUri, scope: scopes(), state });
  return `${AUTHORIZE}?${q}`;
}

async function tokenCall(params: Record<string, string>): Promise<{ access: string; exp: number; refresh: string }> {
  const { id, secret } = creds();
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !j.access_token || !j.refresh_token) throw new XeroError(`Xero didn't accept the sign-in (${j.error ?? res.status}).`);
  return { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in ?? 1800) * 1000 };
}

async function accessToken(s: XeroState): Promise<string> {
  if (!s.tokens || !s.tenantId) throw new XeroError("Xero isn't connected.");
  if (s.tokens.exp - Date.now() > 90_000) return s.tokens.access;
  s.tokens = await tokenCall({ grant_type: "refresh_token", refresh_token: s.tokens.refresh });
  await save(s);
  return s.tokens.access;
}

async function xero<T>(s: XeroState, method: "GET" | "PUT" | "POST", path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const token = await accessToken(s);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "xero-tenant-id": s.tenantId!,
      accept: "application/json",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = JSON.parse(text) as { Message?: string; Detail?: string; Elements?: { ValidationErrors?: { Message: string }[] }[] };
      msg = j.Elements?.[0]?.ValidationErrors?.[0]?.Message ?? j.Message ?? j.Detail ?? msg;
    } catch {
      // keep the status code
    }
    throw new XeroError(`Xero said no (${msg}).`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/** Finish sign-in: keep the tokens only if the chosen organisation is a Xero demo company. */
export async function finishConnect(code: string, redirectUri: string): Promise<string> {
  const tokens = await tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  const res = await fetch(CONNECTIONS, { headers: { authorization: `Bearer ${tokens.access}`, accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const tenants = ((await res.json().catch(() => [])) as { tenantId: string; tenantName: string; tenantType: string }[]).filter((t) => t.tenantType === "ORGANISATION");
  for (const t of tenants) {
    const probe: XeroState = { tokens, tenantId: t.tenantId };
    const org = (await xero<{ Organisations?: { Name: string; IsDemoCompany?: boolean }[] }>(probe, "GET", "/Organisation")).Organisations?.[0];
    if (!org?.IsDemoCompany) continue;
    const prev = await load();
    const next: XeroState = { tokens, tenantId: t.tenantId, orgName: org.Name, imports: prev.tenantId === t.tenantId ? prev.imports : {} };
    next.account = await walletAccount(next);
    await save(next);
    return org.Name;
  }
  throw new XeroError("Only a Xero Demo Company can be connected to this demo. In Xero, switch to the Demo Company and choose it when you connect.");
}

export async function disconnect(): Promise<void> {
  await save({});
}

/** The account bill payments are recorded against. Tries to make a clearly named one; else the first bank account. */
async function walletAccount(s: XeroState): Promise<{ id: string; name: string }> {
  type Acc = { AccountID: string; Name: string; Status: string };
  const list = async () => (await xero<{ Accounts?: Acc[] }>(s, "GET", `/Accounts?where=${encodeURIComponent('Type=="BANK"')}`)).Accounts ?? [];
  let accounts = await list();
  const mine = () => accounts.find((a) => a.Name === WALLET_ACCOUNT && a.Status === "ACTIVE");
  if (!mine()) {
    try {
      await xero(s, "PUT", "/Accounts", { Code: "GCINA", Name: WALLET_ACCOUNT, Type: "BANK", BankAccountNumber: `XRPL${AGENT_ACCOUNT.slice(1, 13)}` });
      accounts = await list();
    } catch {
      // No permission to add accounts: fall back below.
    }
  }
  const a = mine() ?? accounts.find((x) => x.Status === "ACTIVE");
  if (!a) throw new XeroError("The Xero company has no bank account to record payments against.");
  return { id: a.AccountID, name: a.Name };
}

// ---- bills ----
type XeroBill = {
  InvoiceID: string;
  InvoiceNumber?: string;
  Reference?: string;
  Contact?: { Name?: string };
  Total?: number;
  AmountDue?: number;
  CurrencyCode?: string;
  DateString?: string;
  DueDateString?: string;
  LineItems?: { Description?: string; LineAmount?: number }[];
};
type XeroPo = { PurchaseOrderNumber?: string; Contact?: { Name?: string }; Total?: number; CurrencyCode?: string; Status?: string };

export type BillRow = {
  id: string;
  number: string;
  contact: string;
  total: string;
  currency: string;
  due: string | null;
  po: string | null;
  /** The approved Gcina supplier this contact matches, if any. */
  supplier: string | null;
  usd: string | null;
  imported: XeroImport | null;
};
export type BillsView =
  | { configured: false }
  | { configured: true; connected: false }
  | { configured: true; connected: true; org: string; account: string; rate: number; rateSource: string; bills: BillRow[]; paid: XeroImport[] };

const norm = (s: string) => s.toLowerCase().replace(/\(pty\)|\bltd\b|[^a-z0-9]+/g, " ").trim();
function matchSupplier(contact: string, suppliers: Supplier[]): Supplier | undefined {
  const c = norm(contact);
  if (c.length < 3) return undefined;
  return suppliers.find((s) => s.status === "approved" && (norm(s.name) === c || norm(s.name).startsWith(c + " ") || c.startsWith(norm(s.name) + " ")));
}
const poIn = (b: XeroBill) => [b.Reference, b.InvoiceNumber, ...(b.LineItems ?? []).map((l) => l.Description)].join(" ").match(/\bPO-\d{1,8}\b/i)?.[0].toUpperCase() ?? null;
const cents = (n: number) => Math.round(n * 100);
const money = (c: number) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`;
/** Bill amount → RLUSD cents at the given rand rate. Only ZAR and USD bills can be paid. */
function toUsdCents(amount: number, currency: string, rate: number): number | null {
  if (!(amount > 0)) return null;
  if (currency === "USD") return cents(amount);
  if (currency === "ZAR") return Math.round((amount * 100) / rate);
  return null;
}

async function policyGet<T>(path: string): Promise<T> {
  const r = await callPolicy("GET", path);
  if (r.status !== 200) throw new XeroError("Couldn't reach the rules service.");
  return r.body as T;
}

async function openBills(s: XeroState): Promise<XeroBill[]> {
  const where = encodeURIComponent('Type=="ACCPAY"&&Status=="AUTHORISED"');
  return (await xero<{ Invoices?: XeroBill[] }>(s, "GET", `/Invoices?where=${where}&order=${encodeURIComponent("Date DESC")}&page=1`)).Invoices ?? [];
}

export async function billsView(): Promise<BillsView> {
  if (!xeroConfigured()) return { configured: false };
  const s = await load();
  if (!s.tokens || !s.tenantId) return { configured: true, connected: false };
  const [bills, suppliers, rate] = await Promise.all([openBills(s), policyGet<Supplier[]>("/suppliers"), getZarRate()]);
  const imports = s.imports ?? {};
  const rows = bills.slice(0, 40).map((b): BillRow => {
    const currency = b.CurrencyCode ?? "";
    const usd = toUsdCents(b.AmountDue ?? 0, currency, rate.rate);
    const contact = b.Contact?.Name ?? "Unknown";
    return {
      id: b.InvoiceID,
      number: b.InvoiceNumber || b.Reference || "(no number)",
      contact,
      total: money(cents(b.AmountDue ?? 0)),
      currency,
      due: b.DueDateString?.slice(0, 10) ?? null,
      po: poIn(b),
      supplier: matchSupplier(contact, suppliers)?.name ?? null,
      usd: usd === null ? null : money(usd),
      imported: imports[b.InvoiceID] ?? null,
    };
  });
  // Approved suppliers first: those are the ones the agent can act on.
  rows.sort((a, b) => Number(!!b.supplier) - Number(!!a.supplier));
  return {
    configured: true,
    connected: true,
    org: s.orgName ?? "Xero",
    account: s.account?.name ?? "",
    rate: rate.rate,
    rateSource: rate.source,
    bills: rows,
    paid: Object.values(imports).filter((i) => i.paymentId).sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? "")).slice(0, 10),
  };
}

/** Hand one Xero bill to the agent, as a normal invoice. The matching Xero purchase order (if any) becomes the order on record. */
export async function importBill(billId: string): Promise<XeroImport> {
  const s = await load();
  const bill = (await xero<{ Invoices?: XeroBill[] }>(s, "GET", `/Invoices/${encodeURIComponent(billId)}`)).Invoices?.[0];
  if (!bill) throw new XeroError("That bill isn't in Xero any more.");
  const [suppliers, invoices, orders, rate] = await Promise.all([
    policyGet<Supplier[]>("/suppliers"),
    policyGet<Invoice[]>("/invoices"),
    policyGet<PurchaseOrder[]>("/purchase-orders"),
    getZarRate(),
  ]);
  const prior = s.imports?.[billId];
  if (prior && invoices.some((i) => i.id === prior.invoiceId)) throw new XeroError("That bill has already been sent to Gcina.");

  const contact = bill.Contact?.Name ?? "Unknown";
  const supplier = matchSupplier(contact, suppliers);
  if (!supplier) throw new XeroError(`${contact} isn't an approved supplier in Gcina. Add them under Suppliers first.`);
  const currency = bill.CurrencyCode ?? "";
  const usd = toUsdCents(bill.AmountDue ?? 0, currency, rate.rate);
  if (usd === null) throw new XeroError(`Gcina can only pay rand or US-dollar bills (this one is in ${currency || "an unknown currency"}).`);
  const number = bill.InvoiceNumber || bill.Reference || billId.slice(0, 8);

  // The order: taken from Xero's own purchase orders, converted at the same locked rate as the bill.
  const po = poIn(bill);
  if (po && !orders.some((o) => o.poNumber === po)) {
    try {
      const found = (await xero<{ PurchaseOrders?: XeroPo[] }>(s, "GET", `/PurchaseOrders/${encodeURIComponent(po)}`)).PurchaseOrders?.[0];
      const poUsd = found && found.Status !== "DELETED" && matchSupplier(found.Contact?.Name ?? "", suppliers)?.id === supplier.id ? toUsdCents(found.Total ?? 0, found.CurrencyCode ?? "", rate.rate) : null;
      if (poUsd !== null) {
        await callPolicy("POST", "/purchase-orders", { poNumber: po, supplierId: supplier.id, amount: { currency: "RLUSD", value: money(poUsd) }, description: `From Xero (${found!.CurrencyCode} ${money(cents(found!.Total ?? 0))})` });
      }
    } catch {
      // No such order in Xero (or no permission to read orders): the agent will say it can't match one, and ask the owner.
    }
  }

  const sym = currency === "ZAR" ? "R" : "$";
  const lines = (bill.LineItems ?? []).slice(0, 12).map((l) => `  ${(l.Description ?? "Item").replace(/\s+/g, " ").slice(0, 70).padEnd(72)}${sym} ${money(cents(l.LineAmount ?? 0))}`);
  const rawText = [
    `SUPPLIER BILL (from the books: Xero, ${s.orgName ?? "demo company"})`,
    "",
    contact,
    "",
    `Bill to:     ${s.orgName ?? "the business"}`,
    `Invoice no:  ${number}`,
    `Date:        ${bill.DateString?.slice(0, 10) ?? ""}`,
    `Your order:  ${po ?? "none given"}`,
    "",
    "Items on the bill",
    ...lines,
    "",
    `                                                   TOTAL DUE (USD)            ${money(usd)}`,
    currency === "ZAR"
      ? `                                                   (bill total in Xero: R ${money(cents(bill.AmountDue ?? 0))}, converted at R${rate.rate.toFixed(3)}/USD, ${rate.source === "valr" ? "VALR market price" : "fixed indicative rate"} at import)`
      : "",
    "",
    "How to pay",
    "Pay in RLUSD on the XRP Ledger to the payment address Gcina has on file for this supplier:",
    `  ${supplier.xrplAddress}`,
    `Reference: ${number}`,
    "",
  ].join("\n");

  const base = `xero-${number.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "bill"}`;
  let invoiceId = base;
  for (let n = 2; invoices.some((i) => i.id === invoiceId); n++) invoiceId = `${base}-${n}`;
  const made = await callPolicy("POST", "/invoices", { id: invoiceId, supplierName: supplier.name, rawText });
  if (made.status >= 300) throw new XeroError((made.body as { error?: string } | null)?.error ?? "The rules service didn't accept the bill.");

  const rec: XeroImport = { invoiceId, billNumber: number, contact, total: money(cents(bill.AmountDue ?? 0)), currency, usd: money(usd), rate: rate.rate, at: new Date().toISOString(), ...(po ? { po } : {}) };
  const fresh = await load(); // tokens may have been refreshed above
  await save({ ...fresh, imports: { ...(fresh.imports ?? {}), [billId]: rec } });
  return rec;
}

/** For every imported bill the ledger has now settled, record the payment in Xero (once). */
export async function syncPaid(origin: string): Promise<{ marked: number }> {
  if (!xeroConfigured()) return { marked: 0 };
  const s = await load();
  const pending = Object.entries(s.imports ?? {}).filter(([, i]) => !i.paymentId);
  if (!s.tokens || !s.tenantId || !s.account || pending.length === 0) return { marked: 0 };
  const [invoices, audit] = await Promise.all([policyGet<Invoice[]>("/invoices"), policyGet<AuditEvent[]>("/audit?limit=500")]);
  let marked = 0;
  let changed = false;
  for (const [billId, imp] of pending) {
    const inv = invoices.find((i) => i.id === imp.invoiceId);
    if (!inv) {
      // The demo was reset: forget it, so the bill can be sent again.
      delete s.imports![billId];
      changed = true;
      continue;
    }
    if (inv.status !== "paid") continue;
    const txHash = audit.find((e) => e.txHash && e.actor === "ledger" && ((e.data as { invoiceId?: string } | undefined)?.invoiceId === inv.id || new RegExp(`\\b${inv.id}\\b`).test(e.message)))?.txHash;
    if (!txHash) continue;
    try {
      const bill = (await xero<{ Invoices?: XeroBill[] }>(s, "GET", `/Invoices/${encodeURIComponent(billId)}`)).Invoices?.[0];
      const due = bill?.AmountDue ?? 0;
      if (!(due > 0)) throw new XeroError("The bill is no longer open in Xero.");
      const out = await xero<{ Payments?: { PaymentID: string }[] }>(
        s,
        "PUT",
        "/Payments",
        { Payments: [{ Invoice: { InvoiceID: billId }, Account: { AccountID: s.account.id }, Date: new Date().toISOString().slice(0, 10), Amount: due, Reference: `Gcina, XRP Ledger: ${origin}/r/${txHash}`.slice(0, 250) }] },
        `gcina-pay-${billId}`,
      );
      const paymentId = out.Payments?.[0]?.PaymentID;
      if (!paymentId) throw new XeroError("Xero returned no payment.");
      Object.assign(imp, { paymentId, paidAt: new Date().toISOString(), txHash });
      delete imp.error;
      marked++;
    } catch (e) {
      imp.error = e instanceof Error ? e.message : String(e);
    }
    changed = true;
  }
  if (changed) await save(s);
  return { marked };
}
