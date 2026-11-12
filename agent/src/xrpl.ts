// XRPL helpers for the agent, copied and trimmed from ledger/src/xrpl.ts (no imports across folders).
// Testnet only. The seed never leaves this process and is never printed: only addresses are.
import { Client, Wallet, convertStringToHex, type Payment } from "xrpl";
import { type Amount, toLedgerAmount } from "./amount.ts";
import { env } from "./env.ts";

export const EXPLORER = "https://testnet.xrpl.org";
export const explorerTx = (hash: string) => `${EXPLORER}/transactions/${hash}`;

let client: Client | null = null;

/** One shared connection. Refuses anything that looks like mainnet. */
export async function ledger(): Promise<Client> {
  if (/xrplcluster|s1\.ripple|s2\.ripple|mainnet/i.test(env.xrplWss)) {
    throw new Error("Refusing to connect: Gcina runs on XRPL Testnet only.");
  }
  if (!client) client = new Client(env.xrplWss);
  if (!client.isConnected()) await client.connect();
  return client;
}

export async function closeLedger(): Promise<void> {
  if (client?.isConnected()) await client.disconnect();
}

let signer: Wallet | null = null;
export function agentSigner(): Wallet {
  signer ??= Wallet.fromSeed(env.agentSignerSeed());
  return signer;
}

/** CONTRACTS §2: every payment carries {"invoiceId", "app":"gcina"} as a hex memo. */
function invoiceMemo(invoiceId: string) {
  return {
    Memo: {
      MemoType: convertStringToHex("application/json"),
      MemoData: convertStringToHex(JSON.stringify({ invoiceId, app: "gcina" })),
    },
  };
}

/**
 * Build, autofill and half-sign a Payment from the agent account.
 * Autofill happens right here, immediately before signing (C10: LastLedgerSequence is ~60-100 s away).
 * signersCount = 2 for a normal proposal (agent + policy), so the fee covers the quorum.
 * Flags 0: never a partial payment (C4). No SendMax / Paths.
 */
export type HalfSigned = { blob: string; hash: string; sequence: number; lastLedgerSequence: number };

export async function halfSignPayment(p: { to: string; amount: Amount; invoiceId: string }, signersCount = 2): Promise<HalfSigned> {
  const c = await ledger();
  const tx: Payment = {
    TransactionType: "Payment",
    Account: env.agentAccount,
    Destination: p.to,
    Amount: toLedgerAmount(p.amount, env.rlusdIssuer) as Payment["Amount"],
    Flags: 0,
    Memos: [invoiceMemo(p.invoiceId)],
  };
  const filled = await c.autofill(tx, signersCount);
  const signed = agentSigner().sign(filled, true); // multisign mode: this is ONE of the two signatures
  return { blob: signed.tx_blob, hash: signed.hash, sequence: Number(filled.Sequence), lastLedgerSequence: Number(filled.LastLedgerSequence) };
}

/** What the ledger did with the transaction that used this Sequence (if any). */
export type Fate =
  | { kind: "never" } // the validated ledger is past its LastLedgerSequence and the Sequence is unused: it can never apply
  | { kind: "applied"; hash: string; result: string; isPayment: boolean; destination?: string; invoiceId?: string }
  | { kind: "unknown"; why: string };

/**
 * Double-pay guard. After an uncertain answer ("could not be reached", a timeout, "expired before validation"),
 * the first co-signed transaction may still validate. We only know it can't once a VALIDATED ledger is past its
 * LastLedgerSequence. Then the account's Sequence tells us whether anything used that slot.
 */
export async function fateOf(t: { sequence: number; lastLedgerSequence: number }, maxWaitMs = 180_000): Promise<Fate> {
  const deadline = Date.now() + maxWaitMs;
  try {
    const c = await ledger();
    while ((await c.getLedgerIndex()) <= t.lastLedgerSequence) {
      if (Date.now() > deadline) return { kind: "unknown", why: `the ledger hasn't passed ledger ${t.lastLedgerSequence} yet` };
      await new Promise((r) => setTimeout(r, 2000));
    }
    const info = await c.request({ command: "account_info", account: env.agentAccount, ledger_index: "validated" });
    if (info.result.account_data.Sequence <= t.sequence) return { kind: "never" };
    // Something used that Sequence. Find it (newest first; our account only makes a few transactions).
    const txs = await c.request({ command: "account_tx", account: env.agentAccount, ledger_index_min: -1, ledger_index_max: -1, limit: 50, forward: false });
    for (const e of txs.result.transactions as unknown as Array<{ hash?: string; tx_json?: Record<string, unknown>; tx?: Record<string, unknown>; meta?: unknown; validated?: boolean }>) {
      const tx = e.tx_json ?? e.tx;
      if (!tx || Number(tx.Sequence) !== t.sequence || tx.Account !== env.agentAccount) continue;
      const meta = e.meta as { TransactionResult?: string } | undefined;
      return {
        kind: "applied",
        hash: String(e.hash ?? tx.hash ?? ""),
        result: meta?.TransactionResult ?? "unknown",
        isPayment: tx.TransactionType === "Payment",
        destination: typeof tx.Destination === "string" ? tx.Destination : undefined,
        invoiceId: memoInvoiceId(tx.Memos),
      };
    }
    return { kind: "unknown", why: `Sequence ${t.sequence} was used, but I couldn't find that transaction in the account's recent history` };
  } catch (e) {
    return { kind: "unknown", why: e instanceof Error ? e.message : String(e) };
  }
}

function memoInvoiceId(memos: unknown): string | undefined {
  if (!Array.isArray(memos)) return undefined;
  for (const m of memos as Array<{ Memo?: { MemoData?: string } }>) {
    try {
      const data = JSON.parse(Buffer.from(m.Memo?.MemoData ?? "", "hex").toString("utf8")) as { invoiceId?: string; app?: string };
      if (data.app === "gcina" && data.invoiceId) return data.invoiceId;
    } catch {
      /* not ours */
    }
  }
  return undefined;
}

export type DirectResult = { engineResult: string; message: string; applied: boolean; hash: string };

/**
 * The compromised agent's last resort: submit its own signature straight to the ledger, skipping the policy.
 * C3: plain submit, never submitAndWait (a tef result never reaches a ledger, so waiting would hang).
 */
export async function submitAlone(blob: string, hash: string): Promise<DirectResult> {
  const c = await ledger();
  const r = await c.submit(blob);
  const res = r.result as { engine_result: string; engine_result_message: string; applied?: boolean };
  return { engineResult: res.engine_result, message: res.engine_result_message, applied: res.applied ?? false, hash };
}
