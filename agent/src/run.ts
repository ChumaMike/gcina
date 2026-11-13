// pnpm agent once [--evidence]    work through every new invoice, then every owner-approved hold, then stop
// pnpm agent watch [--evidence]   keep doing that every 5 s (the dashboard's "invoice arrived" button feeds it)
// AGENT_MODE=compromised pnpm agent once   the fooled agent: obeys the invoice, then tries to go around the policy
import { enableEvidence } from "./agent.ts";
import { env } from "./env.ts";
import { policy } from "./policy.ts";
import { tick } from "./tick.ts";
import { c, ui } from "./ui.ts";
import { closeLedger } from "./xrpl.ts";

const [cmd = "once"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (process.argv.includes("--evidence")) enableEvidence();

async function main() {
  ui.banner(env.mode, env.policyUrl, env.currency, env.model);
  const health = await policy.health();
  if (health.agentAccount !== env.agentAccount) throw new Error(`The policy service guards ${health.agentAccount}, but this agent pays from ${env.agentAccount}.`);
  if (health.currency && health.currency !== env.currency) throw new Error(`The policy pays in ${health.currency}, but agent/.env says PAYMENT_CURRENCY=${env.currency}.`);

  if (cmd === "once") {
    if (!(await tick())) console.log(c.dim("  Nothing to do: no new invoices and no approved payments waiting.\n"));
    return;
  }
  if (cmd !== "watch") throw new Error(`Unknown command "${cmd}". Use: once | watch`);
  let stop = false;
  process.on("SIGINT", () => {
    stop = true;
    console.log(c.dim("\n  Stopping after this step…"));
  });
  while (!stop) {
    try {
      if (!(await tick())) ui.idle(`Waiting for invoices… ${new Date().toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false })}`);
    } catch (e) {
      ui.error(e instanceof Error ? e.message : String(e));
    }
    for (let i = 0; i < 10 && !stop; i++) await new Promise((r) => setTimeout(r, 500));
  }
}

main()
  .catch((e) => {
    ui.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(() => closeLedger());
