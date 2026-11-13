"use client";

import { AlertTriangle, ExternalLink, Loader2, Receipt } from "lucide-react";
import Image from "next/image";
import { formatAmount, formatZar, txUrl } from "@/lib/money";
import type { Actor, Amount, ApprovalStatus, InvoiceStatus, SupplierStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Rands first: "R 360.00" big, "$ 20.00 RLUSD on the XRP Ledger" small underneath.
 * The rand is an indicative conversion (CONTRACTS §2); what actually moves is the RLUSD line.
 */
export function Money({
  amount,
  size = "md",
  className,
  onLedger = true,
}: {
  amount: Amount;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** false drops "on the XRP Ledger" where the context already says it (tight rows). */
  onLedger?: boolean;
}) {
  const big = size === "xl" || size === "lg";
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span
        className={cn(
          "font-semibold tabular-nums tracking-tight",
          size === "sm" && "text-sm",
          size === "md" && "text-lg",
          size === "lg" && "text-3xl",
          size === "xl" && "text-4xl sm:text-5xl",
        )}
      >
        {formatZar(amount)}
        <span className="sr-only"> (indicative rand value)</span>
      </span>
      <span className={cn("text-muted-foreground tabular-nums", big ? "text-sm" : "text-xs")}>
        {formatAmount(amount)}
        {onLedger && " on the XRP Ledger"}
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

/**
 * One colour code everywhere: green = paid, gold = needs you, red = stopped, slate = working.
 * The older tone names stay as aliases so nothing else breaks.
 */
type Tone = "paid" | "needs" | "stopped" | "working" | "ok" | "warn" | "danger" | "info" | "muted";
const TONE: Record<Tone, string> = {
  paid: "bg-ok-soft text-ok ring-ok/25",
  needs: "bg-gold/25 text-gold-ink ring-gold/60",
  stopped: "bg-danger-soft text-danger ring-danger/30",
  working: "bg-agent-soft text-agent ring-agent/20",
  ok: "bg-ok-soft text-ok ring-ok/25",
  warn: "bg-gold/25 text-gold-ink ring-gold/60",
  danger: "bg-danger-soft text-danger ring-danger/30",
  info: "bg-info-soft text-info ring-info/20",
  muted: "bg-muted text-muted-foreground ring-border",
};
const DOT: Partial<Record<Tone, string>> = {
  paid: "bg-ok",
  ok: "bg-ok",
  needs: "bg-gold",
  warn: "bg-gold",
  stopped: "bg-danger",
  danger: "bg-danger",
};

export function Chip({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap ring-1 ring-inset",
        TONE[tone],
        className,
      )}
    >
      {DOT[tone] && <span className={cn("size-1.5 rounded-full", DOT[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function SupplierChip({ status }: { status: SupplierStatus }) {
  if (status === "approved") return <Chip tone="paid">Approved</Chip>;
  if (status === "blocked") return <Chip tone="stopped">Blocked</Chip>;
  return <Chip tone="needs">Needs your check</Chip>;
}

export function InvoiceChip({ status }: { status: InvoiceStatus | undefined }) {
  switch (status) {
    case "new":
      return <Chip tone="working">Just arrived</Chip>;
    case "processing":
      return (
        <Chip tone="working">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Agent is checking
        </Chip>
      );
    case "paid":
      return <Chip tone="paid">Paid</Chip>;
    case "held":
      return <Chip tone="needs">Waiting for you</Chip>;
    case "rejected":
      return <Chip tone="stopped">Refused</Chip>;
    default:
      return <Chip tone="muted">Not sent yet</Chip>;
  }
}

export function ApprovalChip({ status }: { status: ApprovalStatus }) {
  if (status === "approved") return <Chip tone="paid">You approved</Chip>;
  if (status === "rejected") return <Chip tone="stopped">You rejected</Chip>;
  return <Chip tone="needs">Waiting for you</Chip>;
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

/** Link to the public receipt page, which a supplier can open without signing in. */
export function ReceiptLink({ hash, className }: { hash: string; className?: string }) {
  return (
    <a
      href={`/r/${hash}`}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      Receipt for the supplier <Receipt className="size-3.5" aria-hidden="true" />
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

/**
 * Hero band at the top of every page: title, one line on what the page is for, an optional photo,
 * an optional key number (`stat`) and optional actions (`children`).
 * Phone: photo is a short banner above the text. Desktop: photo fills the right of the band, faded into it.
 */
export function PageHeader({
  title,
  lead,
  photo,
  stat,
  children,
}: {
  title: string;
  lead?: React.ReactNode;
  photo?: { src: string; alt: string; position?: string };
  stat?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="reveal lift relative mb-5 overflow-hidden rounded-3xl bg-card sm:mb-7">
      {photo && (
        <div className="relative h-32 sm:absolute sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[46%]">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            priority
            sizes="(min-width: 640px) 46vw, 100vw"
            className="object-cover"
            style={{ objectPosition: photo.position ?? "center" }}
          />
          {/* fade the photo into the band: down on phone, left on desktop */}
          <div className="absolute inset-0 bg-linear-to-t from-card via-card/10 to-transparent sm:bg-linear-to-r sm:from-card sm:via-card/40" aria-hidden="true" />
        </div>
      )}
      <div className={cn("relative flex flex-col gap-3 p-5 sm:p-7", photo && "-mt-6 sm:mt-0 sm:max-w-[60%]")}>
        <span className="h-1 w-10 rounded-full bg-gold" aria-hidden="true" />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {lead && <p className="max-w-xl text-base text-muted-foreground sm:text-lg">{lead}</p>}
        {stat && <div className="mt-1">{stat}</div>}
        {children && <div className="mt-1 flex flex-wrap items-center gap-2">{children}</div>}
      </div>
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
