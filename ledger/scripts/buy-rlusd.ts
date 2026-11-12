// TREASURY buys testnet RLUSD with XRP on XRPL's native AMM (XRP/RLUSD pool).
//   pnpm buy-rlusd [--target 250] [--evidence]
// 1. Reads the pool (amm_info) for the current price.
// 2. If TREASURY lacks XRP, funds throwaway faucet wallets (1000 XRP each) and sweeps them in.
// 3. OfferCreate (immediate-or-cancel) from TREASURY: takes RLUSD, pays XRP, capped at price + 2%.
//    The offer crosses the AMM (and any order book), so this is a real DEX swap on the ledger.
// 4. Then run `pnpm setup-testnet` to float RLUSD from TREASURY to AGENT_ACCOUNT.
// Prints addresses and hashes only.
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { OfferCreateFlags, type OfferCreate, type Payment, type Client } from "xrpl";
import { Wallet, connect, fundAccount, xrpBalanceDrops, rlusdBalance, submitAndWait, explorerUrl, accountUrl, toMinor, fromMinor, formatAmount, RLUSD_HEX, RLUSD_TESTNET_ISSUER } from "../src/xrpl.ts";
import { readEnv } from "../src/envfile.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const env = readEnv(resolve(ROOT, "ledger/.env.testnet"));
const argTarget = process.argv.indexOf("--target");
const TARGET_CENTS = BigInt(Math.round(Number(argTarget > 0 ? process.argv[argTarget + 1] : "250") * 100));
const SLIPPAGE_BPS = 200n; // pay at most 2% over the quoted price (fee 0.5% + price impact included)
const KEEP_XRP_DROPS = 20_000_000n; // TREASURY keeps >= 20 XRP for reserves and fees
const log = (s: string) => console.log(s);

async function poolQuote(client: Client) {
  const r = (await client.request({
    command: "amm_info",
    asset: { currency: "XRP" },
    asset2: { currency: RLUSD_HEX, issuer: RLUSD_TESTNET_ISSUER },
    ledger_index: "validated",
  } as never)) as { result: { amm: { account: string; amount: string; amount2: { value: string }; trading_fee: number } } };
  const a = r.result.amm;
  const xrpDrops = BigInt(a.amount);
  const rlusdCents = toMinor({ currency: "RLUSD", value: Number(a.amount2.value).toFixed(2) });
  return { account: a.account, xrpDrops, rlusdCents, feeBps: a.trading_fee / 10 /* 1/100000 → bps */ };
}

/** Constant-product cost in drops to take `cents` out of the pool, before fee. */
function quoteDrops(pool: { xrpDrops: bigint; rlusdCents: bigint }, cents: bigint): bigint {
  if (cents >= pool.rlusdCents) throw new Error("pool too shallow");
  return (pool.xrpDrops * cents) / (pool.rlusdCents - cents) + 1n;
}

async function topUpTreasuryXrp(client: Client, treasury: string, needDrops: bigint) {
  let bal = BigInt((await xrpBalanceDrops(client, treasury)) ?? "0");
  let i = 0;
  while (bal < needDrops + KEEP_XRP_DROPS) {
    if (++i > 8) throw new Error("faucet top-up loop exceeded 8 wallets");
    const { wallet } = await client.fundWallet(null, { amount: "1000" });
    const have = BigInt((await xrpBalanceDrops(client, wallet.classicAddress)) ?? "0");
    const send = have - 1_200_000n; // leave the 1 XRP base reserve + fee
    const tx: Payment = await client.autofill({ TransactionType: "Payment", Account: wallet.classicAddress, Destination: treasury, Amount: send.toString() });
    const r = await submitAndWait(client, wallet.sign(tx).tx_blob);
    if (r.engineResult !== "tesSUCCESS") throw new Error(`sweep failed: ${r.engineResult}`);
    bal = BigInt((await xrpBalanceDrops(client, treasury)) ?? "0");
    log(`swept faucet wallet ${wallet.classicAddress} → TREASURY (${Number(send) / 1e6} XRP); TREASURY now ${Number(bal) / 1e6} XRP`);
  }
}

