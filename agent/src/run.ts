// pnpm agent once [--evidence]    work through every new invoice, then every owner-approved hold, then stop
// pnpm agent watch [--evidence]   keep doing that every 5 s (the dashboard's "invoice arrived" button feeds it)
// AGENT_MODE=compromised pnpm agent once   the fooled agent: obeys the invoice, then tries to go around the policy
import { enableEvidence, handleApproval, handleInvoice } from "./agent.ts";
import { env } from "./env.ts";
import { policy } from "./policy.ts";
import { c, ui } from "./ui.ts";
import { closeLedger } from "./xrpl.ts";

const [cmd = "once"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (process.argv.includes("--evidence")) enableEvidence();

const failures = new Map<string, number>();

async function tick(): Promise<number> {
  let worked = 0;
  const fresh = (await policy.invoices("new")).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  for (const inv of fresh) {
    if ((failures.get(inv.id) ?? 0) >= 2) continue;
    try {
      await handleInvoice(inv);
    } catch (e) {
      failures.set(inv.id, (failures.get(inv.id) ?? 0) + 1);
      ui.error(`Couldn't finish ${inv.id}: ${e instanceof Error ? e.message : String(e)}`);
      // Put it back for one more try. Safe: an invoice the policy already held or paid can't be reset by the agent.
      await policy.updateInvoice(inv.id, { status: "new" }).catch(() => undefined);
    }
    worked++;
  }
  for (const ap of await policy.approvedApprovals()) {
    try {
      await handleApproval(ap);
    } catch (e) {
      ui.error(`Couldn't pay approved ${ap.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
    worked++;
  }
  return worked;
}

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
