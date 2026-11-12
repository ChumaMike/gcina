"use client";

import { Gavel } from "lucide-react";
import { createContext, useContext } from "react";
import type { Role } from "@/lib/session";

// UI only. The real limits are on the server (proxy.ts + the policy route); this just hides
// controls a judge can't use so nothing on screen pretends otherwise.
const RoleContext = createContext<Role>("owner");

export function RoleProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export const useRole = () => useContext(RoleContext);

export function JudgeBanner() {
  if (useRole() !== "judge") return null;
  return (
    <div role="note" className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-primary/30 bg-accent p-4 text-accent-foreground">
      <Gavel className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="text-lg font-semibold">You&apos;re the owner of MTA for 2 minutes</p>
        <p className="text-[0.95rem]">
          Approve or reject the payment waiting below. That&apos;s all a judge can do: limits, suppliers and the demo controls stay with the real owner.
        </p>
      </div>
    </div>
  );
}
