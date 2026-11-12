// Idempotent XRPL Testnet setup for Gcina.
//   pnpm setup        (from ledger/)
// Re-running reuses the seeds in ledger/.env.testnet, tops up low balances, and only
// sends SignerListSet / AccountSet when the ledger state is not already correct.
// Prints addresses and tx hashes only. Seeds go to gitignored env files and nowhere else.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AccountSetAsfFlags, type Client, type SignerListSet, type AccountSet, type Payment } from "xrpl";
import {
  Wallet, connect, fundAccount, xrpBalanceDrops, explorerUrl, accountUrl, submitAndWait,
  buildRlusdTrustSet, rlusdBalance, buildPayment, toMinor, fromMinor, formatAmount, toLedgerAmount,
  signPartial, combine, RLUSD_TESTNET_ISSUER,
} from "../src/xrpl.ts";
import { readEnv, upsertEnv } from "../src/envfile.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const LEDGER_ENV = resolve(ROOT, "ledger/.env.testnet");
const AGENT_ENV = resolve(ROOT, "agent/.env");
const POLICY_ENV = resolve(ROOT, "policy/.env");
const WEB_ENV = resolve(ROOT, "web/.env.local");
const ADDRESSES_MD = resolve(ROOT, "docs/addresses.md");
const SETUP_HASHES = resolve(ROOT, "ledger/setup-hashes.json"); // public tx hashes, committed

const FUNDED = ["TREASURY", "AGENT_ACCOUNT", "SUPPLIER_A", "SUPPLIER_B", "FRAUDSTER"] as const;
const KEYS_ONLY = ["AGENT_SIGNER", "POLICY_SIGNER", "OPERATOR_SIGNER"] as const;
type Name = (typeof FUNDED)[number] | (typeof KEYS_ONLY)[number];

const QUORUM = 2;
const WEIGHTS: Record<(typeof KEYS_ONLY)[number], number> = { AGENT_SIGNER: 1, POLICY_SIGNER: 1, OPERATOR_SIGNER: 2 };
const AGENT_FLOAT_TARGET_DROPS = 90_000_000n; // keep the agent float at >= 90 XRP for demo runs
const lsfDisableMaster = 0x00100000;

const log = (s: string) => console.log(s);
const xrp = (drops: string | bigint) => (Number(drops) / 1_000_000).toFixed(2) + " XRP";

async function main() {
  const env = readEnv(LEDGER_ENV);
  const wallets = {} as Record<Name, Wallet>;
  for (const n of [...FUNDED, ...KEYS_ONLY]) {
    const seed = env[`${n}_SEED`];
    wallets[n] = seed ? Wallet.fromSeed(seed) : Wallet.generate();
    log(`${seed ? "reuse " : "new   "} ${n.padEnd(16)} ${wallets[n].classicAddress}`);
  }
  const tokens = {
    OPERATOR_TOKEN: env.OPERATOR_TOKEN || randomBytes(24).toString("hex"),
    AGENT_TOKEN: env.AGENT_TOKEN || randomBytes(24).toString("hex"),
  };
  // Persist seeds before touching the network so a crash never loses a funded account.
  saveLedgerEnv(wallets, tokens);

  const client = await connect();
  const hashes: Record<string, string> = {};
  try {
    for (const n of FUNDED) {
      const bal = await xrpBalanceDrops(client, wallets[n].classicAddress);
      if (bal === null) {
        const r = await fundAccount(client, wallets[n]);
        log(`funded ${n} -> ${r.balance} XRP`);
      } else {
        log(`exists ${n} (${xrp(bal)})`);
      }
    }

    await ensureAgentFloat(client, wallets, hashes);
    await ensureSignerList(client, wallets, hashes);
    await ensureMasterDisabled(client, wallets, hashes);
    await ensureRlusd(client, wallets, hashes);

    writeEnvFiles(wallets, tokens);
    writeAddressesMd(wallets, hashes);
    log("\nDone. Env files written (gitignored); docs/addresses.md updated.");
    for (const [k, h] of Object.entries(hashes)) log(`  ${k}: ${explorerUrl(h)}`);
  } finally {
    await client.disconnect();
  }
}

