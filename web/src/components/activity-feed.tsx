"use client";

import { ArrowRight, CheckCircle2, CircleSlash, Copy, Hand, Loader2, ShieldX } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/money";
import type { Amount, AuditEvent, Invoice } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActorChip, ExplorerLink, clock, timeAgo } from "./bits";

const dataOf = (e: AuditEvent) => (e.data ?? {}) as Record<string, unknown>;

/** A ledger engine result that means "not applied" (tef/tem/tel), e.g. tefBAD_QUORUM. */
function ledgerRefusal(e: AuditEvent): string | null {
  const d = dataOf(e);
  const r = (d.engine_result ?? d.ledgerResult ?? d.result) as string | undefined;
  if (typeof r === "string" && /^te[fml]/.test(r)) return r;
  const m = e.message.match(/\bte[fml][A-Z_]+\b/);
  return m ? m[0] : null;
}

function invoiceIdOf(e: AuditEvent): string | null {
  const d = dataOf(e);
  if (typeof d.invoiceId === "string") return d.invoiceId;
  return e.message.match(/\binv-[\w-]+\b/)?.[0] ?? null;
}

function amountOf(e: AuditEvent): Amount | null {
  const d = dataOf(e);
  for (const v of [d.delivered, d.amount]) {
    if (v && typeof v === "object" && "currency" in v && "value" in v) return v as Amount;
  }
  return null;
}

const isPayment = (e: AuditEvent) => e.kind === "payment.validated" || (e.actor === "ledger" && !!e.txHash && !ledgerRefusal(e));

type Outcome = "paid" | "ledger-refused" | "declined" | "refused" | "held" | "working";
type Group = { key: string; invoiceId: string | null; events: AuditEvent[]; at: string };

function outcomeOf(g: Group): Outcome {
  const ev = g.events; // newest first
  if (ev.some(isPayment)) return "paid";
  if (ev.some((e) => ledgerRefusal(e))) return "ledger-refused";
  if (ev.some((e) => e.kind === "approval.rejected")) return "declined";
  if (ev[0]?.kind === "approval.approved") return "working";
  const last = ev.find((e) => /held|rejected|refused/.test(e.kind));
  if (last && /rejected|refused/.test(last.kind)) return "refused";
  if (last) return "held";
  return "working";
}

function group(events: AuditEvent[]): Group[] {
  const out: Group[] = [];
  const byInv = new Map<string, Group>();
  for (const e of events) {
    const inv = invoiceIdOf(e);
    if (!inv) {
      out.push({ key: e.id, invoiceId: null, events: [e], at: e.at });
      continue;
    }
    let g = byInv.get(inv);
    if (!g) {
      g = { key: `inv:${inv}`, invoiceId: inv, events: [], at: e.at };
      byInv.set(inv, g);
      out.push(g);
    }
    g.events.push(e);
  }
  return out;
}

/** The agent's own words for this invoice, if it gave any. */
function reasoningOf(g: Group): string | null {
  for (const e of g.events) {
    const r = dataOf(e).reasoning;
    if (typeof r === "string" && r.trim()) return r.trim();
  }
  return g.events.find((e) => e.actor === "agent")?.message ?? null;
}

