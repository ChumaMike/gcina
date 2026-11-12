"use client";

// "Gcina at work": the newest invoice's journey, drawn live from the audit log.
// Read → Check → Two signatures → Ledger, with the real endings: paid, refused by the rules,
// waiting for you, stopped by the agent (hidden instruction), and refused BY THE LEDGER
// when a fooled agent tries to pay alone (1 of 2 signatures). Nothing here is simulated:
// every state comes from an event the policy service recorded.

import { Check, Clock, FileSearch, KeyRound, Landmark, Lock, ScanText, ShieldCheck, X } from "lucide-react";
import { useData } from "@/components/data-provider";
import { ExplorerLink } from "@/components/bits";
import { TxQr } from "@/components/ledger-proof";
import { agentStopped, amountOf, dataOf, group, isPayment, ledgerRefusal, type Group } from "@/lib/feed";
import { formatAmount, formatZar } from "@/lib/money";
import { friendlyReason } from "@/lib/reasons";
import type { Amount, AuditEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

type St = "todo" | "active" | "done" | "wait" | "stop";
type Ending = "working" | "paid" | "held" | "declined" | "refused" | "agent-stopped" | "ledger-refused";

type Journey = {
  invoiceId: string;
  ending: Ending;
  stages: [St, St, St, St];
  amount: Amount | null;
  reason: string | null;
  votes: 0 | 1 | 2;
  txHash: string | null;
  ledgerCode: string | null;
  at: string;
};

const find = (g: Group, k: string) => g.events.find((e) => e.kind === k);
const reasonsOf = (e: AuditEvent | undefined) => {
  const r = e ? dataOf(e).reasons : undefined;
  return Array.isArray(r) ? (r as string[]) : [];
};

export function journeyOf(g: Group): Journey {
  const proposal = find(g, "proposal.received");
  const cosigned = find(g, "proposal.cosigned");
  const held = find(g, "proposal.held");
  const rejected = find(g, "proposal.rejected");
  const approved = find(g, "approval.approved");
  const declined = find(g, "approval.rejected");
  const paid = g.events.find(isPayment);
  const refusedByLedger = g.events.find((e) => !!ledgerRefusal(e));
  const stoppedByAgent = g.events.find(agentStopped);
  const amount = (paid && amountOf(paid)) || (proposal && amountOf(proposal)) || null;
  const base = { invoiceId: g.invoiceId ?? "", amount, txHash: null, ledgerCode: null, at: g.at, reason: null, votes: 0 as const };

  if (paid) return { ...base, ending: "paid", stages: ["done", "done", "done", "done"], votes: 2, txHash: paid.txHash ?? null };
  if (refusedByLedger) {
    const why = reasonsOf(held ?? rejected)[0] ?? null;
    return { ...base, ending: "ledger-refused", stages: ["done", "stop", "stop", "stop"], votes: 1, reason: why, ledgerCode: ledgerRefusal(refusedByLedger) };
  }
  if (stoppedByAgent && !proposal) return { ...base, ending: "agent-stopped", stages: ["stop", "todo", "todo", "todo"], reason: "The agent found a hidden instruction aimed at it inside the invoice, so it signed nothing." };
  if (rejected) return { ...base, ending: "refused", stages: ["done", "stop", "todo", "todo"], reason: reasonsOf(rejected)[0] ?? null };
  if (held) {
    if (declined) return { ...base, ending: "declined", stages: ["done", "stop", "todo", "todo"], reason: "You said no. Nothing was signed." };
    if (approved && cosigned) return { ...base, ending: "working", stages: ["done", "done", "done", "active"], votes: 2 };
    if (approved) return { ...base, ending: "working", stages: ["done", "done", "active", "todo"], votes: 1 };
    return { ...base, ending: "held", stages: ["done", "wait", "todo", "todo"], reason: reasonsOf(held)[0] ?? null };
  }
  if (cosigned) return { ...base, ending: "working", stages: ["done", "done", "done", "active"], votes: 2 };
  if (proposal) return { ...base, ending: "working", stages: ["done", "active", "todo", "todo"], votes: 1 };
  return { ...base, ending: "working", stages: ["active", "todo", "todo", "todo"] };
}

const STAGES = [
  { icon: ScanText, title: "Reading", sub: "The agent reads the bill like a bookkeeper" },
  { icon: FileSearch, title: "Checking", sub: "Your rules, checked by a separate service" },
  { icon: KeyRound, title: "Two signatures", sub: "The ledger needs 2 of 2 votes" },
  { icon: Landmark, title: "On the ledger", sub: "Public, permanent, checkable" },
] as const;

const HEADLINE: Record<Ending, { text: string; tone: string }> = {
  working: { text: "Working on it…", tone: "text-agent" },
  paid: { text: "Paid. On its own, inside your rules.", tone: "text-ok" },
  held: { text: "Waiting for you. Nothing is paid until you decide.", tone: "text-warn" },
  declined: { text: "You said no. Nothing left your account.", tone: "text-muted-foreground" },
  refused: { text: "Stopped by your rules. Nothing was signed.", tone: "text-danger" },
  "agent-stopped": { text: "The agent caught a trick and stopped itself.", tone: "text-danger" },
  "ledger-refused": { text: "The agent tried to pay alone. The XRP Ledger refused it.", tone: "text-danger" },
};

const CHECKS = ["Approved supplier", "Matches an order", "Not a repeat", "Within your limits"];

export function AgentAtWork() {
  const d = useData();
  const latest = d.audit ? group(d.audit).find((g) => g.invoiceId) : undefined;

  if (!latest) {
    return (
      <section aria-label="Gcina at work" className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-amber-100/40 p-5 dark:to-amber-500/5">
        <div className="flex items-center gap-4">
          <span className="relative flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ScanText className="size-6" aria-hidden="true" />
            <span className="absolute inset-0 rounded-full ring-4 ring-primary/30 motion-safe:animate-ping" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold">Gcina is watching your inbox</p>
            <p className="text-sm text-muted-foreground">When a bill arrives you&apos;ll see every step here: read, checked, signed, paid.</p>
          </div>
        </div>
      </section>
    );
  }

  const j = journeyOf(latest);
  const supplier = d.invoices?.find((i) => i.id === j.invoiceId)?.supplierName;
  const head = HEADLINE[j.ending];
  const done = j.stages.filter((s) => s === "done").length;
  const reached = j.stages.findLastIndex((s) => s !== "todo");
  const bad = j.ending === "refused" || j.ending === "agent-stopped" || j.ending === "ledger-refused";
  const fresh = (d.loadedAt ?? 0) - Date.parse(j.at) < 15 * 60_000;

  return (
    <section
      key={j.invoiceId}
      aria-label={`Gcina at work on ${j.invoiceId}`}
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 bg-card p-4 shadow-sm sm:p-5",
        j.ending === "paid" && "border-ok/40",
        j.ending === "held" && "border-warn/50",
        bad && "border-danger/50",
        j.ending === "working" && "border-agent/40",
        j.ending === "declined" && "border-border",
      )}
    >
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Gcina at work · {fresh ? "now" : "last invoice"}
          </p>
          <p className="mt-1 truncate text-base font-semibold sm:text-lg">
            {supplier ?? "Invoice"} <span className="font-normal text-muted-foreground">· {j.invoiceId}</span>
          </p>
        </div>
        {j.amount && (
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{formatZar(j.amount)}</p>
            <p className="text-xs tabular-nums text-muted-foreground">{formatAmount(j.amount)} on the XRP Ledger</p>
          </div>
        )}
      </div>

      <p aria-live="polite" className={cn("mt-3 text-lg font-semibold motion-safe:animate-in motion-safe:fade-in", head.tone)}>
        {head.text}
      </p>

      {/* the track */}
      <ol className="relative mt-4 grid gap-3 sm:grid-cols-4 sm:gap-2">
        <span aria-hidden="true" className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-1 rounded-full bg-muted sm:block" />
        <span
          aria-hidden="true"
          className={cn("absolute top-6 left-[12.5%] hidden h-1 rounded-full transition-[width] duration-700 sm:block", bad ? "bg-danger" : j.ending === "held" ? "bg-warn" : "bg-ok")}
          style={{ width: `${(Math.max(0, reached) / 3) * 75}%` }}
        />
        {STAGES.map((s, i) => (
          <Station key={s.title} i={i} st={j.stages[i]} icon={s.icon} title={s.title} sub={s.sub}>
            {i === 0 && <ReadDetail j={j} />}
            {i === 1 && <CheckDetail j={j} />}
            {i === 2 && <SignDetail j={j} />}
            {i === 3 && <LedgerDetail j={j} />}
          </Station>
        ))}
      </ol>

      {j.ending === "ledger-refused" && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-danger px-4 py-3 text-white motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-500">
          <Lock className="size-7 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold sm:text-base">
            1 of 2 signatures, so the XRP Ledger said no ({j.ledgerCode ?? "tefBAD_QUORUM"}). The money never left. Not our server: the ledger itself.
          </p>
        </div>
      )}
      <span className="sr-only">{done} of 4 steps done.</span>
    </section>
  );
}