async function ensureAgentFloat(client: Client, w: Record<Name, Wallet>, hashes: Record<string, string>) {
  const agentBal = BigInt((await xrpBalanceDrops(client, w.AGENT_ACCOUNT.classicAddress)) ?? "0");
  if (agentBal >= AGENT_FLOAT_TARGET_DROPS) return;
  const need = AGENT_FLOAT_TARGET_DROPS - agentBal;
  let treasuryBal = BigInt((await xrpBalanceDrops(client, w.TREASURY.classicAddress)) ?? "0");
  if (treasuryBal < need + 5_000_000n) {
    await fundAccount(client, w.TREASURY);
    treasuryBal = BigInt((await xrpBalanceDrops(client, w.TREASURY.classicAddress)) ?? "0");
    log(`topped up TREASURY from faucet (${xrp(treasuryBal)})`);
  }
  const amount = need < treasuryBal - 5_000_000n ? need : treasuryBal - 5_000_000n;
  const tx: Payment = await client.autofill({
    TransactionType: "Payment",
    Account: w.TREASURY.classicAddress,
    Destination: w.AGENT_ACCOUNT.classicAddress,
    Amount: amount.toString(),
  });
  const r = await submitAndWait(client, w.TREASURY.sign(tx).tx_blob);
  log(`TREASURY -> AGENT_ACCOUNT float ${xrp(amount)}: ${r.engineResult}`);
  if (r.engineResult !== "tesSUCCESS") throw new Error(`float top-up failed: ${r.engineResult}`);
  hashes["Treasury funds agent float"] = r.hash;
}

async function ensureSignerList(client: Client, w: Record<Name, Wallet>, hashes: Record<string, string>) {
  const want = KEYS_ONLY.map((n) => ({ Account: w[n].classicAddress, SignerWeight: WEIGHTS[n] }));
  const info = await client.request({
    command: "account_info",
    account: w.AGENT_ACCOUNT.classicAddress,
    signer_lists: true,
    ledger_index: "validated",
  } as never);
  const result = (info as { result: Record<string, unknown> }).result;
  const lists =
    ((result.signer_lists as unknown[]) ??
      ((result.account_data as Record<string, unknown>)?.signer_lists as unknown[]) ??
      []) as Array<{ SignerQuorum: number; SignerEntries: Array<{ SignerEntry: { Account: string; SignerWeight: number } }> }>;
  const current = lists[0];
  const same =
    current &&
    current.SignerQuorum === QUORUM &&
    current.SignerEntries.length === want.length &&
    want.every((e) => current.SignerEntries.some((c) => c.SignerEntry.Account === e.Account && c.SignerEntry.SignerWeight === e.SignerWeight));
  if (same) {
    log("SignerList already correct (quorum 2: agent 1, policy 1, operator 2)");
    return;
  }
  const flags = Number((result.account_data as { Flags: number }).Flags);
  if (flags & lsfDisableMaster) {
    throw new Error("SignerList differs but master key is already disabled. Changing it needs a multi-signed SignerListSet (operator key); not automated.");
  }
  const tx: SignerListSet = await client.autofill({
    TransactionType: "SignerListSet",
    Account: w.AGENT_ACCOUNT.classicAddress,
    SignerQuorum: QUORUM,
    SignerEntries: want.map((e) => ({ SignerEntry: e })),
  });
  const r = await submitAndWait(client, w.AGENT_ACCOUNT.sign(tx).tx_blob);
  log(`SignerListSet: ${r.engineResult}`);
  if (r.engineResult !== "tesSUCCESS") throw new Error(`SignerListSet failed: ${r.engineResult}`);
  hashes["SignerListSet (quorum 2)"] = r.hash;
}

async function ensureMasterDisabled(client: Client, w: Record<Name, Wallet>, hashes: Record<string, string>) {
  const info = await client.request({ command: "account_info", account: w.AGENT_ACCOUNT.classicAddress, ledger_index: "validated" });
  if (Number(info.result.account_data.Flags) & lsfDisableMaster) {
    log("AGENT_ACCOUNT master key already disabled");
    return;
  }
  const tx: AccountSet = await client.autofill({
    TransactionType: "AccountSet",
    Account: w.AGENT_ACCOUNT.classicAddress,
    SetFlag: AccountSetAsfFlags.asfDisableMaster,
  });
  const r = await submitAndWait(client, w.AGENT_ACCOUNT.sign(tx).tx_blob);
  log(`AccountSet asfDisableMaster: ${r.engineResult}`);
  if (r.engineResult !== "tesSUCCESS") throw new Error(`disable master failed: ${r.engineResult}`);
  hashes["AccountSet asfDisableMaster"] = r.hash;
}

const RLUSD_HOLDERS = ["TREASURY", "AGENT_ACCOUNT", "SUPPLIER_A", "SUPPLIER_B", "FRAUDSTER"] as const;
// RLUSD float the agent is topped up to (whole dollars). Default $200 = about 3 demo runs ($65 each);
// AGENT_RLUSD_FLOAT=350 pnpm setup-testnet before a pitch = about 10 payments. Never above what TREASURY holds.
const floatDollars = process.env.AGENT_RLUSD_FLOAT ?? "200";
if (!/^\d{1,4}$/.test(floatDollars)) throw new Error("AGENT_RLUSD_FLOAT must be whole dollars, e.g. 350");
const AGENT_RLUSD_FLOAT_CENTS = BigInt(floatDollars) * 100n;