function Steps({ events }: { events: AuditEvent[] }) {
  return (
    <details className="text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted-foreground hover:text-foreground">
        Every step ({events.length})
      </summary>
      <ol className="mt-1 mb-2 flex flex-col gap-2 border-l-2 border-border pl-3">
        {[...events].reverse().map((e) => {
          const why = dataOf(e).reasoning;
          return (
            <li key={e.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ActorChip actor={e.actor} />
                <time dateTime={e.at}>{clock(e.at)}</time>
              </div>
              <p className="text-pretty">{e.message}</p>
              {typeof why === "string" && why.trim() && <p className="text-pretty text-muted-foreground italic">“{why.trim()}”</p>}
            </li>
          );
        })}
      </ol>
    </details>
  );
}

const TONE = {
  "ledger-refused": { box: "border-danger/40 bg-danger-soft", icon: ShieldX, ic: "text-danger", title: "Ledger refused: agent alone" },
  declined: { box: "border-border bg-muted/50", icon: CircleSlash, ic: "text-muted-foreground", title: "You said no. Nothing paid" },
  refused: { box: "border-info/30 bg-info-soft", icon: Copy, ic: "text-info", title: "Refused by your rules" },
  held: { box: "border-warn/40 bg-warn-soft", icon: Hand, ic: "text-warn", title: "Held for you" },
  working: { box: "border-border bg-muted/40", icon: Loader2, ic: "text-muted-foreground animate-spin", title: "Working on it" },
} as const;

function InvoiceRow({ g, invoices, pending }: { g: Group; invoices: Invoice[] | null; pending: boolean }) {
  let outcome = outcomeOf(g);
  const who = invoices?.find((i) => i.id === g.invoiceId)?.supplierName;
  const time = (
    <time dateTime={g.at} title={clock(g.at)} className="text-xs text-muted-foreground">
      {timeAgo(g.at)}
    </time>
  );

  if (outcome === "paid") {
    const paidEv = g.events.find(isPayment)!;
    const amount = amountOf(paidEv);
    return (
      <li className="flex flex-col border-b border-border py-2 last:border-b-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CheckCircle2 className="size-5 shrink-0 text-ok" aria-hidden="true" />
          <p className="font-medium">
            Paid{who ? ` ${who}` : ""}
            {amount && <span className="tabular-nums"> {formatAmount(amount)}</span>}
            <span className="font-normal text-muted-foreground"> · {g.invoiceId}</span>
          </p>
          {time}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 pl-7">
          {paidEv.txHash && <ExplorerLink hash={paidEv.txHash} />}
          <Steps events={g.events} />
        </div>
      </li>
    );
  }

  // A held invoice the agent ALSO tried to push through alone (compromised mode): the owner
  // still has to decide, so it shows as held, with the ledger's refusal underneath.
  const refusal = g.events.map(ledgerRefusal).find(Boolean);
  if (outcome === "ledger-refused" && pending) outcome = "held";
  const tone = TONE[outcome];
  const policyWords = g.events.find((e) => e.actor === "policy" && /held|rejected|refused/.test(e.kind))?.message;
  const detail =
    outcome === "ledger-refused"
      ? `The agent tried to pay on its own signature. The XRP Ledger needs two keys and said no (${refusal}). No money moved.`
      : outcome === "working"
        ? (reasoningOf(g) ?? g.events[0].message)
        : (policyWords ?? g.events[0].message);

  return (
    <li className="py-1.5">
      <div className={cn("flex flex-col gap-1 rounded-xl border p-3", tone.box)}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <tone.icon className={cn("size-5 shrink-0", tone.ic)} aria-hidden="true" />
          <p className="font-semibold">{outcome === "held" && pending ? "Waiting for you" : tone.title}</p>
          <span className="text-sm text-muted-foreground">
            {g.invoiceId}
            {who ? ` · ${who}` : ""}
          </span>
          {time}
        </div>
        <p className="text-[0.95rem] text-pretty">{detail}</p>
        {outcome === "held" && refusal && (
          <p className="flex items-start gap-2 rounded-lg bg-danger-soft p-2 text-[0.95rem] font-medium text-danger">
            <ShieldX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Ledger refused: agent alone. It tried to pay on its own signature; the XRP Ledger needs two keys ({refusal}). No money moved.
            </span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4">
          {outcome === "held" && pending && (
            <Link href="/approvals" className="inline-flex min-h-11 items-center gap-1 font-medium text-warn underline-offset-4 hover:underline">
              Review it <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          <Steps events={g.events} />
        </div>
      </div>
    </li>
  );
}

/**
 * "Quiet when normal" (`quiet`): one row per invoice. Routine payments collapse to a ✓ line with
 * the explorer link; anything that needs attention (held, refused, the ledger said no) is
 * highlighted, and held items still waiting for the owner are pinned to the top.
 * Without `quiet` it is the raw event log.
 */
export function ActivityFeed({
  events,
  invoices = null,
  pendingInvoiceIds = [],
  quiet = false,
  limit = 30,
  className,
}: {
  events: AuditEvent[] | null;
  invoices?: Invoice[] | null;
  pendingInvoiceIds?: string[];
  quiet?: boolean;
  limit?: number;
  className?: string;
}) {
  if (!events) {
    return (
      <div className={cn("flex flex-col gap-3", className)} aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (events.length === 0) {
    return <p className="py-6 text-center text-muted-foreground">Nothing yet. When an invoice arrives you&apos;ll see every step here.</p>;
  }

  if (quiet) {
    const groups = group(events);
    const isPinned = (g: Group) => !!g.invoiceId && pendingInvoiceIds.includes(g.invoiceId);
    const ordered = [...groups.filter(isPinned), ...groups.filter((g) => !isPinned(g))];
    return (
      <ol className={cn("flex flex-col", className)} aria-live="polite" aria-relevant="additions">
        {ordered.slice(0, limit).map((g) =>
          g.invoiceId ? (
            <InvoiceRow key={g.key} g={g} invoices={invoices} pending={isPinned(g)} />
          ) : (
            <li key={g.key} className="flex flex-wrap items-baseline gap-x-2 border-b border-border py-2 text-sm text-muted-foreground last:border-b-0">
              <span className="text-pretty">{g.events[0].message}</span>
              <time dateTime={g.at} title={clock(g.at)} className="text-xs">
                {timeAgo(g.at)}
              </time>
            </li>
          ),
        )}
      </ol>
    );
  }

  return (
    <ol className={cn("flex flex-col", className)} aria-live="polite" aria-relevant="additions">
      {events.slice(0, limit).map((e) => {
        const refused = ledgerRefusal(e);
        return (
          <li
            key={e.id}
            className={cn(
              "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border py-3 last:border-b-0 animate-in fade-in-0 slide-in-from-top-1 duration-300",
              refused && "my-1 rounded-lg border-b-0 bg-danger-soft px-3",
            )}
          >
            <div className="pt-0.5">
              <ActorChip actor={e.actor} />
            </div>
            <div className="min-w-0">
              <p className="text-[0.95rem] leading-snug text-pretty">
                {refused && <ShieldX className="mr-1 inline size-4 -translate-y-px text-danger" aria-hidden="true" />}
                {refused && <strong>Ledger refused: agent alone. </strong>}
                {e.message}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                <time dateTime={e.at} title={clock(e.at)}>
                  {timeAgo(e.at)}
                </time>
                {refused && <span className="font-mono text-danger">{refused} · no money moved</span>}
              </div>
              {e.txHash && !refused && <ExplorerLink hash={e.txHash} className="-mb-2" />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
