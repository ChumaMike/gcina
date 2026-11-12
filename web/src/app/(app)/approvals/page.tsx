"use client";

import { AlertOctagon, Bot, Hand, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ApprovalChip, ErrorNote, Money, PageHeader, timeAgo } from "@/components/bits";
import { ListenButton } from "@/components/a11y/listen-button";
import { useT } from "@/components/a11y/prefs";
import { useConfirm } from "@/components/confirm-sheet";
import { useData } from "@/components/data-provider";
import { AnimatedList } from "@/components/ui/animated-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { registeredFor, supplierByAddress } from "@/lib/derive";
import { thoughtsFor } from "@/lib/feed";
import { formatAmount, formatZar, fromMinor, shortAddr, toMinor } from "@/lib/money";
import { friendlyReason } from "@/lib/reasons";
import type { Approval, Supplier } from "@/lib/types";
import { cn } from "@/lib/utils";

const PHOTO = { src: "/photos/owner-shop.jpg", alt: "A smiling shop owner in a blue apron checks his phone at his food counter.", position: "40% 30%" };
const EMPTY_PHOTO = { src: "/photos/owner-counter.jpg", alt: "A shop owner leans on her counter, relaxed, with her phone beside her.", position: "50% 35%" };

/** A hold the policy raised because it looks like fraud (new banking details, a repeat), not just "ask me". */
const FRAUDY = /registered address|changed-banking|banking details|repeat/i;