async function ensureRlusd(client: Client, w: Record<Name, Wallet>, hashes: Record<string, string>) {
  for (const n of RLUSD_HOLDERS) {
    const line = await rlusdBalance(client, w[n].classicAddress);
    if (line) {
      log(`RLUSD trustline ${n} ok (${formatAmount(line.balance)})`);
      continue;
    }
    let blob: string;
    if (n === "AGENT_ACCOUNT") {
      // Master key is disabled: the TrustSet is multi-signed by agent + policy (quorum 2).
      const tx = await buildRlusdTrustSet(client, w[n].classicAddress, "1000000", 2);
      blob = combine([signPartial(w.AGENT_SIGNER, tx).tx_blob, signPartial(w.POLICY_SIGNER, tx).tx_blob]);
    } else {
      blob = w[n].sign(await buildRlusdTrustSet(client, w[n].classicAddress)).tx_blob;
    }
    const r = await submitAndWait(client, blob);
    log(`RLUSD TrustSet ${n}: ${r.engineResult}`);
    if (r.engineResult !== "tesSUCCESS") throw new Error(`TrustSet ${n} failed: ${r.engineResult}`);
    hashes[`RLUSD trustline ${n}${n === "AGENT_ACCOUNT" ? " (multi-signed)" : ""}`] = r.hash;
  }

  const agent = await rlusdBalance(client, w.AGENT_ACCOUNT.classicAddress);
  const agentCents = agent ? toMinor(agent.balance) : 0n;
  if (agentCents >= AGENT_RLUSD_FLOAT_CENTS) {
    log(`AGENT_ACCOUNT RLUSD float ok (${formatAmount(agent!.balance)})`);
    return;
  }
  const treasury = await rlusdBalance(client, w.TREASURY.classicAddress);
  const treasuryCents = treasury ? toMinor(treasury.balance) : 0n;
  const need = AGENT_RLUSD_FLOAT_CENTS - agentCents;
  const send = need < treasuryCents ? need : treasuryCents;
  if (send <= 0n) {
    log(`
RLUSD NEEDED: TREASURY has no RLUSD. Get testnet RLUSD from https://tryrlusd.com for ${w.TREASURY.classicAddress} (trustline is set), then re-run pnpm setup-testnet.`);
    return;
  }
  const amount = fromMinor("RLUSD", send);
  const tx = await client.autofill({
    TransactionType: "Payment" as const,
    Account: w.TREASURY.classicAddress,
    Destination: w.AGENT_ACCOUNT.classicAddress,
    Amount: toLedgerAmount(amount) as { currency: string; issuer: string; value: string },
    Flags: 0,
  });
  const r = await submitAndWait(client, w.TREASURY.sign(tx).tx_blob);
  log(`TREASURY -> AGENT_ACCOUNT RLUSD float ${formatAmount(amount)}: ${r.engineResult}`);
  if (r.engineResult !== "tesSUCCESS") throw new Error(`RLUSD float failed: ${r.engineResult}`);
  hashes["Treasury funds agent RLUSD float"] = r.hash;
}

function saveLedgerEnv(w: Record<Name, Wallet>, tokens: Record<string, string>) {
  const vals: Record<string, string> = { XRPL_WSS: "wss://s.altnet.rippletest.net:51233", ...tokens };
  for (const n of [...FUNDED, ...KEYS_ONLY]) {
    vals[`${n}_SEED`] = w[n].seed!;
    vals[`${n}_ADDRESS`] = w[n].classicAddress;
  }
  upsertEnv(LEDGER_ENV, vals, "# Gcina XRPL TESTNET keys. Gitignored. Never commit, paste or log.");
}

