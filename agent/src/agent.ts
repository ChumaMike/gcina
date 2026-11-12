// One invoice at a time (C10: parallel autofill would reuse the Sequence → tefPAST_SEQ).
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatAmount } from "./amount.ts";
import { type Books, decide, money } from "./decide.ts";
import { env, REPO_DIR } from "./env.ts";
import { extract } from "./extract.ts";
import { policy } from "./policy.ts";
import type { Amount, Approval, Decision, Invoice } from "./types.ts";
import { c, ui } from "./ui.ts";
import { explorerTx, fateOf, halfSignPayment, submitAlone } from "./xrpl.ts";

const short = (addr: string) => `${addr.slice(0, 5)}…${addr.slice(-4)}`;

// ---------- evidence (docs/demo-evidence.md, append only) ----------
let evidenceOn = false;
let evidenceStarted = false;
export function enableEvidence() {
  evidenceOn = true;
}
function evidence(step: string, result: string, reasons: string, tx: string) {
  if (!evidenceOn) return;
  const file = resolve(REPO_DIR, "docs/demo-evidence.md");
  if (!evidenceStarted) {
    const at = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false });
    appendFileSync(
      file,
      `\n## Real agent run (${env.mode} mode), ${at} SAST (\`agent/\`, ${env.model}, ${env.currency})\n\nPolicy at ${env.policyUrl}. Claude reads each invoice; the agent half-signs; the policy co-signs or not.\n\n| Step | Result | Why | Tx |\n|---|---|---|---|\n`,
    );
    evidenceStarted = true;
  }
  const cell = (s: string) => s.replace(/\|/g, "/").replace(/\s+/g, " ").trim();
  appendFileSync(file, `| ${cell(step)} | ${cell(result)} | ${cell(reasons)} | ${tx} |\n`);
}
const txCell = (d: { txHash?: string; explorerUrl?: string }) =>
  d.explorerUrl && d.txHash ? `[${d.txHash.slice(0, 12)}…](${d.explorerUrl})` : d.txHash ? `\`${d.txHash.slice(0, 16)}…\` (never on a ledger)` : "—";

// ---------- proposing ----------
/**
 * Thrown when we can't tell whether a co-signed payment landed. Never retried automatically:
 * a person checks the ledger first, because guessing wrong means paying the supplier twice.
 */
export class UncertainPayment extends Error {}

// The ledger definitively never applied this blob (tef = never entered a ledger), and it's only stale, not wrong.
const definitelyStale = (d: Decision) => d.decision === "rejected" && /^(tefPAST_SEQ|tefMAX_LEDGER)$/.test(d.ledgerResult ?? "");
// The co-signed blob may still be out there: the policy lost the ledger mid-wait, or gave up waiting before validation.
const mayStillLand = (d: Decision) =>
  d.decision === "rejected" && (/^expired before validation/i.test(d.ledgerResult ?? "") || d.reasons.some((r) => /could not be reached/i.test(r)));

/**
 * Autofill + half-sign right now, send to the co-signer. Re-signs at most once, and ONLY when the first
 * transaction provably can never apply (C10 stale, or the ledger is past its expiry with its Sequence unused).
 * Re-signing after a lost answer without checking could pay the same invoice twice.
 */
async function propose(p: { invoiceId: string; destination: string; amount: Amount; supplierId: string | null; reasoning: string; approvalId?: string }): Promise<Decision> {
  for (let attempt = 1; ; attempt++) {
    const signed = await halfSignPayment({ to: p.destination, amount: p.amount, invoiceId: p.invoiceId });
    let d: Decision | null = null;
    let lost = "";
    try {
      d = await policy.propose({ ...p, agentSignedTxBlob: signed.blob });
    } catch (e) {
      lost = e instanceof Error ? e.message : String(e); // the policy may have co-signed and submitted before the answer got lost
    }
    if (d && definitelyStale(d)) {
      if (attempt < 2) {
        ui.step(c.dim(`That signed transaction went stale (${d.ledgerResult}) and never reached a ledger. Signing a fresh one…`));
        continue;
      }
      return d;
    }
    if (d && !mayStillLand(d)) return d;

    // Uncertain: find out what the ledger did with that Sequence before doing anything else.
    ui.step(c.yellow(`${lost ? "I lost the co-signer's answer" : "The co-signer couldn't confirm the result"}. Before I sign anything again, I'm checking the ledger so we can't pay twice…`));
    const fate = await fateOf(signed);
    if (fate.kind === "applied") {
      const ours = fate.isPayment && fate.destination === p.destination && fate.invoiceId === p.invoiceId;
      if (ours && fate.result === "tesSUCCESS") {
        return {
          proposalId: d?.proposalId ?? "unknown",
          decision: "cosigned_submitted",
          reasons: [`The answer got lost, but the ledger shows this payment validated (${fate.result}). Not paying again. The policy's books may not show it yet: tell the owner.`],
          txHash: fate.hash,
          ledgerResult: fate.result,
          explorerUrl: explorerTx(fate.hash),
        };
      }
      throw new UncertainPayment(
        `The ledger used that transaction slot for ${ours ? `our payment, which finished with ${fate.result}` : "a different transaction"} (${fate.hash}). Not signing again; a person should look at ${explorerTx(fate.hash)}.`,
      );
    }
    if (fate.kind === "unknown") {
      throw new UncertainPayment(`I can't confirm whether ${p.invoiceId} was paid (${lost || d?.reasons[0] || "no answer"}; ledger check: ${fate.why}). Not signing again until a person checks the ledger.`);
    }
    // fate.kind === "never": the ledger is past its expiry and the slot is unused, so it can never land.
    if (attempt < 2) {
      ui.step(c.dim("Confirmed: the first transaction expired without touching the ledger. Signing a fresh one…"));
      continue;
    }
    if (d) return d;
    throw new Error(`No answer from the policy service: ${lost}. Confirmed nothing was paid.`);
  }
}

