// Idempotent XRPL Testnet setup for Gcina.
//   pnpm setup        (from ledger/)
// Re-running reuses the seeds in ledger/.env.testnet, tops up low balances, and only
// sends SignerListSet / AccountSet when the ledger state is not already correct.
// Prints addresses and tx hashes only. Seeds go to gitignored env files and nowhere else.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AccountSetAsfFlags, type Client, type SignerListSet, type AccountSet, type Payment } from "xrpl";
import { Wallet, connect, fundAccount, xrpBalanceDrops, explorerUrl, accountUrl, submitAndWait } from "../src/xrpl.ts";
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
    POLICY_URL: "http://localhost:8787",
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
  upsertEnv(WEB_ENV, { POLICY_URL: shared.POLICY_URL, OPERATOR_TOKEN: tokens.OPERATOR_TOKEN }, "# Gcina web env. Gitignored. Written by ledger/scripts/setup-testnet.ts");
}

function writeAddressesMd(w: Record<Name, Wallet>, newHashes: Record<string, string>) {
  const prev = existsSync(SETUP_HASHES) ? (JSON.parse(readFileSync(SETUP_HASHES, "utf8")) as Record<string, string>) : {};
  const hashes = { ...prev, ...newHashes };
  writeFileSync(SETUP_HASHES, JSON.stringify(hashes, null, 2) + "\n");
  const roles: Record<Name, string> = {
    TREASURY: "Business main account (operator); funds the agent float",
    AGENT_ACCOUNT: "Account the agent pays from. Master key disabled; SignerList quorum 2",
    SUPPLIER_A: "Mzansi Meat Supplies (approved)",
    SUPPLIER_B: "Khaya Packaging (approved)",
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

## Setup transactions
${txs || "- (no new setup transactions on the latest run; state was already correct)"}
`;
  writeFileSync(ADDRESSES_MD, md);
}

main().catch((e) => {
  console.error("setup failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
