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
  type SubmittableTransaction,
} from "xrpl";

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
 * Builds an autofilled Payment ready for multi-signing.
 * signersCount defaults to 2 (agent + policy) so the fee covers the quorum.
 */
export async function buildPayment(
  client: Client,
  p: { from: string; to: string; amountDrops: Drops; invoiceId: string },
  signersCount = 2,
): Promise<Payment> {
  if (!/^\d+$/.test(p.amountDrops)) throw new Error("amountDrops must be an integer string");
  const tx: Payment = {
    TransactionType: "Payment",
    Account: p.from,
    Destination: p.to,
    Amount: p.amountDrops,
    Memos: [encodeMemo(p.invoiceId)],
  };
  return client.autofill(tx, signersCount);
}

/** One signer's partial (multisign) signature. Returns the tx blob carrying that one Signer. */
export function signPartial(wallet: Wallet, tx: SubmittableTransaction): { tx_blob: string; hash: string } {
  return wallet.sign(tx, true);
}

/** Combine partial blobs into one multisigned blob. */
export function combine(blobs: string[]): string {
  return multisign(blobs);
}

export type SubmitResult = { hash: string; engineResult: string; validated: boolean; explorerUrl: string };

/** Submit and wait for validation. Never throws on a ledger rejection; returns the engine result instead. */
export async function submitAndWait(client: Client, txBlob: string): Promise<SubmitResult> {
  const prelim = await client.submit(txBlob);
  const hash = prelim.result.tx_json?.hash ?? (prelim.result as { hash?: string }).hash ?? "";
  const engine = prelim.result.engine_result;
  // tef*/tem*/tel* never reach a ledger: report the rejection as-is.
  if (/^(tef|tem|tel)/.test(engine)) {
    return { hash, engineResult: engine, validated: false, explorerUrl: explorerUrl(hash) };
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
      return { hash, engineResult: `expired (prelim ${engine})`, validated: false, explorerUrl: explorerUrl(hash) };
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
