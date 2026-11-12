// The owner fires (or re-hires) the AI agent, on the XRP Ledger itself.
//   pnpm fire-agent     owner's recovery key (weight 2) removes the agent's key from AGENT_ACCOUNT's SignerList
//   pnpm rehire-agent   puts it back (agent 1, policy 1, operator 2), for the next rehearsal
//   add --evidence to append the result to docs/demo-evidence.md
// The operator key alone meets the quorum (2), so the owner needs nobody's permission: not the agent's, not ours.
// In production this key lives in the owner's own wallet (e.g. a phone wallet or hardware key), never on a server.
// Prints addresses and hashes only.
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SignerListSet } from "xrpl";
import { Wallet, connect, submitAndWait, signPartial, combine, accountUrl } from "../src/xrpl.ts";
import { readEnv } from "../src/envfile.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const env = readEnv(resolve(ROOT, "ledger/.env.testnet"));
const mode = process.argv[2];
if (mode !== "fire" && mode !== "rehire") {
  console.error("Usage: tsx scripts/agent-key.ts fire|rehire [--evidence]");
  process.exit(1);
}

async function main() {
  const operator = Wallet.fromSeed(env.OPERATOR_SIGNER_SEED);
  const account = env.AGENT_ACCOUNT_ADDRESS;
  const entries = [
    ...(mode === "rehire" ? [{ Account: env.AGENT_SIGNER_ADDRESS, SignerWeight: 1 }] : []),
    { Account: env.POLICY_SIGNER_ADDRESS, SignerWeight: 1 },
    { Account: operator.classicAddress, SignerWeight: 2 },
  ];
  const client = await connect();
  try {
    const tx: SignerListSet = await client.autofill(
      { TransactionType: "SignerListSet", Account: account, SignerQuorum: 2, SignerEntries: entries.map((e) => ({ SignerEntry: e })) },
      1, // one signer: the owner's key (weight 2) meets the quorum on its own
    );
    const r = await submitAndWait(client, combine([signPartial(operator, tx).tx_blob]));
    const verb = mode === "fire" ? "FIRED: the agent's key is no longer on the account" : "RE-HIRED: the agent's key is back (weight 1 of quorum 2)";
    console.log(`${r.engineResult === "tesSUCCESS" ? "✅" : "⛔"} ${verb}: ${r.engineResult}`);
    if (r.explorerUrl) console.log(`   ${r.explorerUrl}`);
    console.log(`   signer list now: ${entries.map((e) => `${e.Account.slice(0, 5)}…(${e.SignerWeight})`).join(", ")}, quorum 2`);
    if (r.engineResult !== "tesSUCCESS") process.exitCode = 1;
    if (process.argv.includes("--evidence") && r.explorerUrl) {
      const at = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false });
      appendFileSync(
        resolve(ROOT, "docs/demo-evidence.md"),
        `\n## Owner ${mode === "fire" ? "fires" : "re-hires"} the agent: ${at} SAST (\`ledger/scripts/agent-key.ts ${mode}\`)\n\n` +
          `The owner's recovery key alone (weight 2 = quorum) rewrote the SignerList of [\`${account}\`](${accountUrl(account)}): ` +
          `${mode === "fire" ? "agent key removed; any payment it signs is now rejected by the ledger" : "agent key restored"}. ` +
          `[${r.hash.slice(0, 12)}…](${r.explorerUrl}) · **${r.engineResult}**.\n`,
      );
      console.log("   appended to docs/demo-evidence.md");
    }
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  console.error("agent-key failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
