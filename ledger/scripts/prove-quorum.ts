// Proves on XRPL Testnet that the agent cannot spend alone.
//   pnpm prove-quorum
// (a) agent-only multisigned payment       -> ledger rejects (expect tefBAD_QUORUM)
// (b) master key of AGENT_ACCOUNT          -> ledger rejects (expect tefMASTER_DISABLED)
// (c) agent + policy multisigned payment   -> tesSUCCESS
// Appends results to docs/demo-evidence.md. Prints addresses and hashes only.
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { Wallet, connect, buildPayment, signPartial, combine, submitAndWait, explorerUrl, formatAmount, type Amount } from "../src/xrpl.ts";
import { readEnv } from "../src/envfile.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const env = readEnv(resolve(ROOT, "ledger/.env.testnet"));
const EVIDENCE = resolve(ROOT, "docs/demo-evidence.md");
// PROOF_CURRENCY=RLUSD pays $1.00 RLUSD; default XRP pays 1 XRP.
const AMOUNT: Amount = process.env.PROOF_CURRENCY === "RLUSD" ? { currency: "RLUSD", value: "1.00" } : { currency: "XRP", value: "1000000" };

async function main() {
  const agentAccount = Wallet.fromSeed(env.AGENT_ACCOUNT_SEED);
  const agentSigner = Wallet.fromSeed(env.AGENT_SIGNER_SEED);
  const policySigner = Wallet.fromSeed(env.POLICY_SIGNER_SEED);
  const to = env.SUPPLIER_A_ADDRESS;
  const from = agentAccount.classicAddress;
  const client = await connect();
  try {
    // (a) agent alone
    const txA = await buildPayment(client, { from, to, amount: AMOUNT, invoiceId: "proof-agent-only" }, 1);
    const a = await submitAndWait(client, signPartial(agentSigner, txA).tx_blob);
    console.log(`(a) agent-only: ${a.engineResult} hash ${a.hash}`);

    // (b) the account's own (disabled) master key
    const txB = await buildPayment(client, { from, to, amount: AMOUNT, invoiceId: "proof-master-key" }, 0);
    const b = await submitAndWait(client, agentAccount.sign(txB).tx_blob);
    console.log(`(b) master key: ${b.engineResult} hash ${b.hash}`);

    // (c) agent + policy
    const txC = await buildPayment(client, { from, to, amount: AMOUNT, invoiceId: "proof-agent-plus-policy" }, 2);
    const blob = combine([signPartial(agentSigner, txC).tx_blob, signPartial(policySigner, txC).tx_blob]);
    const c = await submitAndWait(client, blob);
    console.log(`(c) agent+policy: ${c.engineResult} validated=${c.validated} ${explorerUrl(c.hash)}`);

    const at = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false });
    appendFileSync(
      EVIDENCE,
      `
## Quorum proof — ${at} SAST (\`ledger/scripts/prove-quorum.ts\`)

AGENT_ACCOUNT \`${from}\` (master disabled, SignerList quorum 2) → SUPPLIER_A \`${to}\`, ${formatAmount(AMOUNT)} each.

| Attempt | Signers (weight) | Ledger result | Hash |
|---|---|---|---|
| (a) Agent alone | AGENT_SIGNER (1) < quorum 2 | **${a.engineResult}** — rejected by the ledger, never included in a ledger | \`${a.hash}\` (not on ledger) |
| (b) Account's own master key | disabled | **${b.engineResult}** — rejected | \`${b.hash}\` (not on ledger) |
| (c) Agent + policy co-signer | AGENT_SIGNER (1) + POLICY_SIGNER (1) = 2 | **${c.engineResult}**${c.validated ? ", validated" : ""} | [${c.hash}](${explorerUrl(c.hash)}) |

\`tef*\` results are final rejections at submit time: the transaction never enters a ledger and no fee is charged,
so (a) and (b) have no explorer page. That is the point — the money cannot move.
`,
    );
    console.log(`\nAppended to docs/demo-evidence.md. (c): ${explorerUrl(c.hash)}`);
    if (c.engineResult !== "tesSUCCESS" || a.engineResult === "tesSUCCESS" || b.engineResult === "tesSUCCESS") process.exit(2);
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  console.error("prove-quorum failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
