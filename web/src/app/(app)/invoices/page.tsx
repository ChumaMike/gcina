"use client";

import { Bot, ChevronRight, Copy, FlaskConical, Hand, RotateCcw, Send, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ActorChip, ErrorNote, ExplorerLink, InvoiceChip, Money, PageHeader, clock, timeAgo } from "@/components/bits";
import { useConfirm } from "@/components/confirm-sheet";
import { TxQr } from "@/components/ledger-proof";
import { InvoiceTwoViews } from "@/components/invoice-views";
import { useData } from "@/components/data-provider";
import { AnimatedList } from "@/components/ui/animated-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { DEMO_INVOICES, type DemoInvoice } from "@/lib/demo-invoices";
import { amountOf, isThought } from "@/lib/feed";
import { isHtmlInvoice } from "@/lib/hidden-text";
import type { AuditEvent, Invoice, InvoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const PHOTO = { src: "/photos/catering-trays.jpg", alt: "Two steel catering trays of fried plantain at a buffet.", position: "60% 50%" };
const EMPTY_PHOTO = { src: "/photos/paid-thumbs-up.jpg", alt: "A market trader with his phone gives a thumbs up.", position: "35% 30%" };

const TONE_ICON = {
  good: { icon: ShieldCheck, cls: "bg-ok-soft text-ok" },
  bad: { icon: ShieldAlert, cls: "bg-danger-soft text-danger" },
  human: { icon: Hand, cls: "bg-gold/25 text-gold-ink" },
  dup: { icon: Copy, cls: "bg-info-soft text-info" },
  inject: { icon: Bot, cls: "bg-danger-soft text-danger" },
} as const;

/** Avatar colour follows the one status colour code. */
const AVATAR: Partial<Record<InvoiceStatus, string>> = {
  paid: "bg-ok text-white",
  held: "bg-gold text-gold-ink",
  rejected: "bg-danger text-white",
};

function eventsFor(id: string, audit: AuditEvent[] | null) {
  return (audit ?? []).filter((e) => {
    const d = e.data as Record<string, unknown> | undefined;
    return d?.invoiceId === id || new RegExp(`\\b${id}\\b`).test(e.message);
  });
}

/** What a mail app would show as the subject: the Subject: line, else the first line of text. */
function subjectOf(raw: string): string {
  const m = raw.match(/^Subject:[ \t]*(.+)$/im);
  const line = m?.[1] ?? raw.replace(/<[^>]*>/g, " ").split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return line.length > 90 ? line.slice(0, 88) + "…" : line;
}

const initials = (name: string) =>
  name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default function InvoicesPage() {
  const { invoices, audit, errors, refresh } = useData();
  const [sending, setSending] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { confirm, sheet } = useConfirm();

  const inbox = [...(invoices ?? [])].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const selected = inbox.find((i) => i.id === open);

  const send = async (d: DemoInvoice) => {
    setSending(d.id);
    try {
      await api("POST", "/invoices", { id: d.id, supplierName: d.supplierName, rawText: d.rawText });
      await refresh();
      toast.success(`${d.id} has arrived. Watch the agent pick it up.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        lead="Every bill your suppliers send. Gcina reads each one, checks it against your rules and pays only the real ones."
        photo={PHOTO}
        stat={
          invoices && invoices.length > 0 ? (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-semibold tabular-nums">{invoices.length}</span>
              <span className="text-muted-foreground">
                {invoices.length === 1 ? "bill" : "bills"} · {invoices.filter((i) => i.status === "paid").length} paid
              </span>
            </p>
          ) : undefined
        }
      >
        <Button asChild size="lg">
          <Link href="/supplier">
            <Send aria-hidden="true" /> Send a bill
          </Link>
        </Button>
      </PageHeader>
      <ErrorNote message={errors.invoices} className="mb-4" />

      {!invoices && !errors.invoices && <Skeleton className="h-72 w-full rounded-3xl" />}

      {invoices && inbox.length === 0 && (
        <EmptyState
          photo={EMPTY_PHOTO}
          title="No bills yet"
          action={
            <Button asChild size="lg">
              <Link href="/supplier">
                <Send aria-hidden="true" /> Send a bill as a supplier
              </Link>
            </Button>
          }
        >
          When a supplier sends a bill, it lands here and the agent starts on it straight away.
        </EmptyState>
      )}

      {inbox.length > 0 && (
        <section aria-labelledby="inbox-h">
          <h2 id="inbox-h" className="sr-only">
            Inbox
          </h2>
          <AnimatedList className="lift overflow-hidden rounded-3xl bg-card [&>li:last-child>button]:border-b-0" stagger={50}>
            {inbox.map((inv) => (
              <InboxRow key={inv.id} inv={inv} audit={audit} onOpen={() => setOpen(inv.id)} />
            ))}
          </AnimatedList>
        </section>
      )}

      <details className="group mt-10 rounded-3xl border border-dashed border-border bg-card/60 open:bg-card">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 font-semibold [&::-webkit-details-marker]:hidden">
          <FlaskConical className="size-5 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1">Backup: send a test bill</span>
          <ChevronRight className="size-5 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
        </summary>
        <div className="flex flex-col gap-3 px-5 pb-5">
          <p className="text-sm text-muted-foreground">
            For the demo only, if the{" "}
            <Link href="/supplier" className="font-medium text-primary underline-offset-4 hover:underline">
              Send a bill
            </Link>{" "}
            phone isn&apos;t to hand. Each button drops one ready-made bill into the inbox.
          </p>
          <ol className="flex flex-col gap-2">
            {DEMO_INVOICES.map((d, idx) => {
              const inv = invoices?.find((i) => i.id === d.id);
              const T = TONE_ICON[d.tone];
              return (
                <li key={d.id} className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", T.cls)}>
                      <T.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {idx + 1}. {d.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {d.id} · {d.supplierName}. {d.expect}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    variant={inv ? "outline" : "secondary"}
                    className="shrink-0"
                    disabled={sending !== null || (inv !== undefined && inv.status !== "rejected" && d.tone !== "dup")}
                    onClick={() => send(d)}
                  >
                    <Send aria-hidden="true" />
                    {sending === d.id ? "Sending…" : inv ? `${d.id} has arrived` : `${d.id} arrives`}
                  </Button>
                </li>
              );
            })}
          </ol>
          <Button
            size="lg"
            variant="ghost"
            className="self-start text-muted-foreground"
            disabled={sending !== null}
            onClick={() =>
              confirm({
                title: "Start the demo again?",
                description: "Clears every demo invoice, approval and payment record on the policy service. Money already sent on the XRP Ledger stays sent.",
                confirmLabel: "Reset the demo",
                tone: "danger",
                onConfirm: async () => {
                  await api("POST", "/admin/reset");
                  await refresh();
                  toast.success("Demo reset. Ready for inv-001.");
                },
              })
            }
          >
            <RotateCcw aria-hidden="true" /> Reset demo
          </Button>
        </div>
      </details>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
          {selected && <InvoiceDetail inv={selected} audit={audit} />}
        </SheetContent>
      </Sheet>
      {sheet}
    </>
  );
}

function InboxRow({ inv, audit, onOpen }: { inv: Invoice; audit: AuditEvent[] | null; onOpen: () => void }) {
  const evs = eventsFor(inv.id, audit);
  const amount = evs.map(amountOf).find(Boolean) ?? null;
  const unread = inv.status === "new" || inv.status === "processing";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none sm:px-5"
    >
      <span
        className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold", AVATAR[inv.status] ?? "bg-agent-soft text-agent")}
        aria-hidden="true"
      >
        {initials(inv.supplierName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate", unread ? "font-bold" : "font-semibold")}>{inv.supplierName}</span>
        <span className="block truncate text-sm text-muted-foreground">{subjectOf(inv.rawText)}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <InvoiceChip status={inv.status} />
          {amount && <Money amount={amount} size="sm" onLedger={false} className="[&>span:last-child]:hidden" />}
          <span className="text-xs text-muted-foreground">
            {inv.id} · {timeAgo(inv.receivedAt)}
          </span>
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function InvoiceDetail({ inv, audit }: { inv: Invoice; audit: AuditEvent[] | null }) {
  const evs = eventsFor(inv.id, audit);
  const amount = evs.map(amountOf).find(Boolean) ?? null;
  const tx = evs.find((e) => e.txHash && e.actor === "ledger")?.txHash ?? evs.find((e) => e.txHash)?.txHash;
  const journey = [...evs].reverse();
  return (
    <>
      <SheetHeader className="pr-12">
        <p className="text-sm text-muted-foreground">
          {inv.id} · {timeAgo(inv.receivedAt)}
        </p>
        <SheetTitle className="text-2xl">{inv.supplierName}</SheetTitle>
        <SheetDescription className="text-base">{subjectOf(inv.rawText)}</SheetDescription>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          {amount ? <Money amount={amount} size="lg" /> : <span />}
          <InvoiceChip status={inv.status} />
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-6 px-4 pb-8">
        {tx && (
          <div className="flex items-center gap-3 rounded-2xl bg-ok-soft p-3">
            <TxQr hash={tx} size={72} />
            <div>
              <p className="font-semibold text-ok">Paid. Anyone can check it.</p>
              <ExplorerLink hash={tx} />
            </div>
          </div>
        )}

        <section aria-labelledby="inv-text-h">
          <h3 id="inv-text-h" className="mb-2 font-semibold">
            The bill
          </h3>
          {isHtmlInvoice(inv.rawText) ? (
            <InvoiceTwoViews id={inv.id} raw={inv.rawText} />
          ) : (
            <pre className="max-h-72 overflow-auto rounded-xl bg-muted/60 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{inv.rawText}</pre>
          )}
        </section>

        <section aria-labelledby="inv-journey-h">
          <h3 id="inv-journey-h" className="mb-3 font-semibold">
            Its journey
          </h3>
          {journey.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet. The agent picks new bills up within a few seconds.</p>
          ) : (
            <ol className="relative flex flex-col gap-4 border-l-2 border-border pl-5">
              {journey.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute top-1.5 -left-[1.6rem] size-3 rounded-full bg-card ring-2 ring-border" aria-hidden="true" />
                  <div className="flex flex-wrap items-center gap-2">
                    <ActorChip actor={e.actor} />
                    <span className="text-xs text-muted-foreground tabular-nums">{clock(e.at)}</span>
                  </div>
                  <p className={cn("mt-1 text-sm [overflow-wrap:anywhere]", isThought(e) && "text-muted-foreground italic")}>{e.message}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
