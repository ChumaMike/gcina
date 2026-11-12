"use client";

import { ShieldX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActorChip, ExplorerLink, clock, timeAgo } from "./bits";

function ledgerRefusal(e: AuditEvent): string | null {
  const d = e.data as Record<string, unknown> | undefined;
  const r = (d?.engine_result ?? d?.ledgerResult ?? d?.result) as string | undefined;
  if (typeof r === "string" && /^te[fml]/.test(r)) return r;
  const m = e.message.match(/\bte[fml][A-Z_]+\b/);
  return m ? m[0] : null;
}

export function ActivityFeed({ events, limit = 30, className }: { events: AuditEvent[] | null; limit?: number; className?: string }) {
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
  return (
    <ol className={cn("flex flex-col", className)} aria-live="polite" aria-relevant="additions">
      {events.slice(0, limit).map((e) => {
        const refused = ledgerRefusal(e);
        return (
          <li
            key={e.id}
            className={cn(
              "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border py-3 last:border-b-0 animate-in fade-in-0 slide-in-from-top-1 duration-300",
              refused && "rounded-lg border-b-0 bg-danger-soft px-3 my-1",
            )}
          >
            <div className="pt-0.5">
              <ActorChip actor={e.actor} />
            </div>
            <div className="min-w-0">
              <p className="text-[0.95rem] leading-snug text-pretty">
                {refused && <ShieldX className="mr-1 inline size-4 -translate-y-px text-danger" aria-hidden="true" />}
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
