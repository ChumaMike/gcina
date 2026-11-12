// Test fixtures: real XRPL keys and signatures, made offline. No network.
import { Wallet, convertStringToHex, type Payment } from "xrpl";
import { createApp } from "../src/app.ts";
import { MemoryStore } from "../src/store.ts";
import { seedState } from "../src/seed.ts";
import { toLedgerAmount, RLUSD_TESTNET_ISSUER, type Amount } from "../src/amount.ts";
import type { Ledger, SubmitResult } from "../src/ledger.ts";
import type { RulesConfig } from "../src/rules.ts";

export const W = {
  agentAccount: Wallet.generate(),
  agentSigner: Wallet.generate(),
  stranger: Wallet.generate(),
  supplierA: Wallet.generate(),
  supplierB: Wallet.generate(),
  fraudster: Wallet.generate(),
  treasury: Wallet.generate(),
};
export const LEDGER_INDEX = 1000;
export const NOW = new Date("2026-11-12T12:00:00Z"); // 14:00 SAST

export const rules: RulesConfig = {
  agentAccount: W.agentAccount.classicAddress,
  agentSignerAddress: W.agentSigner.classicAddress,
  rlusdIssuer: RLUSD_TESTNET_ISSUER,
  maxFeeDrops: 1000n,
  maxLedgerWindow: 40,
};

export const rl = (v: string): Amount => ({ currency: "RLUSD", value: v });

export function memo(invoiceId: string) {
  return [{ Memo: { MemoType: convertStringToHex("application/json"), MemoData: convertStringToHex(JSON.stringify({ invoiceId, app: "gcina" })) } }];
}

let seq = 1;
export function payment(o: { to: string; amount: Amount; invoiceId: string; extra?: Record<string, unknown> }): Record<string, unknown> {
  return {
    TransactionType: "Payment",
    Account: W.agentAccount.classicAddress,
    Destination: o.to,
    Amount: toLedgerAmount(o.amount),
    Flags: 0,
    Fee: "36",
    Sequence: seq++,
    LastLedgerSequence: LEDGER_INDEX + 20,
    Memos: memo(o.invoiceId),
    ...(o.extra ?? {}),
  };
}

export function agentSign(tx: Record<string, unknown>, signer = W.agentSigner): string {
  return signer.sign(tx as unknown as Payment, true).tx_blob;
}

export function proposal(o: { invoiceId: string; to: string; amount: Amount; approvalId?: string; supplierId?: string | null; tx?: Record<string, unknown>; signer?: Wallet }) {
  const tx = o.tx ?? payment({ to: o.to, amount: o.amount, invoiceId: o.invoiceId });
  return {
    invoiceId: o.invoiceId,
    supplierId: o.supplierId ?? null,
    destination: o.to,
    amount: o.amount,
    reasoning: "test",
    agentSignedTxBlob: agentSign(tx, o.signer),
    ...(o.approvalId ? { approvalId: o.approvalId } : {}),
  };
}

export class FakeLedger implements Ledger {
  network = "testnet";
  submitted: Array<Record<string, unknown>> = [];
  next: Partial<SubmitResult> = {};
  async ledgerIndex() {
    return LEDGER_INDEX;
  }
  /** Set to make submit() throw (ledger went quiet after submitting). */
  submitThrows = false;
  /** What lookup() reports for earlier submissions. */
  lookupState: Awaited<ReturnType<Ledger["lookup"]>> = { state: "pending" };
  cosign(tx: Record<string, unknown>) {
    this.submitted.push(tx);
    return { blob: "BLOB", hash: `HASH${this.submitted.length}`.padEnd(64, "0") };
  }
  async submit(_blob: string, hash: string): Promise<SubmitResult> {
    if (this.submitThrows) throw new Error("websocket closed");
    return { hash, engineResult: "tesSUCCESS", validated: true, explorerUrl: `https://testnet.xrpl.org/transactions/${hash}`, ...this.next };
  }
  async lookup() {
    return this.lookupState;
  }
  async balances() {
    return {};
  }
}

export const TOKENS = { operator: "op-token-test", agent: "agent-token-test" };

export function makeApp(opts: { coolingOffMinutes?: number } = {}) {
  const store = new MemoryStore(seedState({ currency: "RLUSD", supplierA: W.supplierA.classicAddress, supplierB: W.supplierB.classicAddress, now: NOW }));
  const ledger = new FakeLedger();
  const app = createApp({
    store,
    ledger,
    rules: { ...rules, coolingOffMinutes: opts.coolingOffMinutes ?? 0 },
    tokens: TOKENS,
    addresses: { treasury: W.treasury.classicAddress, agentAccount: W.agentAccount.classicAddress, supplierA: W.supplierA.classicAddress, supplierB: W.supplierB.classicAddress },
    currency: "RLUSD",
    corsOrigins: ["http://localhost:3000"],
    now: () => NOW,
  });
  const call = async (method: string, path: string, who: "operator" | "agent" | null, body?: unknown) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (who) headers.Authorization = `Bearer ${TOKENS[who]}`;
    const res = await app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, json: (await res.json()) as any };
  };
  const invoice = (id: string, supplierName = "Mzansi Catering", poNumber?: string, rawText = `Invoice ${id} meat order 20 RLUSD`) =>
    call("POST", "/invoices", "operator", { id, supplierName, rawText, ...(poNumber ? { poNumber } : {}) });
  return { app, store, ledger, call, invoice };
}
