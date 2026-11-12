import { cn } from "@/lib/utils";

/**
 * Gcina ("keep, protect"): a shield in two halves, the two signatures the ledger needs.
 * Green half = the agent's key, gold half = the rules co-signer. The tick only joins up across both.
 * `onDark` flips the green half to white for use on the green sidebar and photos.
 */
export function Logo({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-9 shrink-0", className)}>
      <path d="M19 3.4 6 8.6v10.1c0 8.4 5.4 14.9 13 17.8Z" className={onDark ? "fill-white" : "fill-primary"} />
      <path d="M21 3.4 34 8.6v10.1c0 8.4-5.4 14.9-13 17.8Z" className="fill-gold" />
      <path
        d="M13.2 19.8 18.2 24.6 27.4 14.6"
        fill="none"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={onDark ? "stroke-brand-deep" : "stroke-white"}
      />
    </svg>
  );
}

/** The mark with the name and the line, for the login and big screens. */
export function Wordmark({ className, tagline = true, onDark }: { className?: string; tagline?: boolean; onDark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo className="size-10" onDark={onDark} />
      <span className="leading-tight">
        <span className="block text-2xl font-bold tracking-tight">Gcina</span>
        {tagline && <span className={cn("block text-xs", onDark ? "text-white/75" : "text-muted-foreground")}>The agent pays. The ledger keeps.</span>}
      </span>
    </span>
  );
}