function writeEnvFiles(w: Record<Name, Wallet>, tokens: Record<string, string>) {
  const shared = {
    XRPL_WSS: "wss://s.altnet.rippletest.net:51233",
    PAYMENT_CURRENCY: "RLUSD",
    RLUSD_ISSUER: RLUSD_TESTNET_ISSUER,
    // Keep a POLICY_URL someone already set (e.g. the deployed policy); localhost only on first setup.
    POLICY_URL: readEnv(AGENT_ENV).POLICY_URL || "http://localhost:8787",
    AGENT_ACCOUNT_ADDRESS: w.AGENT_ACCOUNT.classicAddress,
  };
  upsertEnv(AGENT_ENV, {
    ...shared,
    AGENT_SIGNER_SEED: w.AGENT_SIGNER.seed!,
    AGENT_SIGNER_ADDRESS: w.AGENT_SIGNER.classicAddress,
    AGENT_TOKEN: tokens.AGENT_TOKEN,
    FRAUDSTER_ADDRESS: w.FRAUDSTER.classicAddress,
  }, "# Gcina agent env (testnet). Gitignored.");
  // The policy process gets ONLY the policy signer seed.
  upsertEnv(POLICY_ENV, {
    XRPL_WSS: shared.XRPL_WSS,
    PAYMENT_CURRENCY: shared.PAYMENT_CURRENCY,
    RLUSD_ISSUER: RLUSD_TESTNET_ISSUER,
    PORT: "8787",
    POLICY_SIGNER_SEED: w.POLICY_SIGNER.seed!,
    POLICY_SIGNER_ADDRESS: w.POLICY_SIGNER.classicAddress,
    AGENT_SIGNER_ADDRESS: w.AGENT_SIGNER.classicAddress,
    AGENT_ACCOUNT_ADDRESS: w.AGENT_ACCOUNT.classicAddress,
    TREASURY_ADDRESS: w.TREASURY.classicAddress,
    SUPPLIER_A_ADDRESS: w.SUPPLIER_A.classicAddress,
    SUPPLIER_B_ADDRESS: w.SUPPLIER_B.classicAddress,
    OPERATOR_TOKEN: tokens.OPERATOR_TOKEN,
    AGENT_TOKEN: tokens.AGENT_TOKEN,
  }, "# Gcina policy co-signer env (testnet). Gitignored.");
  upsertEnv(WEB_ENV, { POLICY_URL: readEnv(WEB_ENV).POLICY_URL || shared.POLICY_URL, OPERATOR_TOKEN: tokens.OPERATOR_TOKEN }, "# Gcina web env. Gitignored. Written by ledger/scripts/setup-testnet.ts");
}

function writeAddressesMd(w: Record<Name, Wallet>, newHashes: Record<string, string>) {
  const prev = existsSync(SETUP_HASHES) ? (JSON.parse(readFileSync(SETUP_HASHES, "utf8")) as Record<string, string>) : {};
  const hashes = { ...prev, ...newHashes };
  writeFileSync(SETUP_HASHES, JSON.stringify(hashes, null, 2) + "\n");
  const roles: Record<Name, string> = {
    TREASURY: "Business main account (operator); funds the agent's RLUSD float",
    AGENT_ACCOUNT: "Account the agent pays from. Master key disabled; SignerList quorum 2",
    SUPPLIER_A: "Mzansi Catering: learner meals (approved)",
    SUPPLIER_B: "Khaya Print & Stationery: learner packs (approved)",
    FRAUDSTER: "\"New banking details\" address. Never approved",
    AGENT_SIGNER: "Signer weight 1 (agent process)",
    POLICY_SIGNER: "Signer weight 1 (policy co-signer service)",
    OPERATOR_SIGNER: "Signer weight 2 (human recovery / override, offline)",
  };
  const rows = [...FUNDED, ...KEYS_ONLY]
    .map((n) => {
      const a = w[n].classicAddress;
      const link = (FUNDED as readonly string[]).includes(n) ? `[explorer](${accountUrl(a)})` : "key only, not funded";
      return `| \`${n}\` | \`${a}\` | ${roles[n]} | ${link} |`;
    })
    .join("\n");
  const txs = Object.entries(hashes).map(([k, h]) => `- ${k}: [${h.slice(0, 12)}…](${explorerUrl(h)})`).join("\n");
  const md = `# Gcina — XRPL Testnet addresses

Public addresses only. Seeds live in gitignored env files. Network: XRPL **Testnet**.
Generated by \`ledger/scripts/setup-testnet.ts\` (idempotent; re-running keeps these addresses).

| Name | Address | Role | Link |
|---|---|---|---|
${rows}

**AGENT_ACCOUNT SignerList:** quorum **2** — AGENT_SIGNER 1 · POLICY_SIGNER 1 · OPERATOR_SIGNER 2. Master key disabled.
So the agent alone (weight 1) can never move money; the ledger itself rejects it.

**Payment currency: RLUSD** (testnet issuer [\`${RLUSD_TESTNET_ISSUER}\`](${accountUrl(RLUSD_TESTNET_ISSUER)}), currency code \`524C555344000000000000000000000000000000\`).
All five funded accounts hold an RLUSD trust line; AGENT_ACCOUNT's was multi-signed (agent + policy) because its master key is disabled.
XRP only pays network fees and reserves.

## Setup transactions
${txs || "- (no new setup transactions on the latest run; state was already correct)"}
`;
  writeFileSync(ADDRESSES_MD, md);
}

main().catch((e) => {
  console.error("setup failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