function Station({ i, st, icon: Icon, title, sub, children }: { i: number; st: St; icon: typeof ScanText; title: string; sub: string; children: React.ReactNode }) {
  const badge = st === "done" ? Check : st === "stop" ? X : st === "wait" ? Clock : Icon;
  const B = badge;
  return (
    <li
      className={cn("relative flex gap-3 rounded-xl p-2 sm:flex-col sm:items-center sm:text-center", st === "todo" && "opacity-45")}
      style={{ animationDelay: `${i * 90}ms` }}
    >
      <span
        className={cn(
          "relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border-4 border-card shadow-sm transition-colors duration-500",
          st === "done" && "bg-ok text-white",
          st === "active" && "bg-agent text-white",
          st === "wait" && "bg-warn text-white",
          st === "stop" && "bg-danger text-white motion-safe:animate-in motion-safe:zoom-in-50",
          st === "todo" && "bg-muted text-muted-foreground",
        )}
      >
        <B className="size-5" aria-hidden="true" />
        {(st === "active" || st === "wait") && <span aria-hidden="true" className={cn("absolute -inset-1 rounded-full ring-4 motion-safe:animate-ping", st === "wait" ? "ring-warn/40" : "ring-agent/40")} />}
      </span>
      <div className="min-w-0">
        <p className="font-semibold">
          {title}
          <span className="sr-only">: {st === "todo" ? "not reached" : st === "active" ? "in progress" : st === "wait" ? "waiting for you" : st}</span>
        </p>
        <p className="text-xs text-muted-foreground">{sub}</p>
        <div className="mt-1.5 text-sm">{children}</div>
      </div>
    </li>
  );
}

