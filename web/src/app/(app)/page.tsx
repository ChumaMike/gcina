"use client";

import { ArrowRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ActivityFeed } from "@/components/activity-feed";
import { ErrorNote, Money, RlusdBadge } from "@/components/bits";
import { useConfirm } from "@/components/confirm-sheet";
import { LedgerProofCard } from "@/components/ledger-proof";
import { useRole } from "@/components/role";
import { StoppedCard } from "@/components/stopped-card";
import { Button } from "@/components/ui/button";
import { useData } from "@/components/data-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { savePolicy, spentToday } from "@/lib/derive";
import { accountUrl, percent, toMinor } from "@/lib/money";
import type { AccountBalance, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const d = useData();
  const [showAll, setShowAll] = useState(false);
  const pending = d.approvals?.filter((a) => a.status === "pending") ?? [];
  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Overview</h1>
        <RlusdBadge className="md:hidden" />
      </div>

      <AgentStatus />

      {pending.length > 0 && (
        <Link
          href="/approvals"
          className="flex min-h-14 items-center gap-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 font-medium text-warn transition-colors hover:bg-warn-soft/70"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-warn text-sm font-bold text-white">{pending.length}</span>
          <span className="flex-1">
            {pending.length === 1 ? "1 payment is" : `${pending.length} payments are`} waiting for you to approve
          </span>
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      )}

      <StoppedCard />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
        <SpendCard />
        <BalanceCard account={d.balances?.treasury} hint="Tops up the agent wallet" />
        <BalanceCard account={d.balances?.agent} hint="The agent can only pay from here, with the policy's co-signature" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">What your agent is doing</CardTitle>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-ok" aria-hidden="true" /> Live
          </span>
        </CardHeader>
        <CardContent>
          <ErrorNote message={d.errors.audit} className="mb-3" />
          <ActivityFeed
            events={d.audit}
            invoices={d.invoices}
            pendingInvoiceIds={pending.map((a) => a.invoiceId)}
            quiet={!showAll}
            limit={showAll ? 200 : 12}
          />
          {(d.audit?.length ?? 0) > 0 && (
            <Button variant="outline" className="mt-3 w-full" onClick={() => setShowAll((s) => !s)}>
              {showAll ? "Back to the summary" : `Show every event (${d.audit!.length})`}
            </Button>
          )}
        </CardContent>
      </Card>

      <LedgerProofCard />
    </div>
  );
}

function AgentStatus() {
  const { policy, legacyDrops, refresh, errors } = useData();
  const { confirm, sheet } = useConfirm();
  const [busy, setBusy] = useState(false);
  const paused = policy?.paused ?? false;
  const judge = useRole() === "judge";

  const setPaused = async (next: boolean) => {
    setBusy(true);
    try {
      await savePolicy({ paused: next }, legacyDrops);
      await refresh();
      toast.success(next ? "Agent paused. Nothing will be paid until you resume." : "Agent resumed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn("overflow-hidden border-2", paused ? "border-danger/40" : "border-primary/25")}>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-4">
          <span className={cn("relative flex size-14 shrink-0 items-center justify-center rounded-full", paused ? "bg-danger-soft" : "bg-ok-soft")}>
            {!paused && policy && <span className="absolute inset-0 animate-ping rounded-full bg-ok/20" aria-hidden="true" />}
            {paused ? <Pause className="size-7 text-danger" aria-hidden="true" /> : <Play className="size-7 text-ok" aria-hidden="true" />}
          </span>
          <div>
            {policy ? (
              <>
                <p className="text-xl font-semibold sm:text-2xl">{paused ? "Your agent is paused" : "Your agent is watching for invoices"}</p>
                <p className="text-muted-foreground">
                  {paused
                    ? "No payments will go out, even ones you've approved, until you resume."
                    : "It pays approved suppliers on its own, within your limits."}
                </p>
              </>
            ) : errors.policy ? (
              <ErrorNote message={errors.policy} />
            ) : (
              <Skeleton className="h-12 w-64" />
            )}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={paused}
          aria-label="Pause agent"
          disabled={!policy || busy || judge}
          title={judge ? "Only the owner can pause the agent." : undefined}
          onClick={() =>
            paused
              ? setPaused(false)
              : confirm({
                  title: "Pause your agent?",
                  description: "It stops paying straight away. Invoices still arrive and wait for you.",
                  confirmLabel: "Pause agent",
                  tone: "danger",
                  onConfirm: () => setPaused(true),
                })
          }
          className={cn(
            "group flex min-h-16 items-center gap-4 rounded-2xl border-2 px-4 py-2 text-left transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 sm:min-w-56",
            paused ? "border-danger bg-danger-soft" : "border-border bg-card hover:bg-muted",
          )}
        >
          <span
            className={cn(
              "relative inline-flex h-9 w-16 shrink-0 items-center rounded-full transition-colors",
              paused ? "bg-danger" : "bg-input",
            )}
            aria-hidden="true"
          >
            <span className={cn("absolute size-7 rounded-full bg-white shadow transition-transform", paused ? "translate-x-8" : "translate-x-1")} />
          </span>
          <span>
            <span className="block text-lg font-semibold">{paused ? "Paused" : "Pause agent"}</span>
            <span className="block text-sm text-muted-foreground">{paused ? "Tap to resume" : "Stops all payments"}</span>
          </span>
        </button>
      </CardContent>
      {sheet}
    </Card>
  );
}

function SpendCard() {
  const { policy, audit, spentTodayRaw } = useData();
  if (!policy) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }
  const currency: Currency = policy.dailyMax.currency;
  const spent = spentToday(spentTodayRaw, audit, currency);
  const pct = percent(spent, policy.dailyMax);
  const over = toMinor(spent) >= toMinor(policy.dailyMax);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">Paid today</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Money amount={spent} size="xl" />
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label="Share of today's limit used"
          className="h-3 w-full overflow-hidden rounded-full bg-muted"
        >
          <div className={cn("h-full rounded-full transition-all duration-700", over ? "bg-danger" : pct > 75 ? "bg-warn" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">
          {Math.round(pct)}% of your daily limit ·{" "}
          <Link href="/limits" className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline sm:min-h-0">
            change limits
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function BalanceCard({ account, hint }: { account?: AccountBalance; hint: string }) {
  const { balances, errors } = useData();
  if (!balances) {
    return (
      <Card>
        <CardContent>
          {errors.balances ? <ErrorNote message={errors.balances} /> : <Skeleton className="h-28 w-full" />}
        </CardContent>
      </Card>
    );
  }
  const name = account?.name ?? "Account";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">{name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {account?.rlusd !== undefined ? (
          <Money amount={{ currency: "RLUSD", value: account.rlusd }} size="xl" />
        ) : (
          <p className="text-muted-foreground">No RLUSD balance yet</p>
        )}
        <p className="text-sm text-muted-foreground">
          {account?.xrp !== undefined && <>Network fees: {Number(account.xrp).toLocaleString("en-ZA", { maximumFractionDigits: 2 })} XRP · </>}
          {hint}
        </p>
        {account?.address && (
          <a
            href={accountUrl(account.address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            See it on the XRP Ledger<span className="sr-only"> (opens in a new tab)</span> ↗
          </a>
        )}
      </CardContent>
    </Card>
  );
}
