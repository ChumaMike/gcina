"use client";

import { Copy, Hand, Send, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorNote, ExplorerLink, InvoiceChip, PageHeader, timeAgo } from "@/components/bits";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { DEMO_INVOICES, type DemoInvoice } from "@/lib/demo-invoices";
import type { AuditEvent, Invoice } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE_ICON = {
  good: { icon: ShieldCheck, cls: "bg-ok-soft text-ok" },
  bad: { icon: ShieldAlert, cls: "bg-danger-soft text-danger" },
  human: { icon: Hand, cls: "bg-warn-soft text-warn" },
  dup: { icon: Copy, cls: "bg-info-soft text-info" },
} as const;

function eventsFor(id: string, audit: AuditEvent[] | null) {
  return (audit ?? []).filter((e) => {
    const d = e.data as Record<string, unknown> | undefined;
    return d?.invoiceId === id || new RegExp(`\\b${id}\\b`).test(e.message);
  });
}

export default function InvoicesPage() {
  const { invoices, audit, errors, refresh } = useData();
  const [sending, setSending] = useState<string | null>(null);
  const extra = (invoices ?? []).filter((i) => !DEMO_INVOICES.some((d) => d.id === i.id));

  const send = async (d: DemoInvoice) => {
    setSending(d.id);
    try {
      await api("POST", "/invoices", { id: d.id, supplierName: d.supplierName, rawText: d.rawText, poNumber: d.poNumber });
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
        lead={
          <>
            Demo control: drop a supplier invoice into the inbox and watch what the agent does. Progress also shows on the{" "}
            <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
              Overview
            </Link>
            .
          </>
        }
      />
      <ErrorNote message={errors.invoices} className="mb-4" />

      <ol className="grid gap-4 md:grid-cols-2">
        {DEMO_INVOICES.map((d, idx) => {
          const inv: Invoice | undefined = invoices?.find((i) => i.id === d.id);
          const evs = eventsFor(d.id, audit);
          const latest = evs[0];
          const tx = evs.find((e) => e.txHash)?.txHash;
          const T = TONE_ICON[d.tone];
          return (
            <li key={d.id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", T.cls)}>
                      <T.icon className="size-6" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">
                        {idx + 1}. {d.id} · {d.supplierName}
                      </p>
                      <h2 className="text-lg font-semibold">{d.title}</h2>
                    </div>
                    <InvoiceChip status={inv?.status} />
                  </div>
                  <p className="text-[0.95rem] text-muted-foreground">{d.expect}</p>

                  <details className="group rounded-lg border border-border bg-muted/50">
                    <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">Show the invoice text</summary>
                    <pre className="overflow-x-auto px-3 pb-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{d.rawText}</pre>
                  </details>

                  {latest && (
                    <div className="rounded-lg bg-muted/60 p-3 text-sm" aria-live="polite">
                      <p>{latest.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(latest.at)}</p>
                      {tx && <ExplorerLink hash={tx} className="-mb-2" />}
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="mt-auto"
                    variant={inv ? "outline" : "default"}
                    disabled={sending !== null || (inv !== undefined && inv.status !== "rejected" && d.tone !== "dup")}
                    onClick={() => send(d)}
                  >
                    <Send aria-hidden="true" />
                    {sending === d.id ? "Sending…" : inv ? "Sent" : "Simulate incoming invoice"}
                  </Button>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      {extra.length > 0 && (
        <section className="mt-8" aria-labelledby="other-h">
          <h2 id="other-h" className="mb-3 text-lg font-semibold">
            Other invoices
          </h2>
          <Card>
            <CardContent>
              <ul>
                {extra.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
                    <div>
                      <p className="font-medium">{i.supplierName}</p>
                      <p className="text-sm text-muted-foreground">
                        {i.id} · {timeAgo(i.receivedAt)}
                      </p>
                    </div>
                    <InvoiceChip status={i.status} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </>
  );
}
