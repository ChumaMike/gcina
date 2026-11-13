"use client";

import { createContext, useContext } from "react";
import { setZarRate } from "@/lib/money";
import { cn } from "@/lib/utils";

export type Rate = { rate: number; source: "valr" | "fixed"; at: string };

const Ctx = createContext<Rate>({ rate: 18, source: "fixed", at: "" });

/** Sets the rand rate once, before any amount below it is formatted (server render and browser alike). */
export function RateProvider({ rate, children }: { rate: Rate; children: React.ReactNode }) {
  setZarRate(rate.rate);
  return <Ctx value={rate}>{children}</Ctx>;
}

/** "Rand values are indicative: R 16.94 per RLUSD (VALR, 14:05)." */
export function RateNote({ className }: { className?: string }) {
  const r = useContext(Ctx);
  const time = r.at
    ? new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Johannesburg" }).format(new Date(r.at))
    : "";
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Rand values are indicative: R {r.rate.toFixed(2)} per RLUSD{" "}
      {r.source === "valr" ? `(VALR market price, ${time})` : "(fixed rate; live price unavailable)"}. Payments settle in RLUSD.
    </p>
  );
}
