// Builds the app's dependencies from env. Shared by the local server and the Vercel entry.
import { resolve } from "node:path";
import { RLUSD_TESTNET_ISSUER, type Currency } from "./amount.ts";
import type { AppDeps } from "./app.ts";
import { XrplLedger } from "./ledger.ts";
import { JsonFileStore, type Store } from "./store.ts";
import { seedState } from "./seed.ts";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (run ledger: pnpm setup-testnet, which writes policy/.env).`);
  return v;
}

export function depsFromEnv(store?: Store): AppDeps {
  // Hard rule: the policy process never holds the agent's or the operator's key.
  for (const forbidden of ["AGENT_SIGNER_SEED", "OPERATOR_SIGNER_SEED", "AGENT_ACCOUNT_SEED"]) {
    if (process.env[forbidden]) throw new Error(`Refusing to start: ${forbidden} is visible to the policy process. Remove it.`);
  }
  const currency = (process.env.PAYMENT_CURRENCY ?? "RLUSD") as Currency;
  if (currency !== "RLUSD" && currency !== "XRP") throw new Error("PAYMENT_CURRENCY must be RLUSD or XRP.");
  const addresses = {
    treasury: req("TREASURY_ADDRESS"),
    agentAccount: req("AGENT_ACCOUNT_ADDRESS"),
    supplierA: req("SUPPLIER_A_ADDRESS"),
    supplierB: req("SUPPLIER_B_ADDRESS"),
  };
  const ledger = new XrplLedger(process.env.XRPL_WSS ?? "wss://s.altnet.rippletest.net:51233", req("POLICY_SIGNER_SEED"));
  const corsOrigins = ["http://localhost:3000", ...(process.env.WEB_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean)];
  return {
    store:
      store ??
      new JsonFileStore(resolve(process.env.STORE_PATH ?? resolve(import.meta.dirname, "..", "data", "store.json")), () =>
        seedState({ currency, supplierA: addresses.supplierA, supplierB: addresses.supplierB }),
      ),
    ledger,
    rules: {
      agentAccount: addresses.agentAccount,
      agentSignerAddress: req("AGENT_SIGNER_ADDRESS"),
      rlusdIssuer: process.env.RLUSD_ISSUER ?? RLUSD_TESTNET_ISSUER,
      maxFeeDrops: BigInt(process.env.MAX_FEE_DROPS ?? "1000"),
      maxLedgerWindow: Number(process.env.MAX_LEDGER_WINDOW ?? "40"),
    },
    tokens: { operator: req("OPERATOR_TOKEN"), agent: req("AGENT_TOKEN") },
    addresses,
    currency,
    corsOrigins,
  };
}
