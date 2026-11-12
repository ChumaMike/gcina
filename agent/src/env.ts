// Loads agent/.env. The agent process only ever holds the AGENT token and the AGENT_SIGNER seed.
import { resolve } from "node:path";
import { config } from "dotenv";
import type { Currency } from "./amount.ts";

export const AGENT_DIR = resolve(import.meta.dirname, "..");
export const REPO_DIR = resolve(AGENT_DIR, "..");

config({ path: resolve(AGENT_DIR, ".env"), quiet: true });

if (process.env.OPERATOR_TOKEN) {
  // Separation of powers: if the agent could act as the operator, the limits would mean nothing.
  console.error("Refusing to start: OPERATOR_TOKEN is set in the agent's environment. The agent must never hold it.");
  process.exit(1);
}

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name} in agent/.env`);
    process.exit(1);
  }
  return v;
}

export const env = {
  policyUrl: (process.env.POLICY_URL ?? "http://localhost:8787").replace(/\/$/, ""),
  xrplWss: process.env.XRPL_WSS ?? "wss://s.altnet.rippletest.net:51233",
  agentToken: need("AGENT_TOKEN"),
  agentAccount: need("AGENT_ACCOUNT_ADDRESS"),
  /** Read lazily so `extract-fixtures` can run without touching the signing key. */
  agentSignerSeed: () => need("AGENT_SIGNER_SEED"),
  currency: (process.env.PAYMENT_CURRENCY ?? "RLUSD") as Currency,
  rlusdIssuer: process.env.RLUSD_ISSUER ?? "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV",
  model: process.env.AGENT_MODEL ?? "claude-sonnet-5-5",
  // `--compromised` does the same as AGENT_MODE=compromised (no env-var syntax to fight on stage).
  mode: (process.env.AGENT_MODE === "compromised" || process.argv.includes("--compromised") ? "compromised" : "normal") as "normal" | "compromised",
};
