import "server-only";
import { syncPaid } from "./xero";

// The agent is its own hosted service. It sleeps until there is work, so wake it when a bill
// arrives or the owner approves a payment. The wake-up carries no data and no authority:
// the agent reads its work from the policy service with its own token.
const AGENT_URL = (process.env.AGENT_URL ?? "https://gcina-agent.vercel.app").replace(/\/$/, "");

/** Wake the agent, wait for it to finish its pass, then record any newly settled Xero bills as paid. */
export async function wakeAgentThenSync(origin: string): Promise<void> {
  const secret = (process.env.AGENT_WAKE_SECRET ?? "").trim();
  await fetch(`${AGENT_URL}/run`, { method: "POST", headers: secret ? { "x-gcina-wake": secret } : {}, signal: AbortSignal.timeout(52_000) }).catch(() => undefined);
  await syncPaid(origin).catch(() => undefined);
}