function ReadDetail({ j }: { j: Journey }) {
  if (j.ending === "agent-stopped") return <p className="font-medium text-danger">Hidden instruction found. Stopped.</p>;
  if (j.stages[0] === "active") return <p className="text-agent motion-safe:animate-pulse">Reading the invoice…</p>;
  return <p className="text-ok">Supplier, order and amount read</p>;
}

function CheckDetail({ j }: { j: Journey }) {
  const st = j.stages[1];
  if (st === "todo") return null;
  if (st === "active") return <p className="text-agent motion-safe:animate-pulse">Checking your rules…</p>;
  if (st === "stop" || st === "wait") {
    const text = j.reason ? friendlyReason(j.reason).text : st === "wait" ? "Needs your OK" : "Refused";
    return <p className={cn("font-medium", st === "stop" ? "text-danger" : "text-warn")}>{text}</p>;
  }
  return (
    <ul className="inline-flex flex-col items-start gap-0.5 text-left">
      {CHECKS.map((c, i) => (
        <li key={c} className="flex items-center gap-1.5 text-ok motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-1 motion-safe:fill-mode-both" style={{ animationDelay: `${150 + i * 180}ms` }}>
          <Check className="size-3.5" aria-hidden="true" /> {c}
        </li>
      ))}
    </ul>
  );
}

function SignDetail({ j }: { j: Journey }) {
  if (j.stages[2] === "todo") return null;
  const v = j.votes;
  const keys = [
    { label: "Agent", on: v >= 1 },
    { label: "Your rules", on: v >= 2 },
  ];
  return (
    <div className="inline-flex flex-col items-start gap-1.5 sm:items-center">
      <div className="flex gap-1.5">
        {keys.map((k, i) => (
          <span
            key={k.label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:fill-mode-both",
              k.on ? "bg-ok text-white" : "border border-dashed border-danger text-danger",
            )}
            style={{ animationDelay: `${200 + i * 350}ms` }}
          >
            <KeyRound className="size-3" aria-hidden="true" /> {k.label} {k.on ? "✓" : "✗"}
          </span>
        ))}
      </div>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={cn("h-full rounded-full transition-[width] duration-700", v >= 2 ? "bg-ok" : "bg-danger")} style={{ width: `${v * 50}%` }} />
      </div>
      <p className={cn("text-xs font-semibold", v >= 2 ? "text-ok" : "text-danger")}>{v} of 2 votes</p>
    </div>
  );
}

function LedgerDetail({ j }: { j: Journey }) {
  const st = j.stages[3];
  if (st === "todo") return null;
  if (st === "active") return <p className="text-agent motion-safe:animate-pulse">Sending to the XRP Ledger…</p>;
  if (st === "stop") return <p className="font-medium text-danger">Never entered the ledger: no page to link. That&apos;s the point.</p>;
  if (!j.txHash) return <p className="text-ok">Settled</p>;
  return (
    <div className="inline-flex items-center gap-2 text-left">
      <TxQr hash={j.txHash} size={56} />
      <div>
        <p className="font-medium text-ok">Settled in seconds</p>
        <ExplorerLink hash={j.txHash} className="text-xs" />
      </div>
    </div>
  );
}