async function main() {
  const treasury = Wallet.fromSeed(env.TREASURY_SEED);
  const client = await connect();
  try {
    const before = await rlusdBalance(client, treasury.classicAddress);
    if (!before) throw new Error("TREASURY has no RLUSD trust line. Run pnpm setup-testnet first.");
    const haveCents = toMinor(before.balance);
    if (haveCents >= TARGET_CENTS) {
      log(`TREASURY already holds ${formatAmount(before.balance)} (target ${formatAmount(fromMinor("RLUSD", TARGET_CENTS))}). Nothing to buy.`);
      return;
    }
    const buyCents = TARGET_CENTS - haveCents;
    const pool = await poolQuote(client);
    const rawDrops = quoteDrops(pool, buyCents);
    const maxDrops = (rawDrops * (10_000n + SLIPPAGE_BPS)) / 10_000n;
    log(`AMM ${pool.account}: ${Number(pool.xrpDrops) / 1e6} XRP / ${fromMinor("RLUSD", pool.rlusdCents).value} RLUSD, fee ${pool.feeBps} bps`);
    log(`buy ${formatAmount(fromMinor("RLUSD", buyCents))}: quote ≈ ${Number(rawDrops) / 1e6} XRP, cap ${Number(maxDrops) / 1e6} XRP`);

    await topUpTreasuryXrp(client, treasury.classicAddress, maxDrops);
    const xrpBefore = BigInt((await xrpBalanceDrops(client, treasury.classicAddress)) ?? "0");

    const offer: OfferCreate = await client.autofill({
      TransactionType: "OfferCreate",
      Account: treasury.classicAddress,
      TakerPays: { currency: RLUSD_HEX, issuer: RLUSD_TESTNET_ISSUER, value: fromMinor("RLUSD", buyCents).value },
      TakerGets: maxDrops.toString(),
      Flags: OfferCreateFlags.tfImmediateOrCancel,
    });
    const r = await submitAndWait(client, treasury.sign(offer).tx_blob);
    log(`OfferCreate (IOC) XRP→RLUSD: ${r.engineResult} ${r.explorerUrl ?? r.hash}`);
    if (r.engineResult !== "tesSUCCESS") throw new Error(`swap failed: ${r.engineResult}`);

    const after = (await rlusdBalance(client, treasury.classicAddress))!;
    const xrpAfter = BigInt((await xrpBalanceDrops(client, treasury.classicAddress)) ?? "0");
    const gotCents = toMinor(after.balance) - haveCents;
    const spent = xrpBefore - xrpAfter;
    log(`TREASURY RLUSD ${formatAmount(before.balance)} → ${formatAmount(after.balance)} (+${fromMinor("RLUSD", gotCents).value}); spent ${Number(spent) / 1e6} XRP incl. fee`);
    log("Next: pnpm setup-testnet  (floats RLUSD to AGENT_ACCOUNT)");

    if (process.argv.includes("--evidence")) {
      const at = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false });
      appendFileSync(
        resolve(ROOT, "docs/demo-evidence.md"),
        `
## Treasury buys RLUSD on XRPL's native AMM — ${at} SAST (\`ledger/scripts/buy-rlusd.ts\`)

TREASURY [\`${treasury.classicAddress}\`](${accountUrl(treasury.classicAddress)}) swapped **${Number(spent) / 1e6} XRP → $ ${fromMinor("RLUSD", gotCents).value} RLUSD**
through the XRP/RLUSD AMM pool [\`${pool.account}\`](${accountUrl(pool.account)}) (testnet RLUSD issuer \`${RLUSD_TESTNET_ISSUER}\`, pool fee ${pool.feeBps} bps).
Immediate-or-cancel OfferCreate capped at quote + 2%: [${r.hash.slice(0, 12)}…](${explorerUrl(r.hash)}) · **${r.engineResult}**.
`,
      );
      log("Appended to docs/demo-evidence.md");
    }
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  console.error("buy-rlusd failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