export default function ApprovalsPage() {
  const { approvals, suppliers, invoices, audit, errors, refresh } = useData();
  const { confirm, sheet } = useConfirm();
  const t = useT();

  const pending = approvals?.filter((a) => a.status === "pending") ?? [];
  const decided = approvals?.filter((a) => a.status !== "pending") ?? [];
  const waitingTotal = fromMinor("RLUSD", pending.filter((a) => a.amount.currency === "RLUSD").reduce((n, a) => n + toMinor(a.amount), 0n));

  const who = (a: Approval) => {
    const sup = supplierByAddress(suppliers, a.destination);
    const inv = invoices?.find((i) => i.id === a.invoiceId);
    // Going to an address that isn't an approved supplier's: find whose it claims to be.
    const registered = sup?.status === "approved" ? undefined : registeredFor(suppliers, inv?.supplierName, a.reasons, a.destination);
    return { sup, registered, name: sup?.status === "approved" ? sup.name : inv?.supplierName ?? registered?.name ?? sup?.name ?? "Unknown payee" };
  };
  const isFraud = (a: Approval) => !!who(a).registered || a.reasons.some((r) => friendlyReason(r).fraud || FRAUDY.test(r));

  const decide = async (a: Approval, verb: "approve" | "reject") => {
    await api("POST", `/approvals/${encodeURIComponent(a.id)}/${verb}`, {});
    await refresh();
    toast.success(verb === "approve" ? "Approved. The agent will pay it now." : "Rejected. Nothing was paid.");
  };

  /** Approve through the sheet: the tap-instead-of-hold route, and the only route for a fraud-flagged hold. */
  const askApprove = (a: Approval) => {
    const { name, registered } = who(a);
    const fraud = isFraud(a);
    confirm({
      title: `Pay ${name} ${formatZar(a.amount)}?`,
      description: fraud
        ? "Careful: Gcina thinks this could be fraud. Only approve if you phoned the supplier on a number you already had and they confirmed it."
        : `That's ${formatAmount(a.amount)}. The agent will send it straight away.`,
      body: registered ? (
        <AddressPair registered={registered} destination={a.destination} compact />
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Invoice</dt>
          <dd className="font-medium">{a.invoiceId}</dd>
          <dt className="text-muted-foreground">To</dt>
          <dd className="font-mono break-all">{a.destination}</dd>
        </dl>
      ),
      requireCheck: fraud ? `I phoned ${registered?.name ?? name} on a number I already had, and they confirmed this payment.` : undefined,
      requireType: fraud ? { label: `Type the supplier's name to approve: ${name}`, value: name } : undefined,
      confirmLabel: fraud ? "Approve anyway" : "Approve and pay",
      tone: fraud ? "danger" : "default",
      onConfirm: () => decide(a, "approve"),
    });
  };

  const askReject = (a: Approval) =>
    confirm({
      title: `Reject ${a.invoiceId}?`,
      description: "Nothing will be paid. You can ask the supplier to send it again.",
      confirmLabel: "Reject payment",
      tone: "danger",
      onConfirm: () => decide(a, "reject"),
    });

  return (
    <>
      <PageHeader
        title="Approvals"
        lead="Only you can say yes to these. The agent can't approve its own payments."
        photo={PHOTO}
        stat={
          approvals && pending.length > 0 ? (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-semibold tabular-nums">{pending.length}</span>
              <span className="text-muted-foreground">
                {pending.length === 1 ? "payment" : "payments"} waiting · {formatZar(waitingTotal)}
              </span>
            </p>
          ) : undefined
        }
      />
      <ErrorNote message={errors.approvals} className="mb-4" />
      {!approvals && !errors.approvals && <Skeleton className="h-72 w-full rounded-3xl" />}

      {approvals && pending.length === 0 && (
        <EmptyState
          photo={EMPTY_PHOTO}
          title="Nothing is waiting for you"
          className="mb-10"
          action={
            <Button asChild size="lg" variant="outline">
              <Link href="/">See what the agent did</Link>
            </Button>
          }
        >
          When a payment needs your yes, it shows up here. The agent handles the rest within your limits.
        </EmptyState>
      )}

      <AnimatedList className="mb-10 gap-5" aria-label="Waiting for you">
        {pending.map((a) => {
          const { name, registered } = who(a);
          const fraud = isFraud(a);
          const reasons = a.reasons.map(friendlyReason);
          const note = thoughtsFor(audit, a.invoiceId).at(-1);
          return (
            <article
              key={a.id}
              aria-labelledby={`ap-${a.id}`}
              className={cn("lift overflow-hidden rounded-3xl bg-card ring-1", fraud ? "ring-danger/40" : "ring-gold/60")}
            >
              {fraud ? (
                <div className="flex items-start gap-3 bg-danger px-5 py-4 text-white">
                  <ShieldAlert className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-lg font-semibold">Gcina thinks this could be fraud</p>
                    <p className="text-sm text-white/90">Rejecting is the safe choice. Nothing has been paid.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gold/30 px-5 py-2.5 text-sm font-semibold text-gold-ink">
                  <Hand className="size-4" aria-hidden="true" /> Needs your yes
                </div>
              )}

              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h2 id={`ap-${a.id}`} className="text-2xl font-semibold tracking-tight">
                      {name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {a.invoiceId} · to <span className="font-mono">{shortAddr(a.destination)}</span>
                    </p>
                  </div>
                  <Money amount={a.amount} size="xl" className="sm:items-end sm:text-right" />
                </div>

                {registered && <AddressPair registered={registered} destination={a.destination} />}

                <section aria-label="Why it's waiting">
                  <ul className="flex flex-col gap-2">
                    {reasons.map((r, i) => {
                      const bad = r.fraud || FRAUDY.test(a.reasons[i]);
                      return (
                        <li
                          key={i}
                          className={cn("flex items-start gap-2.5 rounded-xl p-3 text-[0.95rem] font-medium", bad ? "bg-danger-soft text-danger" : "bg-gold/20 text-gold-ink")}
                        >
                          {bad ? <AlertOctagon className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : <Hand className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
                          <span>{r.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {note && (
                  <figure className="flex gap-3 rounded-xl bg-agent-soft p-3 text-agent">
                    <Bot className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <figcaption className="text-xs font-semibold tracking-wide uppercase">The agent&apos;s note</figcaption>
                      <blockquote className="text-[0.95rem] [overflow-wrap:anywhere]">&ldquo;{note.text}&rdquo;</blockquote>
                    </div>
                  </figure>
                )}

                <ListenButton text={`${name}, ${formatZar(a.amount)}. ${reasons.map((r) => r.text).join(" ")}`} className="self-start" />

                {fraud ? (
                  <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
                    <Button size="lg" className="min-h-14 flex-1 bg-danger text-base text-white hover:bg-danger/90" onClick={() => decide(a, "reject")}>
                      <X aria-hidden="true" /> {t("reject")}: don&apos;t pay
                    </Button>
                    <Button size="lg" variant="ghost" className="text-muted-foreground" onClick={() => askApprove(a)}>
                      {t("approve")} anyway…
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <HoldToConfirm className="sm:flex-1" label={`Hold to ${t("approve").toLowerCase()} and pay`} doneLabel="Approved" onConfirm={() => decide(a, "approve")} />
                      <Button size="lg" variant="outline" className="min-h-14 sm:w-48" onClick={() => askReject(a)}>
                        <X aria-hidden="true" /> {t("reject")}
                      </Button>
                    </div>
                    <button type="button" onClick={() => askApprove(a)} className="min-h-11 self-start text-sm text-muted-foreground underline underline-offset-4">
                      Can&apos;t hold? Tap here to approve instead
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </AnimatedList>

      {decided.length > 0 && (
        <section aria-labelledby="decided-h">
          <h2 id="decided-h" className="mb-3 text-lg font-semibold">
            Already decided
          </h2>
          <AnimatedList className="lift overflow-hidden rounded-3xl bg-card px-5 [&>li:last-child>div]:border-b-0" stagger={40}>
            {decided.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4">
                <div className="min-w-0">
                  <p className="font-semibold">{who(a).name}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.invoiceId}
                    {a.decidedBy ? ` · ${/^(operator|owner)$/i.test(a.decidedBy) ? "You" : a.decidedBy}` : ""}
                    {a.decidedAt ? ` · ${timeAgo(a.decidedAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Money amount={a.amount} size="sm" onLedger={false} className="items-end text-right" />
                  <ApprovalChip status={a.status} />
                </div>
              </div>
            ))}
          </AnimatedList>
        </section>
      )}
      {sheet}
    </>
  );
}

/** Old (registered) vs new address, side by side: the "changed banking details" moment. */
function AddressPair({ registered, destination, compact = false }: { registered: Supplier; destination: string; compact?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl bg-ok-soft p-3">
        <p className="mb-1 text-xs font-semibold tracking-wide text-ok uppercase">{registered.name}&apos;s registered address</p>
        <p className={cn("font-mono break-all", compact ? "text-xs" : "text-sm")}>{registered.xrplAddress}</p>
      </div>
      <div className="rounded-xl border-2 border-danger bg-danger-soft p-3">
        <p className="mb-1 text-xs font-semibold tracking-wide text-danger uppercase">New address on this invoice (not approved)</p>
        <p className={cn("font-mono break-all text-danger", compact ? "text-xs" : "text-sm")}>{destination}</p>
      </div>
    </div>
  );
}
