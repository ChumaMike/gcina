"use client";

import Link from "next/link";
import { useState } from "react";
import { ActivityFeed } from "@/components/activity-feed";
import { OverviewHero } from "@/components/overview-hero";
import { AgentAtWork } from "@/components/agent-at-work";
import { ErrorNote, Money } from "@/components/bits";
import { LedgerProofCard } from "@/components/ledger-proof";
import { StoppedCard } from "@/components/stopped-card";
import { Button } from "@/components/ui/button";
import { useData } from "@/components/data-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { spentToday } from "@/lib/derive";
import { accountUrl, percent, toMinor } from "@/lib/money";
import type { AccountBalance, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const d = useData();
  const [showAll, setShowAll] = useState(false);
  const pending = d.approvals?.filter((a) => a.status === "pending") ?? [];
  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <OverviewHero />

      <AgentAtWork />

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
