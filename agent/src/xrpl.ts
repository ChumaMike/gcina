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
export async function halfSignPayment(p: { to: string; amount: Amount; invoiceId: string }, signersCount = 2): Promise<{ blob: string; hash: string }> {
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
  return { blob: signed.tx_blob, hash: signed.hash };
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
