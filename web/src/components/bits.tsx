"use client";

import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { formatAmount, formatZar, txUrl } from "@/lib/money";
import type { Actor, Amount, ApprovalStatus, InvoiceStatus, SupplierStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "$ 20.00 RLUSD" with "≈ R 360.00 indicative" underneath. */
export function Money({ amount, size = "md", className }: { amount: Amount; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span
        className={cn(
          "font-semibold tabular-nums tracking-tight",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-2xl",
          size === "xl" && "text-3xl sm:text-4xl",
        )}
      >
        {formatAmount(amount)}
      </span>
      <span className={cn("text-muted-foreground tabular-nums", size === "xl" || size === "lg" ? "text-sm" : "text-xs")}>
        ≈ {formatZar(amount)} <span className="sr-only">(indicative rand value)</span>
        <span aria-hidden="true"> indicative</span>
      </span>
    </span>
  );
}

const ACTOR: Record<Actor, { label: string; cls: string }> = {
  agent: { label: "Agent", cls: "bg-agent-soft text-agent" },
  policy: { label: "Policy", cls: "bg-info-soft text-info" },
  operator: { label: "You", cls: "bg-warn-soft text-warn" },
  ledger: { label: "Ledger", cls: "bg-ok-soft text-ok" },
};

export function ActorChip({ actor }: { actor: Actor }) {
  const a = ACTOR[actor] ?? { label: actor, cls: "bg-muted text-foreground" };
  return (
    <span className={cn("inline-flex h-6 min-w-14 items-center justify-center rounded-full px-2.5 text-xs font-semibold", a.cls)}>
      {a.label}
    </span>
  );
}

type Tone = "ok" | "warn" | "danger" | "info" | "muted";
const TONE: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok ring-ok/20",
  warn: "bg-warn-soft text-warn ring-warn/25",
  danger: "bg-danger-soft text-danger ring-danger/25",
  info: "bg-info-soft text-info ring-info/20",
  muted: "bg-muted text-muted-foreground ring-border",
};

export function Chip({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-sm font-medium ring-1 ring-inset", TONE[tone], className)}>
      {children}
    </span>
  );
}

export function SupplierChip({ status }: { status: SupplierStatus }) {
  if (status === "approved") return <Chip tone="ok">Approved</Chip>;
  if (status === "blocked") return <Chip tone="danger">Blocked</Chip>;
  return <Chip tone="warn">Needs your check</Chip>;
}

export function InvoiceChip({ status }: { status: InvoiceStatus | undefined }) {
  switch (status) {
    case "new":
      return <Chip tone="info">Just arrived</Chip>;
    case "processing":
      return (
        <Chip tone="info">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Agent is checking
        </Chip>
      );
    case "paid":
      return <Chip tone="ok">Paid</Chip>;
    case "held":
      return <Chip tone="warn">Waiting for you</Chip>;
    case "rejected":
      return <Chip tone="danger">Refused</Chip>;
    default:
      return <Chip tone="muted">Not sent yet</Chip>;
  }
}

export function ApprovalChip({ status }: { status: ApprovalStatus }) {
  if (status === "approved") return <Chip tone="ok">You approved</Chip>;
  if (status === "rejected") return <Chip tone="danger">You rejected</Chip>;
  return <Chip tone="warn">Waiting for you</Chip>;
}

export function ExplorerLink({ hash, className }: { hash: string; className?: string }) {
  return (
    <a
      href={txUrl(hash)}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      View on the XRP Ledger <ExternalLink className="size-3.5" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function RlusdBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-accent px-3 py-1 text-xs font-medium text-accent-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      Paid in RLUSD on the XRP Ledger
    </span>
  );
}

export function ErrorNote({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p role="status" className={cn("flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-sm text-danger", className)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export function PageHeader({ title, lead, children }: { title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {lead && <p className="mt-1 max-w-2xl text-muted-foreground">{lead}</p>}
      </div>
      {children}
    </header>
  );
}

const rtf = new Intl.RelativeTimeFormat("en-ZA", { numeric: "auto" });
export function timeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.round((t - now) / 1000);
  if (Math.abs(s) < 45) return "just now";
  const m = Math.round(s / 60);
  if (Math.abs(m) < 60) return rtf.format(m, "minute");
  const h = Math.round(m / 60);
  if (Math.abs(h) < 24) return rtf.format(h, "hour");
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });
}

export function clock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Africa/Johannesburg" });
}
