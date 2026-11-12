"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts from the last value to the new one. For money pass cents and a formatter.
 * Respects reduced motion (jumps straight to the value). Screen readers get the final value only.
 */
export function NumberTicker({ value, format = (n) => String(Math.round(n)), ms = 800, className }: { value: number; format?: (n: number) => string; ms?: number; className?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = reduce ? 1 : Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (value - start) * eased;
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);

  return (
    <span className={className}>
      <span aria-hidden="true" className="tabular-nums">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

/** Cents → "R 1 234.56" (South African grouping). */
export function randFromCents(cents: number): string {
  const c = Math.round(cents);
  const whole = Math.floor(Math.abs(c) / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${c < 0 ? "-" : ""}R ${whole}.${String(Math.abs(c) % 100).padStart(2, "0")}`;
}
