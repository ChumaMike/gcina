// Gcina ledger helpers. XRPL Testnet only.
// Seeds are never logged: functions here take Wallets, and only ever print addresses.
import {
  Client,
  Wallet,
  decode,
  multisign,
  convertStringToHex,
  convertHexToString,
  type Payment,
  type TrustSet,
  type SubmittableTransaction,
} from "xrpl";
import { type Amount, toLedgerAmount, RLUSD_HEX, RLUSD_TESTNET_ISSUER, fromLedgerAmount } from "./amount.ts";

export * from "./amount.ts";

export const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233";
export const EXPLORER = "https://testnet.xrpl.org";

export type Drops = string;

export async function connect(url = process.env.XRPL_WSS ?? TESTNET_WSS): Promise<Client> {
  if (/xrplcluster|s1\.ripple|s2\.ripple|mainnet/i.test(url)) {
    throw new Error("Refusing to connect: Gcina runs on XRPL Testnet only.");
  }
  const client = new Client(url);
  await client.connect();
  return client;
}

/** Fund a new wallet (or top up an existing one) from the testnet faucet. */
export async function fundAccount(client: Client, wallet?: Wallet): Promise<{ wallet: Wallet; balance: number }> {
  const res = await client.fundWallet(wallet ?? null);
  return { wallet: res.wallet, balance: res.balance };
}

export type InvoiceMemo = { invoiceId: string; app: "gcina" };

export function encodeMemo(invoiceId: string) {
  const memo: InvoiceMemo = { invoiceId, app: "gcina" };
  return {
    Memo: {
      MemoType: convertStringToHex("application/json"),
      MemoData: convertStringToHex(JSON.stringify(memo)),
    },
  };
}

/** Returns the parsed gcina memo of a decoded tx, or null if it has none. */
export function readInvoiceMemo(tx: { Memos?: Array<{ Memo: { MemoData?: string } }> }): InvoiceMemo | null {
  for (const m of tx.Memos ?? []) {
    if (!m.Memo?.MemoData) continue;
    try {
      const parsed = JSON.parse(convertHexToString(m.Memo.MemoData));
      if (parsed && parsed.app === "gcina" && typeof parsed.invoiceId === "string") return parsed;
    } catch {
      /* not ours */
    }
  }
  return null;
}

/**
 * Builds an autofilled Payment ready for multi-signing (Flags 0: never a partial payment).
 * signersCount defaults to 2 (agent + policy) so the fee covers the quorum.
 * Autofill right before signing: LastLedgerSequence is ~20 ledgers (60-100 s) away.
 */
export async function buildPayment(
  client: Client,
  p: { from: string; to: string; amount: Amount; invoiceId: string },
  signersCount = 2,
): Promise<Payment> {
  const tx: Payment = {
    TransactionType: "Payment",
    Account: p.from,
    Destination: p.to,
    Amount: toLedgerAmount(p.amount) as Payment["Amount"],
    Flags: 0,
    Memos: [encodeMemo(p.invoiceId)],
  };
  return client.autofill(tx, signersCount);
}

/** TrustSet for RLUSD (unsigned, autofilled). */
export async function buildRlusdTrustSet(client: Client, account: string, limit = "1000000", signersCount = 0): Promise<TrustSet> {
  const tx: TrustSet = {
    TransactionType: "TrustSet",
    Account: account,
    LimitAmount: { currency: RLUSD_HEX, issuer: RLUSD_TESTNET_ISSUER, value: limit },
  };
  return client.autofill(tx, signersCount || undefined);
}

/** RLUSD balance (cents-exact Amount) or null if there is no trust line. */
export async function rlusdBalance(client: Client, address: string): Promise<{ balance: Amount; limit: string } | null> {
  try {
    const r = await client.request({ command: "account_lines", account: address, peer: RLUSD_TESTNET_ISSUER, ledger_index: "validated" });
    const line = r.result.lines.find((l) => l.currency === RLUSD_HEX);
    if (!line) return null;
    const bal = fromLedgerAmount({ currency: RLUSD_HEX, issuer: RLUSD_TESTNET_ISSUER, value: line.balance.replace(/^-/, "") });
    return bal ? { balance: bal, limit: line.limit } : { balance: { currency: "RLUSD", value: "0.00" }, limit: line.limit };
  } catch (e) {
    if ((e as { data?: { error?: string } })?.data?.error === "actNotFound") return null;
    throw e;
  }
}

/** One signer's partial (multisign) signature. Returns the tx blob carrying that one Signer. */
export function signPartial(wallet: Wallet, tx: SubmittableTransaction): { tx_blob: string; hash: string } {
  return wallet.sign(tx, true);
}

/** Combine partial blobs into one multisigned blob. */
export function combine(blobs: string[]): string {
  return multisign(blobs);
}

/** explorerUrl is only set when the tx reached a validated ledger (tef/tem/tel never do: no page exists). */
export type SubmitResult = { hash: string; engineResult: string; validated: boolean; explorerUrl?: string; submitResponse?: unknown };

/** Submit and wait for validation. Never throws on a ledger rejection; returns the engine result instead. */
export async function submitAndWait(client: Client, txBlob: string): Promise<SubmitResult> {
  const prelim = await client.submit(txBlob);
  const hash = prelim.result.tx_json?.hash ?? (prelim.result as { hash?: string }).hash ?? "";
  const engine = prelim.result.engine_result;
  // tef*/tem*/tel* never reach a ledger: report the rejection as-is.
  if (/^(tef|tem|tel)/.test(engine)) {
    return { hash, engineResult: engine, validated: false, submitResponse: { engine_result: engine, engine_result_message: prelim.result.engine_result_message, applied: (prelim.result as { applied?: boolean }).applied ?? false } };
  }
  const decoded = decode(txBlob) as { LastLedgerSequence?: number };
  const last = decoded.LastLedgerSequence ?? (await client.getLedgerIndex()) + 20;
  for (;;) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const tx = await client.request({ command: "tx", transaction: hash });
      if (tx.result.validated) {
        const meta = tx.result.meta as { TransactionResult?: string } | undefined;
        return { hash, engineResult: meta?.TransactionResult ?? engine, validated: true, explorerUrl: explorerUrl(hash) };
      }
    } catch (e) {
      const err = (e as { data?: { error?: string } })?.data?.error;
      if (err !== "txnNotFound") throw e;
    }
    if ((await client.getLedgerIndex()) > last) {
      return { hash, engineResult: `expired (prelim ${engine})`, validated: false };
    }
  }
}

export function explorerUrl(hash: string): string {
  return `${EXPLORER}/transactions/${hash}`;
}

export function accountUrl(address: string): string {
  return `${EXPLORER}/accounts/${address}`;
}

export function decodeBlob(blob: string): Record<string, unknown> {
  return decode(blob) as Record<string, unknown>;
}

export async function xrpBalanceDrops(client: Client, address: string): Promise<Drops | null> {
  try {
    const r = await client.request({ command: "account_info", account: address, ledger_index: "validated" });
    return String(r.result.account_data.Balance);
  } catch (e) {
    if ((e as { data?: { error?: string } })?.data?.error === "actNotFound") return null;
    throw e;
  }
}

export { Wallet };
