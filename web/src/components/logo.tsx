import { cn } from "@/lib/utils";

/** A shield holding a coin: "gcina" means keep, protect. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-9 shrink-0", className)}>
      <path
        d="M20 3 6 8.5v10.2C6 27.6 12 34.3 20 37c8-2.7 14-9.4 14-18.3V8.5L20 3Z"
        className="fill-primary"
      />
      <circle cx="20" cy="19.5" r="7.2" className="fill-primary-foreground" />
      <path d="M16.6 19.6 19 22l4.6-4.8" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary" />
    </svg>
  );
}