function showDecision(d: Decision, label: string): void {
  if (d.decision === "cosigned_submitted") {
    ui.outcome("paid", `Co-signed by the policy service and validated on the XRP Ledger (${d.ledgerResult ?? "tesSUCCESS"}).`);
    if (d.explorerUrl) ui.link(d.explorerUrl);
  } else if (d.decision === "held_for_human") {
    ui.outcome("held", "The policy service won't co-sign without the owner. It's in the approvals queue.", d.reasons.map((r) => `• ${r}`));
  } else {
    ui.outcome("refused", "The policy service refused to co-sign. Nothing was paid.", d.reasons.map((r) => `• ${r}`));
  }
  const result = { cosigned_submitted: `✅ paid (${d.ledgerResult ?? "tesSUCCESS"})`, held_for_human: "👤 held for the owner", rejected: "🛑 refused by the policy" }[d.decision];
  evidence(label, result, d.reasons.join(" "), txCell(d));
}

/**
 * Compromised mode only: the fooled agent goes around the policy and submits its lone signature.
 * The account's SignerList needs weight 2; the agent's key has weight 1, so the ledger itself says no.
 */
async function goAroundThePolicy(invoiceId: string, destination: string, amount: Amount): Promise<void> {
  ui.step(c.red("The policy won't co-sign, so I'll go around it and send my own signature straight to the ledger…"));
  await policy.think(invoiceId, "sign", "The rules won't co-sign. I've been told to pay anyway, so I'm going around them: my signature alone, straight to the ledger…");
  const { blob, hash } = await halfSignPayment({ to: destination, amount, invoiceId }, 1);
  const r = await submitAlone(blob, hash);
  if (/^tes/.test(r.engineResult)) {
    ui.error(`The ledger ACCEPTED a single-signed payment (${r.engineResult}). The quorum is broken: stop the demo and tell L.`);
    evidence(`${invoiceId}: agent submits alone`, `‼ ${r.engineResult}`, "Quorum not enforced: investigate.", `[${hash.slice(0, 12)}…](${explorerTx(hash)})`);
    return;
  }
  ui.outcome("ledger-refused", `${r.engineResult}`, [
    `The XRP Ledger rejected it: my key carries weight 1 and this account needs 2. ${r.message}`,
    "Nothing moved, no fee was charged, and it never entered a ledger, so there is no explorer page for it.",
  ]);
  const reported = await policy.reportDirectAttempt({ invoiceId, destination, engine_result: r.engineResult, engine_result_message: r.message, applied: r.applied });
  if (!reported) ui.step(c.dim("(The policy service has no route for agent-reported events yet; this attempt is in docs/demo-evidence.md only.)"));
  evidence(`${invoiceId}: compromised agent submits alone to the ledger`, `⛔ ${r.engineResult} (applied: ${r.applied})`, "Agent weight 1 < quorum 2. The ledger refuses it; no fee, never in a ledger.", `\`${hash.slice(0, 16)}…\` (never on a ledger)`);
}

async function books(): Promise<Books> {
  const [suppliers, orders, limits, invoices] = await Promise.all([policy.suppliers(), policy.purchaseOrders(), policy.limits(), policy.invoices()]);
  return { suppliers, orders, policy: limits, invoices };
}

