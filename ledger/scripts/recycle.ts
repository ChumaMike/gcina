// Rehearsal helper: send the test RLUSD that demo runs paid out (to the two test suppliers and
// the test fraudster wallet) back to AGENT_ACCOUNT, so the demo can be run again and again
// without buying more. Testnet only. Prints addresses, amounts and hashes; never a seed.
//   pnpm recycle
import { resolve } from "node:path";
import { Wallet, buildPayment, connect, rlusdBalance, submitAndWait, toMinor, formatAmount } from "../src/xrpl.ts";
import { readEnv } from "../src/envfile.ts";

const env = readEnv(resolve(import.meta.dirname, "..", ".env.testnet"));

async function main() {
  const client = await connect();
  try {
    for (const who of ["SUPPLIER_A", "SUPPLIER_B", "FRAUDSTER"]) {
      const wallet = Wallet.fromSeed(env[`${who}_SEED`]);
      const held = await rlusdBalance(client, wallet.classicAddress);
      if (!held || toMinor(held.balance) <= 0n) {
        console.log(`${who}: nothing to send back`);
        continue;
      }
      const tx = await buildPayment(client, { from: wallet.classicAddress, to: env.AGENT_ACCOUNT_ADDRESS, amount: held.balance, invoiceId: "recycle" }, 0);
      const r = await submitAndWait(client, wallet.sign(tx).tx_blob);
      console.log(`${who}: ${formatAmount(held.balance)} back to the agent account: ${r.engineResult}`);
      if (r.engineResult !== "tesSUCCESS") process.exitCode = 1;
    }
    const agent = await rlusdBalance(client, env.AGENT_ACCOUNT_ADDRESS);
    if (agent) console.log(`Agent account now holds ${formatAmount(agent.balance)}`);
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  console.error("recycle failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
