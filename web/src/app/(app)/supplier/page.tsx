"use client";

// "Send a bill": the presenter plays the supplier (or the scammer) on a phone.
// It is a message thread to the business's accounts inbox. Sending a bill posts exactly what the
// old "invoice arrives" buttons posted; from there the agent finds it and works on it by itself,
// and its answer comes back into the thread.

import { CheckCheck, FileText, Paperclip, RotateCcw, SendHorizontal, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-sheet";
import { useData } from "@/components/data-provider";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";
import { DEMO_INVOICES, type DemoInvoice } from "@/lib/demo-invoices";
import { group, outcomeOf, type Outcome } from "@/lib/feed";
import { cn } from "@/lib/utils";

const REPLY: Record<Outcome, { text: string; tone: "ok" | "warn" | "bad" | "busy" }> = {
  working: { text: "Got it. Gcina is reading your bill now…", tone: "busy" },
  paid: { text: "Paid. Thank you! The payment is on the public ledger.", tone: "ok" },
  held: { text: "Received. This one needs the owner's OK before it is paid.", tone: "warn" },
  declined: { text: "The owner declined this payment.", tone: "bad" },
  refused: { text: "Not paid. This bill did not pass our checks.", tone: "bad" },
  stopped: { text: "Not paid. Our agent found something wrong inside this bill.", tone: "bad" },
  "ledger-refused": { text: "Not paid. An attempt to push this through was refused by the ledger itself.", tone: "bad" },
};

const subjectOf = (raw: string) => raw.match(/^Subject:\s*(.+)$/m)?.[1]?.trim() ?? raw.split("\n").find((l) => l.trim())?.trim() ?? "Bill";
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false });

