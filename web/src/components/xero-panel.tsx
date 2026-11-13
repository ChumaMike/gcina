"use client";

// Bills straight from the books. Lists open bills in the connected Xero demo company; "Send to Gcina"
// hands one to the agent like any other bill, and once the ledger settles it Gcina records the
// payment in Xero with the ledger reference.
import { BookOpenCheck, CheckCircle2, Link2, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Import = { invoiceId: string; billNumber: string; contact: string; total: string; currency: string; usd: string; paymentId?: string; txHash?: string; error?: string };
type Bill = { id: string; number: string; contact: string; total: string; currency: string; due: string | null; po: string | null; supplier: string | null; usd: string | null; imported: Import | null };
type View =
  | { configured: false }
  | { configured: true; connected: false }
  | { configured: true; connected: true; org: string; account: string; rate: number; rateSource: string; bills: Bill[]; paid: Import[] };

const sym = (c: string) => (c === "ZAR" ? "R" : c === "USD" ? "$" : `${c} `);

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/xero/${path}`, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error ?? "Xero didn't answer.");
  return j;
}

export function XeroPanel({ onImported, className }: { onImported: () => void | Promise<void>; className?: string }) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const told = useRef(false);

  const load = useCallback(async () => {
    try {
      setView(await call<View>("GET", "bills"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    call<View>("GET", "bills")
      .then(setView)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    // Result of the Xero sign-in round trip, shown once.
    const q = new URLSearchParams(window.location.search);
    const x = q.get("xero");
    if (x && !told.current) {
      told.current = true;
      if (x === "connected") toast.success("Xero demo company connected.");
      else if (x === "failed") toast.error(q.get("why") ?? "Xero sign-in didn't finish.");
      else if (x === "not-set-up") toast.error("The Xero connection isn't set up on this site yet.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // While a sent bill is still waiting to be recorded in Xero, check every few seconds.
  const waiting = view && view.configured && view.connected ? view.bills.some((b) => b.imported && !b.imported.paymentId) : false;
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(async () => {
      try {
        const r = await call<{ marked: number }>("POST", "sync");
        if (r.marked > 0) toast.success("Recorded as paid in Xero, with the ledger reference.");
        await load();
      } catch {
        // try again on the next tick
      }
    }, 8000);
    return () => clearInterval(t);
  }, [waiting, load]);

  const send = async (b: Bill) => {
    setBusy(b.id);
    try {
      await call("POST", "import", { id: b.id });
      toast.success(`Bill ${b.number} sent to Gcina. Watch the agent pick it up.`);
      await Promise.all([load(), onImported()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (!view && !error) return null;
  if (view && !view.configured) return null;

  return (
    <section aria-labelledby="xero-h" className={cn("lift rounded-3xl bg-card p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
          <BookOpenCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="xero-h" className="font-semibold">
            Bills from your books (Xero)
          </h2>
          <p className="text-sm text-muted-foreground">
            {view && view.connected
              ? `Connected to ${view.org}. Paid bills are recorded in Xero against "${view.account}".`
              : "Connect a Xero demo company and Gcina reads the open bills and purchase orders from there."}
          </p>
        </div>
        {view && view.connected ? (
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); void load(); }} disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} aria-hidden="true" /> Refresh
          </Button>
        ) : (
          <Button asChild>
            {/* An API route that redirects to Xero's sign-in, so a plain link is right. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/xero/connect">
              <Link2 aria-hidden="true" /> Connect Xero
            </a>
          </Button>
        )}
      </div>

      {error && <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {view && view.connected && (
        <>
          {view.bills.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No open bills in Xero right now.</p>}
          <ul className="mt-4 flex flex-col gap-2">
            {view.bills.slice(0, 8).map((b) => (
              <li key={b.id} className="flex flex-col gap-2 rounded-2xl border border-border p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {b.contact} <span className="font-normal text-muted-foreground">· {b.number}</span>
                  </p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {sym(b.currency)} {b.total}
                    {b.usd && b.currency !== "USD" && ` · about $ ${b.usd} RLUSD`}
                    {b.po ? ` · order ${b.po}` : " · approved in Xero"}
                    {b.due && ` · due ${b.due}`}
                  </p>
                  {b.imported?.error && <p className="text-sm text-danger">Couldn&apos;t record it in Xero yet: {b.imported.error}</p>}
                </div>
                {b.imported ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" /> With Gcina ({b.imported.invoiceId})
                  </span>
                ) : b.supplier && b.usd ? (
                  <Button size="sm" onClick={() => void send(b)} disabled={busy !== null}>
                    {busy === b.id ? <Loader2 className="animate-spin" aria-hidden="true" /> : null} Send to Gcina
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">{b.usd ? "Not an approved supplier in Gcina" : "Currency not supported"}</span>
                )}
              </li>
            ))}
          </ul>
          {view.paid.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {view.paid.map((p) => (
                <li key={p.invoiceId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl bg-ok-soft px-3 py-2 text-sm">
                  <CheckCircle2 className="size-4 text-ok" aria-hidden="true" />
                  <span className="font-medium">
                    {p.contact} · {p.billNumber}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {sym(p.currency)} {p.total} · marked paid in Xero
                  </span>
                  {p.txHash && (
                    <a href={`/r/${p.txHash}`} target="_blank" rel="noreferrer" className="ml-auto font-medium text-primary underline-offset-4 hover:underline">
                      Receipt
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Demo company only. Rand bills are converted at R {view.rate.toFixed(2)} per RLUSD ({view.rateSource === "valr" ? "VALR market price" : "fixed indicative rate"}), locked when you send
            the bill. Settlement is RLUSD on the XRP Ledger Testnet; no rands move.
          </p>
        </>
      )}
    </section>
  );
}
