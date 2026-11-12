"use client";

import { AlertOctagon, Ban, Check, Phone, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorNote, PageHeader, SupplierChip, timeAgo } from "@/components/bits";
import { useConfirm } from "@/components/confirm-sheet";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { addressChanges } from "@/lib/derive";
import { accountUrl } from "@/lib/money";
import type { Supplier } from "@/lib/types";
import { cn } from "@/lib/utils";

function Address({ value, className }: { value: string; className?: string }) {
  return (
    <a
      href={accountUrl(value)}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex min-h-11 items-center font-mono text-sm break-all underline-offset-4 hover:underline", className)}
      title="See this address on the XRP Ledger"
    >
      {value}
    </a>
  );
}

export default function SuppliersPage() {
  const { suppliers, errors, refresh } = useData();
  const { confirm, sheet } = useConfirm();
  const [adding, setAdding] = useState(false);

  const setStatus = async (s: Supplier, status: Supplier["status"]) => {
    await api("PATCH", `/suppliers/${encodeURIComponent(s.id)}`, { status });
    await refresh();
    toast.success(status === "approved" ? `${s.name} approved. The agent may pay this address now.` : `${s.name} blocked. The agent can't pay it.`);
  };

  const changes = suppliers ? addressChanges(suppliers) : new Map<string, Supplier>();
  const order = { pending: 0, approved: 1, blocked: 2 } as const;
  const sorted = [...(suppliers ?? [])].sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));

  const askApprove = (s: Supplier) => {
    const old = changes.get(s.id);
    confirm({
      title: old ? `Approve a new address for ${s.name}?` : `Approve ${s.name}?`,
      description: old
        ? "This is how “new banking details” fraud works. Only approve if you've confirmed it with the supplier yourself."
        : "The agent will be allowed to pay this address, within your limits.",
      body: (
        <div className="flex flex-col gap-3">
          {old && (
            <p className="flex items-start gap-2 rounded-lg bg-warn-soft p-3 text-sm text-warn">
              <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Phone {s.name} on a number you already had, not one from the invoice or email.
            </p>
          )}
          {old ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border p-2">
                <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Old (approved)</p>
                <p className="font-mono text-xs break-all">{old.xrplAddress}</p>
              </div>
              <div className="rounded-lg border-2 border-danger p-2">
                <p className="mb-1 text-xs font-semibold text-danger uppercase">New</p>
                <p className="font-mono text-xs break-all text-danger">{s.xrplAddress}</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-mono text-sm break-all">{s.xrplAddress}</p>
            </>
          )}
        </div>
      ),
      requireCheck: `I confirmed this ${old ? "new address" : "address"} with ${s.name} on a number I already had.`,
      confirmLabel: old ? "Approve new address" : "Approve supplier",
      tone: old ? "danger" : "default",
      onConfirm: () => setStatus(s, "approved"),
    });
  };

  const askBlock = (s: Supplier) =>
    confirm({
      title: `Block ${s.name}${changes.has(s.id) ? "'s new address" : ""}?`,
      description: "The agent won't be able to pay this address. You can approve it again later.",
      confirmLabel: "Block",
      tone: "danger",
      onConfirm: () => setStatus(s, "blocked"),
    });

  return (
    <>
      <PageHeader title="Suppliers" lead="The agent may only pay addresses you've approved. Approving an address is always your decision.">
        <Button size="lg" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" /> Add supplier
        </Button>
      </PageHeader>

      <ErrorNote message={errors.suppliers} className="mb-4" />
      {!suppliers && !errors.suppliers && <Skeleton className="h-64 w-full" />}

      <ul className="grid gap-4 lg:grid-cols-2">
        {sorted.map((s) => {
          const old = changes.get(s.id);
          return (
            <li key={s.id} className={cn(old && "lg:col-span-2")}>
              <Card className={cn(old && "border-2 border-danger/50 bg-danger-soft/40")}>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold">{s.name}</h2>
                      <p className="text-sm text-muted-foreground">Added {timeAgo(s.createdAt)}</p>
                    </div>
                    {old ? (
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-danger px-3 text-sm font-semibold text-white">
                        <AlertOctagon className="size-4" aria-hidden="true" /> Address change
                      </span>
                    ) : (
                      <SupplierChip status={s.status} />
                    )}
                  </div>

                  {old ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-card p-3">
                        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Registered address (approved)</p>
                        <Address value={old.xrplAddress} />
                      </div>
                      <div className="rounded-lg border-2 border-danger bg-card p-3">
                        <p className="mb-1 text-xs font-semibold tracking-wide text-danger uppercase">New address (not approved)</p>
                        <Address value={s.xrplAddress} className="text-danger" />
                      </div>
                      <p className="text-sm font-medium text-danger sm:col-span-2">
                        Someone says {s.name} has new payment details. This is the most common invoice scam. The agent won&apos;t pay it unless you approve.
                      </p>
                    </div>
                  ) : (
                    <Address value={s.xrplAddress} className="text-muted-foreground" />
                  )}

                  <div className="flex flex-wrap gap-2">
                    {s.status !== "approved" && (
                      <Button size="lg" variant={old ? "outline" : "default"} onClick={() => askApprove(s)}>
                        <Check aria-hidden="true" /> {old ? "Approve new address" : "Approve"}
                      </Button>
                    )}
                    {s.status !== "blocked" && (
                      <Button
                        size="lg"
                        variant={old ? "default" : "outline"}
                        className={cn(old && "bg-danger text-white hover:bg-danger/90")}
                        onClick={() => askBlock(s)}
                      >
                        <Ban aria-hidden="true" /> {old ? "Block new address" : "Block"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <AddSupplierSheet open={adding} onOpenChange={setAdding} />
      {sheet}
    </>
  );
}

function AddSupplierSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { refresh } = useData();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const validAddr = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !validAddr) return;
    setBusy(true);
    setError(undefined);
    try {
      await api("POST", "/suppliers", { name: name.trim(), xrplAddress: address.trim() });
      await refresh();
      toast.success(`${name.trim()} added. Approve it when you've checked the details.`);
      setName("");
      setAddress("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <form onSubmit={submit} className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-6">
          <SheetHeader className="p-0">
            <SheetTitle className="text-xl">Add a supplier</SheetTitle>
            <SheetDescription className="text-base">New suppliers start as “needs your check”. The agent can&apos;t pay them until you approve.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-name" className="text-base">Business name</Label>
            <Input id="sup-name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" required autoComplete="organization" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-addr" className="text-base">XRP Ledger address</Label>
            <Input
              id="sup-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-12 font-mono text-sm"
              placeholder="r…"
              required
              autoComplete="off"
              spellCheck={false}
              aria-invalid={(address.length > 3 && !validAddr) || undefined}
              aria-describedby="sup-addr-help"
            />
            <p id="sup-addr-help" className={cn("text-sm", address.length > 3 && !validAddr ? "text-danger" : "text-muted-foreground")}>
              {address.length > 3 && !validAddr ? "That doesn't look like an XRP Ledger address (starts with r)." : "Get this from the supplier directly, not from an invoice."}
            </p>
          </div>
          <ErrorNote message={error} />
          <SheetFooter className="flex-col-reverse gap-2 p-0 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={busy || !name.trim() || !validAddr}>
              {busy ? "Adding…" : "Add supplier"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
