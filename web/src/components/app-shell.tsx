"use client";

import { Bell, FileText, HelpCircle, Home, LogOut, SendHorizontal, SlidersHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { RlusdBadge } from "./bits";
import { useData } from "./data-provider";
import { AccessibilityButton } from "./a11y/accessibility-button";
import { Logo } from "./logo";
import { JudgeBanner, useRole } from "./role";

const JUDGE_HREFS = new Set(["/", "/approvals", "/how-it-works"]);

const NAV = [
  { href: "/", label: "Overview", short: "Home", icon: Home },
  { href: "/approvals", label: "Approvals", short: "Approve", icon: Bell },
  { href: "/limits", label: "Limits", short: "Limits", icon: SlidersHorizontal },
  { href: "/suppliers", label: "Suppliers", short: "Suppliers", icon: Users },
  { href: "/invoices", label: "Invoices", short: "Invoices", icon: FileText },
] as const;

function useCounts() {
  const { approvals, suppliers } = useData();
  return {
    "/approvals": approvals?.filter((a) => a.status === "pending").length ?? 0,
    "/suppliers": suppliers?.filter((s) => s.status === "pending").length ?? 0,
  } as Record<string, number>;
}

function CountDot({ n, className }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold text-white", className)}>
      {n}
      <span className="sr-only"> waiting</span>
    </span>
  );
}

export function AppShell({ children, mock }: { children: React.ReactNode; mock: boolean }) {
  const path = usePathname();
  const counts = useCounts();
  const judge = useRole() === "judge";
  const nav = judge ? NAV.filter((n) => JUDGE_HREFS.has(n.href)) : NAV;
  const { health, errors } = useData();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const offline = Boolean(errors.health);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-card focus:p-3">
        Skip to content
      </a>

      {/* Desktop / projector sidebar */}
      <aside className="brand-field sticky top-0 hidden h-dvh w-64 shrink-0 flex-col p-4 text-white md:flex lg:w-72">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Logo onDark className="size-10" />
          <span>
            <span className="block text-xl font-bold leading-tight tracking-tight">Gcina</span>
            <span className="block text-xs text-white/70">The agent pays. The ledger keeps.</span>
          </span>
        </Link>
        <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
          {[...nav, ...(judge ? [] : [{ href: "/supplier", label: "Send a bill", short: "Send", icon: SendHorizontal }]), { href: "/how-it-works", label: "How it works", short: "How", icon: HelpCircle }].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white",
                active(n.href) && "bg-white text-brand-deep shadow-lg hover:bg-white hover:text-brand-deep",
              )}
            >
              <n.icon className={cn("size-5", active(n.href) && "text-primary")} aria-hidden="true" />
              <span className="flex-1">{n.label}</span>
              <CountDot n={counts[n.href] ?? 0} />
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <AccessibilityButton />
          <RlusdBadge className="self-start" />
          <NetworkLine mock={mock} offline={offline} network={health?.network} onDark />
          <form action={logout}>
            <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/75 hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Phone header */}
      <header className="glass sticky top-0 z-30 flex items-center gap-3 px-4 py-2 md:hidden">
        <Link href="/" className="flex min-h-11 items-center gap-2" aria-label="Gcina overview">
          <Logo className="size-8" />
          <span className="text-lg font-semibold">Gcina</span>
        </Link>
        <span className="ml-auto">
          <NetworkLine mock={mock} offline={offline} network={health?.network} compact />
        </span>
        <AccessibilityButton compact />
        {!judge && (
          <Link href="/supplier" aria-label="Send a bill" aria-current={active("/supplier") ? "page" : undefined} className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
            <SendHorizontal className="size-5" aria-hidden="true" />
          </Link>
        )}
        <Link
          href="/how-it-works"
          aria-label="How it works"
          aria-current={active("/how-it-works") ? "page" : undefined}
          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <HelpCircle className="size-5" aria-hidden="true" />
        </Link>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:px-8 md:pt-8 md:pb-12">
        <JudgeBanner />
        {children}
      </main>

      {/* Phone bottom nav */}
      <nav
        aria-label="Main"
        className={cn("glass fixed inset-x-3 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-30 grid rounded-full p-1 md:hidden", judge ? "grid-cols-2" : "grid-cols-5")}
      >
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active(n.href) ? "page" : undefined}
            className={cn(
              "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[0.68rem] font-medium text-muted-foreground transition-colors",
              active(n.href) && "bg-primary text-white shadow-md",
            )}
          >
            <n.icon className="size-5" aria-hidden="true" />
            {n.short}
            <CountDot n={counts[n.href] ?? 0} className="absolute top-1.5 left-1/2 ml-1.5 h-4 min-w-4 px-1 text-[0.65rem]" />
          </Link>
        ))}
      </nav>
    </div>
  );
}

function NetworkLine({ mock, offline, network, compact, onDark }: { mock: boolean; offline: boolean; network?: string; compact?: boolean; onDark?: boolean }) {
  const label = offline ? "Can't reach the policy service" : mock ? "Demo data" : "XRP Ledger Testnet";
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs", offline ? (onDark ? "font-semibold text-gold" : "text-danger") : onDark ? "text-white/75" : "text-muted-foreground")} title={network}>
      <span
        className={cn("size-2 rounded-full", offline ? "bg-danger" : mock ? "bg-warn" : "bg-gold animate-pulse")}
        aria-hidden="true"
      />
      {compact && !offline ? (mock ? "Demo" : "Testnet") : label}
    </span>
  );
}
