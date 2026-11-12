"use client";
// One shared poll loop for the whole dashboard (every 3 s, paused while the tab is
// hidden), so every screen shows the same moment and we don't hammer the policy service.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  asList,
  normApproval,
  normAudit,
  normBalances,
  normInvoice,
  normPolicy,
  normSupplier,
} from "@/lib/normalize";
import type { Approval, AuditEvent, Balances, Health, Invoice, Policy, Supplier } from "@/lib/types";

export type Snapshot = {
  health: Health | null;
  policy: Policy | null;
  /** true when the API still uses the old `*Drops` field names */
  legacyDrops: boolean;
  /** server-reported spend today, if the API provides it */
  spentTodayRaw: unknown;
  suppliers: Supplier[] | null;
  invoices: Invoice[] | null;
  approvals: Approval[] | null;
  audit: AuditEvent[] | null;
  balances: Balances | null;
  errors: Partial<Record<string, string>>;
  loadedAt: number | null;
};

const empty: Snapshot = {
  health: null,
  policy: null,
  legacyDrops: false,
  spentTodayRaw: undefined,
  suppliers: null,
  invoices: null,
  approvals: null,
  audit: null,
  balances: null,
  errors: {},
  loadedAt: null,
};

type Ctx = Snapshot & { refresh: () => Promise<void> };
const DataContext = createContext<Ctx>({ ...empty, refresh: async () => {} });
export const useData = () => useContext(DataContext);

const POLL_MS = 3000;
/** While the agent is working on a bill, poll faster so its steps and notes appear as they happen. */
const BUSY_POLL_MS = 1200;

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>(empty);
  const inflight = useRef(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const keys = ["health", "policy", "suppliers", "invoices", "approvals", "audit", "balances"] as const;
      const results = await Promise.allSettled(keys.map((k) => api("GET", `/${k}`)));
      const inv = results[3];
      if (inv.status === "fulfilled") busy.current = asList(inv.value).some((i) => i.status === "new" || i.status === "processing");
      setSnap((prev) => {
        const next: Snapshot = { ...prev, errors: {}, loadedAt: Date.now() };
        results.forEach((r, i) => {
          const k = keys[i];
          if (r.status === "rejected") {
            next.errors[k] = r.reason instanceof Error ? r.reason.message : String(r.reason);
            return;
          }
          const v = r.value as Record<string, unknown>;
          switch (k) {
            case "health":
              next.health = v as unknown as Health;
              break;
            case "policy":
              next.policy = normPolicy(v);
              next.legacyDrops = "perPaymentMaxDrops" in (v ?? {});
              next.spentTodayRaw = v?.spentToday;
              break;
            case "suppliers":
              next.suppliers = asList(v).map(normSupplier);
              break;
            case "invoices":
              next.invoices = asList(v).map(normInvoice);
              break;
            case "approvals":
              next.approvals = asList(v).map(normApproval);
              break;
            case "audit":
              next.audit = asList(v)
                .map(normAudit)
                .sort((a, b) => (a.at < b.at ? 1 : -1));
              break;
            case "balances":
              next.balances = normBalances(v);
              break;
          }
        });
        return next;
      });
    } finally {
      inflight.current = false;
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      if (!document.hidden) await refresh();
      if (!stopped) timer = setTimeout(tick, busy.current ? BUSY_POLL_MS : POLL_MS);
    };
    tick();
    const onVis = () => !document.hidden && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  return <DataContext.Provider value={{ ...snap, refresh }}>{children}</DataContext.Provider>;
}
