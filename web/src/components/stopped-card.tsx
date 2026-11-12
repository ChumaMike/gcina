"use client";

import { Ban, CircleSlash, Copy, ShieldAlert, ShieldX } from "lucide-react";
import { useT } from "@/components/a11y/prefs";
import { Money } from "@/components/bits";
import { useData } from "@/components/data-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { stoppedPayments, type StopKind } from "@/lib/feed";
import { formatAmount, fromMinor, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

const ROWS: { kind: StopKind; label: string; icon: typeof ShieldX; cls: string; always: boolean }[] = [
  { kind: "fraud", label: "Fraud blocked", icon: ShieldAlert, cls: "bg-danger-soft text-danger", always: true },
  { kind: "repeat", label: "Repeats refused", icon: Copy, cls: "bg-info-soft text-info", always: true },
  { kind: "attack", label: "Attacks the ledger refused", icon: ShieldX, cls: "bg-danger-soft text-danger", always: true },
  { kind: "rules", label: "Over your limits", icon: Ban, cls: "bg-warn-soft text-warn", always: false },
  { kind: "declined", label: "You said no", icon: CircleSlash, cls: "bg-muted text-muted-foreground", always: false },
];

/** "Gcina stopped $X for you": every refused, ledger-refused or owner-rejected payment, counted once per invoice. */
export function StoppedCard() {
  const { audit, invoices } = useData();
  const t = useT();
  if (!audit) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  const stopped = stoppedPayments(audit, invoices).filter((s) => !s.amount || s.amount.currency === "RLUSD");
  const sum = (list: typeof stopped) => fromMinor("RLUSD", list.reduce((n, s) => n + (s.amount ? toMinor(s.amount) : 0n), 0n));
  const total = sum(stopped);

  return (
    <Card className="border-2 border-ok/30">
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
        <div className="flex flex-col gap-1" aria-live="polite">
          <p className="text-lg font-semibold">{t("stopped.title")}</p>
          <Money amount={total} size="xl" />
          <p className="text-muted-foreground">
            {stopped.length === 0
              ? "for you so far. Nothing suspicious yet; anything it stops adds up here."
              : `for you so far: ${stopped.length} ${stopped.length === 1 ? "payment" : "payments"} that never left.`}
          </p>
        </div>
        <ul className="grid flex-1 gap-2 sm:grid-cols-3">
          {ROWS.map((r) => {
            const list = stopped.filter((s) => s.kind === r.kind);
            if (!r.always && list.length === 0) return null;
            return (
              <li key={r.kind} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", r.cls)}>
                  <r.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{r.label}</span>
                  <span className="block text-sm text-muted-foreground tabular-nums">
                    {list.length} · {formatAmount(sum(list))}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
