"use client";

import { AlertOctagon, Check, CheckCircle2, Hand, X } from "lucide-react";
import { toast } from "sonner";
import { ApprovalChip, ErrorNote, Money, PageHeader, timeAgo } from "@/components/bits";
import { ListenButton } from "@/components/a11y/listen-button";
import { useT } from "@/components/a11y/prefs";
import { useConfirm } from "@/components/confirm-sheet";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { registeredFor, supplierByAddress } from "@/lib/derive";
import { formatAmount, formatZar, shortAddr } from "@/lib/money";
import { friendlyReason } from "@/lib/reasons";
import type { Approval, Supplier } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ApprovalsPage() {
  const { approvals, suppliers, invoices, errors, refresh } = useData();
  const { confirm, sheet } = useConfirm();
  const t = useT();

  const pending = approvals?.filter((a) => a.status === "pending") ?? [];
  const decided = approvals?.filter((a) => a.status !== "pending") ?? [];

  const who = (a: Approval) => {
    const sup = supplierByAddress(suppliers, a.destination);
    const inv = invoices?.find((i) => i.id === a.invoiceId);
    // Going to an address that isn't an approved supplier's: find whose it claims to be.
    const registered = sup?.status === "approved" ? undefined : registeredFor(suppliers, inv?.supplierName, a.reasons, a.destination);
    return { sup, registered, name: sup?.status === "approved" ? sup.name : inv?.supplierName ?? registered?.name ?? sup?.name ?? "Unknown payee" };
  };

  const decide = async (a: Approval, verb: "approve" | "reject") => {
    await api("POST", `/approvals/${encodeURIComponent(a.id)}/${verb}`, {});
    await refresh();
    toast.success(verb === "approve" ? "Approved. The agent will pay it now." : "Rejected. Nothing was paid.");
  };

  const ask = (a: Approval, verb: "approve" | "reject") => {
    const { name, registered } = who(a);
    const fraud = !!registered || a.reasons.some((r) => friendlyReason(r).fraud);
    confirm(
      verb === "approve"
        ? {
            title: `Pay ${name} ${formatAmount(a.amount)}?`,
            description: fraud
              ? "Careful: this goes to an address that isn't the supplier's registered one. Only approve if you've phoned them to check."
              : `About ${formatZar(a.amount)}. The agent will send it straight away.`,
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
            requireCheck: fraud ? `I confirmed this new address with ${registered?.name ?? name} on a number I already had.` : undefined,
            confirmLabel: fraud ? "Pay the new address" : "Approve and pay",
            tone: fraud ? "danger" : "default",
            onConfirm: () => decide(a, "approve"),
          }
        : {
            title: `Reject ${a.invoiceId}?`,
            description: fraud ? "Good call. Nothing will be paid, and it stays in your activity log as evidence." : "Nothing will be paid. You can ask the supplier to resend it.",
            confirmLabel: "Reject payment",
            tone: "danger",
            onConfirm: () => decide(a, "reject"),
          },
    );
  };

  return (
    <>
      <PageHeader title="Approvals" lead="Payments the policy held back for you. Your agent can't approve these itself." />
      <ErrorNote message={errors.approvals} className="mb-4" />
      {!approvals && !errors.approvals && <Skeleton className="h-56 w-full" />}

      {approvals && pending.length === 0 && (
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="size-10 text-ok" aria-hidden="true" />
            <p className="text-lg font-semibold">Nothing waiting for you</p>
            <p className="text-muted-foreground">When a payment needs your OK, it&apos;ll show up here.</p>
          </CardContent>
        </Card>
      )}

      <ul className="mb-10 flex flex-col gap-4">
        {pending.map((a) => {
          const { name, registered } = who(a);
          const reasons = a.reasons.map(friendlyReason);
          const fraud = !!registered || reasons.some((r) => r.fraud);
          return (
            <li key={a.id}>
              <Card className={cn("border-2", fraud ? "border-danger/50" : "border-warn/40")}>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {a.invoiceId} · to <span className="font-mono">{shortAddr(a.destination)}</span>
                      </p>
                      <h2 className="text-xl font-semibold">{name}</h2>
                    </div>
                    <Money amount={a.amount} size="lg" className="sm:items-end sm:text-right" />
                  </div>
                  {registered && <AddressPair registered={registered} destination={a.destination} />}
                  <ul className="flex flex-col gap-2">
                    {reasons.map((r, i) => (
                      <li
                        key={i}
                        className={cn("flex items-start gap-2 rounded-lg p-3 text-[0.95rem] font-medium", r.fraud ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn")}
                      >
                        {r.fraud ? <AlertOctagon className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : <Hand className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
                        <span>
                          <span className="font-semibold">Held: </span>
                          {r.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <ListenButton text={`${name}, ${formatAmount(a.amount)}. ${a.reasons.join(" ")}`} className="self-start" />
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                    <Button size="lg" variant={fraud ? "default" : "outline"} className={cn(fraud && "bg-danger text-white hover:bg-danger/90")} onClick={() => ask(a, "reject")}>
                      <X aria-hidden="true" /> {t("reject")}
                    </Button>
                    <Button size="lg" variant={fraud ? "outline" : "default"} onClick={() => ask(a, "approve")}>
                      <Check aria-hidden="true" /> {t("approve")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {decided.length > 0 && (
        <section aria-labelledby="decided-h">
          <h2 id="decided-h" className="mb-3 text-lg font-semibold">
            Already decided
          </h2>
          <Card>
            <CardContent>
              <ul>
                {decided.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
                    <div>
                      <p className="font-medium">
                        {who(a).name} · {formatAmount(a.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {a.invoiceId}
                        {a.decidedAt ? ` · ${timeAgo(a.decidedAt)}` : ""}
                      </p>
                    </div>
                    <ApprovalChip status={a.status} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
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
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{registered.name}&apos;s registered address</p>
        <p className={cn("font-mono break-all", compact ? "text-xs" : "text-sm")}>{registered.xrplAddress}</p>
      </div>
      <div className="rounded-lg border-2 border-danger bg-card p-3">
        <p className="mb-1 text-xs font-semibold tracking-wide text-danger uppercase">New address on this invoice (not approved)</p>
        <p className={cn("font-mono break-all text-danger", compact ? "text-xs" : "text-sm")}>{destination}</p>
      </div>
    </div>
  );
}
