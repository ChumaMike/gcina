"use client";

import { AlertOctagon, Ban, Check, Copy, ExternalLink, Phone, Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorNote, PageHeader, SupplierChip, timeAgo } from "@/components/bits";
import { useConfirm } from "@/components/confirm-sheet";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { addressChanges } from "@/lib/derive";
import { accountUrl } from "@/lib/money";
import type { Supplier } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Photos for known demo suppliers; everyone else gets an initials tile. */
const SUPPLIER_PHOTO: { re: RegExp; src: string; alt: string }[] = [
  { re: /mzansi catering/i, src: "/photos/supplier-catering.jpg", alt: "A cook in a blue apron turns chicken on a street grill." },
];

function Avatar({ s }: { s: Supplier }) {
  const p = SUPPLIER_PHOTO.find((x) => x.re.test(s.name));
  if (p) {
    return (
      <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
        <Image src={p.src} alt={p.alt} fill sizes="64px" className="object-cover" style={{ objectPosition: "25% 30%" }} />
      </span>
    );
  }
  const ini = s.name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span className="brand-field flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white" aria-hidden="true">
      {ini}
    </span>
  );
}

/** Address with copy and a ledger link. */
function Address({ value, tone = "muted", label }: { value: string; tone?: "muted" | "danger"; label: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Address copied.");
    } catch {
      toast.error("Couldn't copy on this phone. Press and hold the address instead.");
    }
  };
  return (
    <div className={cn("rounded-2xl p-3", tone === "danger" ? "border-2 border-danger bg-danger-soft" : "bg-muted/70")}>
      <p className={cn("mb-1 text-xs font-semibold tracking-wide uppercase", tone === "danger" ? "text-danger" : "text-muted-foreground")}>{label}</p>
      <p className={cn("font-mono text-sm break-all select-all", tone === "danger" && "text-danger")}>{value}</p>
      <div className="mt-1 flex flex-wrap gap-x-4">
        <button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary">
          <Copy className="size-4" aria-hidden="true" /> Copy
        </button>
        <a href={accountUrl(value)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
          <ExternalLink className="size-4" aria-hidden="true" /> See it on the ledger<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}

const since = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });
};

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
      <PageHeader
        title="Suppliers"
        lead="The agent may only pay addresses you've approved. Approving an address is always your decision."
        stat={
          suppliers && suppliers.length > 0 ? (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-semibold tabular-nums">{suppliers.filter((s) => s.status === "approved").length}</span>
              <span className="text-muted-foreground">
                approved
                {suppliers.some((s) => s.status === "pending") ? ` · ${suppliers.filter((s) => s.status === "pending").length} need your check` : ""}
              </span>
            </p>
          ) : undefined
        }
      >
        <Button size="lg" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" /> Add supplier
        </Button>
      </PageHeader>

      <ErrorNote message={errors.suppliers} className="mb-4" />
      {!suppliers && !errors.suppliers && <Skeleton className="h-64 w-full rounded-3xl" />}

      <ul className="grid gap-5 lg:grid-cols-2">
        {sorted.map((s, i) => {
          const old = changes.get(s.id);
          return (
            <li key={s.id} className={cn("reveal", old && "lg:col-span-2")} style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}>
              <article aria-labelledby={`sup-${s.id}`} className={cn("lift h-full overflow-hidden rounded-3xl bg-card", old && "ring-2 ring-gold")}>
                {old && (
                  <div className="flex items-start gap-2.5 bg-gold px-5 py-3 font-semibold text-gold-ink">
                    <AlertOctagon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                    <span>Address changed: check with {s.name} before you approve</span>
                  </div>
                )}
                <div className="flex flex-col gap-4 p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <Avatar s={s} />
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <h2 id={`sup-${s.id}`} className="text-xl font-semibold tracking-tight">
                          {s.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {s.status === "approved" && !old ? `Trusted since ${since(s.createdAt)}` : `Added ${timeAgo(s.createdAt)}`}
                        </p>
                      </div>
                      <SupplierChip status={s.status} />
                    </div>
                  </div>

                  {old ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Address value={old.xrplAddress} label="Registered address (approved)" />
                      <Address value={s.xrplAddress} tone="danger" label="New address (not approved)" />
                      <p className="text-sm font-medium text-danger sm:col-span-2">
                        Someone says {s.name} has new payment details. This is the most common invoice scam. The agent won&apos;t pay it unless you approve.
                      </p>
                    </div>
                  ) : (
                    <Address value={s.xrplAddress} label="Pays to" />
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
                </div>
              </article>
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
