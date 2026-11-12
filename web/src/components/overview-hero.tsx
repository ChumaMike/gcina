"use client";

// The top of the Overview: who Gcina works for, whether it's on, and three numbers that matter.

import { BellRing, HandCoins, Pause, Play, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-sheet";
import { useData } from "@/components/data-provider";
import { useRole } from "@/components/role";
import { NumberTicker, randFromCents } from "@/components/ui/number-ticker";
import { savePolicy, spentToday } from "@/lib/derive";
import { stoppedPayments } from "@/lib/feed";
import { zarCents } from "@/lib/money";
import { cn } from "@/lib/utils";

function greeting(ms: number | null) {
  if (!ms) return "Welcome back";
  const h = Number(new Date(ms).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", hour: "numeric", hour12: false }));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function OverviewHero() {
  const d = useData();
  const judge = useRole() === "judge";
  const { confirm, sheet } = useConfirm();
  const [busy, setBusy] = useState(false);
  const paused = d.policy?.paused ?? false;

  const setPaused = async (next: boolean) => {
    setBusy(true);
    try {
      await savePolicy({ paused: next }, d.legacyDrops);
      await d.refresh();
      toast.success(next ? "Agent paused. Nothing will be paid until you resume." : "Agent resumed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const paidCents = d.policy ? Number(zarCents(spentToday(d.spentTodayRaw, d.audit, d.policy.dailyMax.currency))) : 0;
  const stopped = stoppedPayments(d.audit, d.invoices);
  const stoppedCents = stopped.reduce((n, s) => n + (s.amount ? Number(zarCents(s.amount)) : 0), 0);
  const waiting = d.approvals?.filter((a) => a.status === "pending").length ?? 0;

  return (
    <section className="brand-field reveal relative isolate overflow-hidden rounded-3xl text-white">
      <Image
        src="/photos/owner-shop.jpg"
        alt=""
        fill
        priority
        sizes="(min-width: 768px) 45vw, 100vw"
        className="-z-10 object-cover object-[70%_30%] opacity-35 md:left-auto md:w-[55%] md:opacity-90 md:[mask-image:linear-gradient(to_right,transparent,black_45%)]"
      />
      <div className="flex flex-col gap-6 p-5 sm:p-7 md:max-w-[62%] md:p-9">
        <div>
          <p className="text-sm font-medium text-white/75">{greeting(d.loadedAt)}</p>
          <h1 className="mt-1 text-3xl leading-tight font-bold sm:text-4xl">
            {paused ? "Your agent is paused." : "Gcina is watching your bills."}
          </h1>
          <p className="mt-2 max-w-md text-white/80">
            {paused
              ? "No payments will go out, even ones you've approved, until you resume."
              : "It reads each bill, checks it against your rules and pays the real ones. It can never pay alone."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={paused}
          aria-label="Pause agent"
          disabled={!d.policy || busy || judge}
          title={judge ? "Only the owner can pause the agent." : undefined}
          onClick={() =>
            paused
              ? setPaused(false)
              : confirm({
                  title: "Pause your agent?",
                  description: "It stops paying straight away. Bills still arrive and wait for you.",
                  confirmLabel: "Pause agent",
                  tone: "danger",
                  onConfirm: () => setPaused(true),
                })
          }
          className={cn(
            "inline-flex min-h-12 items-center gap-3 self-start rounded-full py-1.5 pr-5 pl-1.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60",
            paused ? "bg-gold text-gold-ink hover:brightness-105" : "bg-white/15 text-white backdrop-blur hover:bg-white/25",
          )}
        >
          <span className={cn("relative flex size-9 items-center justify-center rounded-full", paused ? "bg-gold-ink text-gold" : "bg-white text-primary")}>
            {!paused && d.policy && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-white/50 motion-safe:animate-ping" />}
            {paused ? <Play className="relative size-4" aria-hidden="true" /> : <Pause className="relative size-4" aria-hidden="true" />}
          </span>
          {paused ? "Paused · tap to resume" : "On · tap to pause"}
        </button>
      </div>

      <div className="grid gap-px bg-white/15 sm:grid-cols-3">
        <Stat icon={HandCoins} label="Paid today" value={<NumberTicker value={paidCents} format={randFromCents} />} hint="by your agent, inside your limits" />
        <Stat icon={ShieldCheck} label="Stopped for you" value={<NumberTicker value={stoppedCents} format={randFromCents} />} hint={`${stopped.length} ${stopped.length === 1 ? "payment" : "payments"} that never left`} gold />
        <Stat
          icon={BellRing}
          label="Waiting for you"
          value={<NumberTicker value={waiting} />}
          hint={waiting ? "Tap to decide" : "Nothing needs you right now"}
          href={waiting ? "/approvals" : undefined}
          alert={waiting > 0}
        />
      </div>
      {sheet}
    </section>
  );
}

function Stat({ icon: Icon, label, value, hint, gold, href, alert }: { icon: typeof HandCoins; label: string; value: React.ReactNode; hint: string; gold?: boolean; href?: string; alert?: boolean }) {
  const body = (
    <>
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-white/75 uppercase">
        <Icon className="size-4" aria-hidden="true" /> {label}
        {alert && <span aria-hidden="true" className="size-2 rounded-full bg-gold motion-safe:animate-pulse" />}
      </p>
      <p className={cn("mt-1 text-2xl font-bold tracking-tight sm:text-3xl", gold && "text-gold")}>{value}</p>
      <p className="text-xs text-white/70">{hint}</p>
    </>
  );
  const cls = "block bg-brand-deep/55 px-5 py-4 backdrop-blur-md sm:px-7";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-brand-deep/35")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
