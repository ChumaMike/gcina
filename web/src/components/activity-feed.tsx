"use client";

import { ArrowRight, CheckCircle2, CircleSlash, Copy, Hand, Loader2, ShieldX } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/money";
import type { AuditEvent, Invoice } from "@/lib/types";
import { amountOf, dataOf, group, isPayment, ledgerRefusal, outcomeOf, type Group } from "@/lib/feed";
import { cn } from "@/lib/utils";
import { ActorChip, ExplorerLink, clock, timeAgo } from "./bits";
import { TxQr } from "./ledger-proof";
import { ListenButton } from "./a11y/listen-button";
import { useT } from "./a11y/prefs";
import type { MsgKey } from "@/lib/i18n/messages";

const TITLE_KEY: Record<string, MsgKey> = {
  "ledger-refused": "feed.ledgerRefused",
  stopped: "feed.stopped",
  declined: "feed.declined",
  refused: "feed.refused",
  held: "feed.held",
  working: "feed.working",
};

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
              <p className="text-pretty [overflow-wrap:anywhere]">{e.message}</p>
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
  stopped: { box: "border-danger/40 bg-danger-soft", icon: ShieldX, ic: "text-danger", title: "Agent stopped it. Nothing signed" },
  declined: { box: "border-border bg-muted/50", icon: CircleSlash, ic: "text-muted-foreground", title: "You said no. Nothing paid" },
  refused: { box: "border-info/30 bg-info-soft", icon: Copy, ic: "text-info", title: "Refused by your rules" },
  held: { box: "border-warn/40 bg-warn-soft", icon: Hand, ic: "text-warn", title: "Held for you" },
  working: { box: "border-border bg-muted/40", icon: Loader2, ic: "text-muted-foreground animate-spin", title: "Working on it" },
} as const;

function InvoiceRow({ g, invoices, pending }: { g: Group; invoices: Invoice[] | null; pending: boolean }) {
  const t = useT();
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
            {t("feed.paid")}{who ? ` ${who}` : ""}
            {amount && <span className="tabular-nums"> {formatAmount(amount)}</span>}
            <span className="font-normal text-muted-foreground"> · {g.invoiceId}</span>
          </p>
          {time}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-7">
          {paidEv.txHash && <TxQr hash={paidEv.txHash} size={56} />}
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
      ? `The agent tried to pay on its own signature. The XRP Ledger needs two keys and said no (${refusal}). No money moved. It never entered the ledger, so there's no page to link: that's the point.`
      : outcome === "stopped"
        ? "The agent found something wrong in this invoice and refused to sign. Nothing was sent to the policy or the ledger."
        : outcome === "working"
        ? (reasoningOf(g) ?? g.events[0].message)
        : (policyWords ?? g.events[0].message);

  return (
    <li className="py-1.5">
      <div className={cn("flex flex-col gap-1 rounded-xl border p-3", tone.box)}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <tone.icon className={cn("size-5 shrink-0", tone.ic)} aria-hidden="true" />
          <p className="font-semibold">{outcome === "held" && pending ? t("feed.waiting") : TITLE_KEY[outcome] ? t(TITLE_KEY[outcome]) : tone.title}</p>
          <span className="text-sm text-muted-foreground">
            {g.invoiceId}
            {who ? ` · ${who}` : ""}
          </span>
          {time}
        </div>
        <p className="text-[0.95rem] text-pretty [overflow-wrap:anywhere]">{detail}</p>
        {outcome === "held" && refusal && (
          <p className="flex items-start gap-2 rounded-lg bg-danger-soft p-2 text-[0.95rem] font-medium text-danger">
            <ShieldX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Ledger refused: agent alone. It tried to pay on its own signature; the XRP Ledger needs two keys ({refusal}). No money moved. It never entered the ledger, so there&apos;s no page to link: that&apos;s the point.
            </span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4">
          {outcome === "held" && pending && (
            <Link href="/approvals" className="inline-flex min-h-11 items-center gap-1 font-medium text-warn underline-offset-4 hover:underline">
              Review it <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          {outcome === "stopped" && (
            <Link href="/invoices" className="inline-flex min-h-11 items-center gap-1 font-medium text-danger underline-offset-4 hover:underline">
              See what it found <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          <ListenButton text={detail} />
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
                {refused && <span className="font-mono text-danger">{refused} · no money moved · never entered the ledger, so no page: that&apos;s the point</span>}
              </div>
              {e.txHash && !refused && (
                <div className="flex items-center gap-3">
                  <TxQr hash={e.txHash} size={48} />
                  <ExplorerLink hash={e.txHash} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