export default function SupplierPage() {
  const d = useData();
  const [sending, setSending] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const { confirm, sheet } = useConfirm();

  const sent = useMemo(() => [...(d.invoices ?? [])].sort((a, b) => (a.receivedAt < b.receivedAt ? -1 : 1)), [d.invoices]);
  const outcomes = useMemo(() => new Map(group(d.audit ?? []).filter((g) => g.invoiceId).map((g) => [g.invoiceId!, outcomeOf(g)])), [d.audit]);
  const sentIds = new Set(sent.map((i) => i.id));
  const drafts = DEMO_INVOICES.filter((x) => !sentIds.has(x.id));

  const post = async (key: string, body: { id?: string; supplierName: string; rawText: string }) => {
    setSending(key);
    try {
      await api("POST", "/invoices", body);
      await d.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSending(null);
    }
  };
  const sendDraft = (x: DemoInvoice) => post(x.id, { id: x.id, supplierName: x.supplierName, rawText: x.rawText });
  const sendTyped = async () => {
    if (!name.trim() || !text.trim()) return;
    if (await post("typed", { supplierName: name.trim(), rawText: text.trim() })) setText("");
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col">
      <p className="mb-3 text-sm text-muted-foreground">
        You&apos;re the supplier now. Send a bill from this phone and watch the{" "}
        <Link href="/" className="font-medium text-primary underline underline-offset-4">Overview</Link> on the big screen: nobody presses anything there.
      </p>

      <section aria-label="Messages to MTA accounts" className="lift flex flex-col overflow-hidden rounded-[2rem] border bg-card">
        {/* thread header */}
        <header className="brand-field flex items-center gap-3 px-4 py-3 text-white">
          <span className="flex size-10 items-center justify-center rounded-full bg-white"><Logo className="size-7" /></span>
          <div className="min-w-0">
            <p className="truncate font-semibold">MTA Accounts</p>
            <p className="flex items-center gap-1.5 text-xs text-white/75">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-gold motion-safe:animate-pulse" /> Bills are read by Gcina, an AI clerk
            </p>
          </div>
        </header>

        {/* thread */}
        <ol className="flex min-h-48 flex-col gap-3 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:18px_18px] px-3 py-4" aria-live="polite">
          {sent.length === 0 && <li className="mx-auto rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">No bills sent yet. Pick one below.</li>}
          {sent.map((inv) => {
            const o = outcomes.get(inv.id) ?? "working";
            const r = REPLY[o];
            return (
              <li key={inv.id} className="flex flex-col gap-1.5">
                <div className="reveal ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground shadow-sm">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-white/80"><Paperclip className="size-3.5" aria-hidden="true" /> {inv.supplierName}</p>
                  <p className="mt-0.5 text-sm leading-snug font-medium break-words">{subjectOf(inv.rawText)}</p>
                  <p className="mt-1 flex items-center justify-end gap-1 text-[0.68rem] text-white/70">
                    {inv.id} · {timeOf(inv.receivedAt)} <CheckCheck className="size-3.5 text-gold" aria-label="delivered" />
                  </p>
                </div>
                <div
                  className={cn(
                    "reveal mr-auto max-w-[85%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm shadow-sm",
                    r.tone === "ok" && "border-ok/30 bg-ok-soft text-ok",
                    r.tone === "warn" && "border-warn/30 bg-warn-soft text-warn",
                    r.tone === "bad" && "border-danger/30 bg-danger-soft text-danger",
                    r.tone === "busy" && "bg-card text-muted-foreground",
                  )}
                >
                  <p className="text-xs font-semibold opacity-80">Gcina</p>
                  <p className="font-medium">
                    {r.text}
                    {r.tone === "busy" && <span aria-hidden="true" className="ml-1 inline-flex gap-0.5 align-middle">{[0, 1, 2].map((i) => <i key={i} className="size-1 rounded-full bg-current motion-safe:animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />)}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* drafts */}
        {drafts.length > 0 && (
          <div className="border-t bg-muted/50 px-3 py-3">
            <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Bills ready to send</p>
            <ul className="flex flex-col gap-2">
              {drafts.map((x) => {
                const risky = x.tone === "bad" || x.tone === "inject";
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      disabled={sending !== null}
                      onClick={() => sendDraft(x)}
                      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-card px-3 py-2 text-left transition hover:border-primary/40 hover:shadow-md focus-visible:outline-3 focus-visible:outline-ring disabled:opacity-60"
                    >
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", risky ? "bg-danger-soft text-danger" : "bg-accent text-primary")}>
                        {risky ? <ShieldAlert className="size-4" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{x.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">as {x.supplierName}</span>
                      </span>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <SendHorizontal className={cn("size-4", sending === x.id && "motion-safe:animate-pulse")} aria-hidden="true" />
                      </span>
                      <span className="sr-only">Send</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* composer */}
        <form
          className="flex flex-col gap-2 border-t bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendTyped();
          }}
        >
          <label className="sr-only" htmlFor="sup-name">Your business name</label>
          <input id="sup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your business name" maxLength={80} className="h-11 rounded-xl border bg-background px-3 text-sm" />
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="sup-text">Type or paste a bill</label>
            <textarea id="sup-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste your own bill…" rows={2} maxLength={6000} className="min-h-11 flex-1 resize-y rounded-2xl border bg-background px-3 py-2 text-sm" />
            <button type="submit" disabled={sending !== null || !name.trim() || !text.trim()} aria-label="Send this bill" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
              <SendHorizontal className="size-5" aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>

      {sent.length > 0 && (
        <button
          type="button"
          disabled={sending !== null}
          onClick={() =>
            confirm({
              title: "Start the demo again?",
              description: "Clears every bill, approval and payment record so you can run the demo from the top. Money already sent on the test ledger stays sent.",
              confirmLabel: "Start again",
              tone: "danger",
              onConfirm: async () => {
                await api("POST", "/admin/reset");
                await d.refresh();
                toast.success("Cleared. Ready for the first bill.");
              },
            })
          }
          className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 self-center rounded-full border bg-card px-5 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> Start the demo again
        </button>
      )}
      {sheet}
    </div>
  );
}
