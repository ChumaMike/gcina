// XRPL access for the policy service. Holds ONLY the policy signer key.
import { Client, Wallet, multisign, hashes, type SubmittableTransaction } from "xrpl";
import { RLUSD_HEX } from "./amount.ts";

export type SubmitResult = {
  hash: string;
  engineResult: string;
  validated: boolean;
  /** Only set when the tx reached a validated ledger; tef/tem/tel never do, so no page exists. */
  explorerUrl?: string;
  /** Delivered amount from metadata (C4-RLUSD: trust delivered_amount, not Amount). */
  delivered?: unknown;
};

export type AccountBalances = { address: string; xrp: string | null; rlusd: string | null };

export interface Ledger {
  network: string;
  ledgerIndex(): Promise<number>;
  /** Policy signs the agent's exact tx (Signers stripped) and combines both signatures. No network. */
  cosign(unsignedTx: Record<string, unknown>, agentBlob: string): { blob: string; hash: string };
  /** Submits a fully signed blob and waits for validation or expiry. Throws only if the ledger can't be reached. */
  submit(blob: string, hash: string, lastLedger: number): Promise<SubmitResult>;
  /** Final state of an earlier submission: validated result, "expired" (past LastLedgerSequence, can never apply), or "pending". */
  lookup(hash: string, lastLedger: number): Promise<{ state: "validated"; result: string; delivered?: unknown } | { state: "expired" } | { state: "pending" }>;
  balances(addresses: Record<string, string>, rlusdIssuer: string): Promise<Record<string, AccountBalances>>;
}

export const explorerTx = (hash: string) => `https://testnet.xrpl.org/transactions/${hash}`;

export class XrplLedger implements Ledger {
  network = "testnet";
  private client: Client;
  private wallet: Wallet;
  private connecting?: Promise<void>;

  constructor(url: string, policySeed: string) {
    if (!/altnet|testnet/i.test(url)) throw new Error("Refusing to start: XRPL Testnet only.");
    this.client = new Client(url);
    this.wallet = Wallet.fromSeed(policySeed);
  }

  get policySignerAddress() {
    return this.wallet.classicAddress;
  }

  private async ready() {
    if (this.client.isConnected()) return;
    this.connecting ??= this.client.connect().finally(() => (this.connecting = undefined));
    await this.connecting;
  }

  async ledgerIndex() {
    await this.ready();
    return this.client.getLedgerIndex();
  }

  cosign(unsignedTx: Record<string, unknown>, agentBlob: string) {
    const policyBlob = this.wallet.sign(unsignedTx as unknown as SubmittableTransaction, true).tx_blob;
    const blob = multisign([agentBlob, policyBlob]);
    return { blob, hash: hashes.hashSignedTx(blob) };
  }

  async submit(blob: string, hash: string, lastLedger: number): Promise<SubmitResult> {
    await this.ready();
    const prelim = await this.client.submit(blob);
    const engine = prelim.result.engine_result;
    if (/^(tef|tem|tel)/.test(engine)) return { hash, engineResult: engine, validated: false };
    for (;;) {
      await new Promise((r) => setTimeout(r, 1000));
      const st = await this.lookup(hash, lastLedger);
      if (st.state === "validated") return { hash, engineResult: st.result, validated: true, explorerUrl: explorerTx(hash), delivered: st.delivered };
      if (st.state === "expired") return { hash, engineResult: `expired before validation (prelim ${engine})`, validated: false };
    }
  }

  async lookup(hash: string, lastLedger: number) {
    await this.ready();
    try {
      const tx = await this.client.request({ command: "tx", transaction: hash });
      if (tx.result.validated) {
        const meta = tx.result.meta as { TransactionResult?: string; delivered_amount?: unknown } | undefined;
        return { state: "validated" as const, result: meta?.TransactionResult ?? "unknown", delivered: meta?.delivered_amount };
      }
    } catch (e) {
      if ((e as { data?: { error?: string } })?.data?.error !== "txnNotFound") throw e;
    }
    // Only final once a VALIDATED ledger is past LastLedgerSequence.
    const validated = await this.client.request({ command: "ledger", ledger_index: "validated" });
    return Number(validated.result.ledger_index) > lastLedger ? { state: "expired" as const } : { state: "pending" as const };
  }

  async balances(addresses: Record<string, string>, rlusdIssuer: string) {
    await this.ready();
    const out: Record<string, AccountBalances> = {};
    for (const [name, address] of Object.entries(addresses)) {
      let xrp: string | null = null;
      let rlusd: string | null = null;
      try {
        const info = await this.client.request({ command: "account_info", account: address, ledger_index: "validated" });
        const drops = BigInt(String(info.result.account_data.Balance));
        xrp = `${drops / 1_000_000n}.${(drops % 1_000_000n).toString().padStart(6, "0")}`;
        const lines = await this.client.request({ command: "account_lines", account: address, peer: rlusdIssuer, ledger_index: "validated" });
        const line = lines.result.lines.find((l) => l.currency === RLUSD_HEX);
        if (line) rlusd = line.balance;
      } catch {
        /* unfunded or unreachable: leave nulls */
      }
      out[name] = { address, xrp, rlusd };
    }
    return out;
  }
}