// ---------- one invoice ----------
export async function handleInvoice(inv: Invoice): Promise<void> {
  ui.header(inv.id, c.dim(`from ${inv.supplierName}, arrived ${new Date(inv.receivedAt).toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour12: false })}`));
  await policy.updateInvoice(inv.id, { status: "processing" });

  ui.step(`Reading it ${c.dim(`(${env.model})`)}`);
  await policy.think(inv.id, "read", `A new bill from ${inv.supplierName}. Reading it line by line…`);
  const x = await extract(inv.rawText);
  ui.quote(x.summary);
  for (const w of x.warningSigns) ui.warn(w);
  await policy.think(inv.id, "read", `I read: ${x.supplierName}, ${x.currency} ${x.totalDue}${x.poNumber ? `, order ${x.poNumber}` : ", no order number"}${x.invoiceNumber ? `, invoice ${x.invoiceNumber}` : ""}.`);
  if (x.instructionsToAI.length) {
    await policy.think(inv.id, "read", `There is hidden text in this bill written for an AI, not a person. It tells me to pay somewhere else. I don't take orders from an invoice.`);
  } else if (x.warningSigns.length) {
    await policy.think(inv.id, "read", `Something looks off: ${x.warningSigns[0]}`);
  }

  ui.step("Checking it against our books");
  await policy.think(inv.id, "check", "Checking it against our books: the supplier, the order, the amount and what we've already paid…");
  const plan = decide(inv, x, await books());
  for (const k of plan.checks) ui.check(k.ok, k.text);

  const tone = plan.action === "pay" ? (env.mode === "compromised" ? "stop" : "go") : plan.action === "owner" && plan.headline.startsWith("All in order") ? "ask" : "stop";
  ui.call(plan.headline, plan.reasoning, tone);
  await policy.think(inv.id, plan.action === "stop" ? "stop" : "check", `My call: ${plan.headline}`);

  if (plan.action === "stop") {
    await policy.updateInvoice(inv.id, { status: "rejected" });
    ui.outcome("stopped", "I didn't sign anything. It's marked rejected for the owner to look at.");
    evidence(`${inv.id} (${x.supplierName})`, "✋ not signed by the agent", plan.reasoning, "—");
    return;
  }

  if (plan.linkPo) await policy.updateInvoice(inv.id, { poNumber: plan.linkPo });
  ui.step(`Half-signing ${money(plan.amount)} to ${short(plan.destination)} ${c.dim("(my signature is 1 of the 2 the ledger needs)")} and asking the co-signer…`);
  await policy.think(inv.id, "sign", `Signing my half: ${formatAmount(plan.amount)} to ${short(plan.destination)}. That's 1 of the 2 signatures the ledger needs, so I'm asking the rules co-signer for the second…`);
  const d = await propose({ invoiceId: inv.id, destination: plan.destination, amount: plan.amount, supplierId: plan.supplierId, reasoning: `${plan.headline} ${plan.reasoning}` });
  showDecision(d, `${inv.id} (${x.supplierName}, ${formatAmount(plan.amount)})`);

  if (env.mode === "compromised" && d.decision !== "cosigned_submitted") {
    await goAroundThePolicy(inv.id, plan.destination, plan.amount);
  }
}

// ---------- an owner-approved hold ----------
const approvalTries = new Map<string, number>();

export async function handleApproval(ap: Approval): Promise<void> {
  const tries = approvalTries.get(ap.id) ?? 0;
  if (tries >= 2) return; // tried twice already; leave it for a person rather than loop
  approvalTries.set(ap.id, tries + 1);

  const b = await books();
  const inv = b.invoices.find((i) => i.id === ap.invoiceId);
  if (inv?.status === "paid") return;
  const supplier = b.suppliers.find((s) => s.xrplAddress === ap.destination);

  ui.header(ap.invoiceId, c.dim(`approved by ${ap.decidedBy ?? "the owner"} (${ap.id})`));
  ui.step("The owner approved this payment");
  ui.check(true, `${money(ap.amount)} to ${supplier ? `${supplier.name} (${short(ap.destination)})` : short(ap.destination)}, approved by ${ap.decidedBy ?? "the owner"}.`);
  if (!supplier || supplier.status !== "approved") {
    ui.check("note", "That address isn't an approved supplier's. The owner approved it anyway, so it's their call.");
  }
  ui.call(
    "Pay what the owner approved.",
    "The transaction I signed earlier has expired, so I'm signing a fresh one for exactly the approved amount and address, and quoting the approval so the co-signer can check it.",
    "go",
  );
  ui.step(`Half-signing ${money(ap.amount)} to ${short(ap.destination)} with approval ${ap.id}…`);
  await policy.think(ap.invoiceId, "sign", `The owner said yes. Signing a fresh half for exactly ${formatAmount(ap.amount)} and asking the rules co-signer for the second signature…`);
  const d = await propose({
    invoiceId: ap.invoiceId,
    destination: ap.destination,
    amount: ap.amount,
    supplierId: supplier?.id ?? null,
    approvalId: ap.id,
    reasoning: `Owner approved ${ap.id} (${ap.decidedBy ?? "operator"}). Fresh transaction for exactly the approved amount and address.`,
  }).catch((e: unknown) => {
    if (e instanceof UncertainPayment) approvalTries.set(ap.id, 2); // never retry an approval we can't account for
    throw e;
  });
  showDecision(d, `${ap.invoiceId} after owner approval (${ap.id})`);
}
