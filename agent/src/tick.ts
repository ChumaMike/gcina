// One pass of the agent's work: every new invoice, oldest first, then every owner-approved hold.
// Shared by the command line (run.ts) and the hosted agent (api/vercel.ts).
import { handleApproval, handleInvoice, UncertainPayment } from "./agent.ts";
import { policy } from "./policy.ts";
import { ui } from "./ui.ts";

const failures = new Map<string, number>();

export async function tick(): Promise<number> {
  let worked = 0;
  const fresh = (await policy.invoices("new")).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  for (const inv of fresh) {
    if ((failures.get(inv.id) ?? 0) >= 2) continue;
    try {
      await handleInvoice(inv);
    } catch (e) {
      if (e instanceof UncertainPayment) {
        // It may already be paid. Leave it exactly as it is (status "processing") for a person; never retry.
        failures.set(inv.id, 2);
        ui.error(`${inv.id}: ${e.message}`);
        worked++;
        continue;
      }
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
