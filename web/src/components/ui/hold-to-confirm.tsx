"use client";

import { Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Press and hold to confirm (pattern: 21st.dev "hold to confirm" buttons, see SOURCES.md; written for Gcina).
 * Works with touch, mouse and keyboard (hold Space or Enter). Letting go early cancels.
 * The fill is feedback, not decoration, so it still shows with reduced motion.
 */
export function HoldToConfirm({
  onConfirm,
  label,
  holdingLabel = "Keep holding…",
  doneLabel = "Done",
  ms = 1200,
  disabled = false,
  className,
}: {
  onConfirm: () => Promise<void> | void;
  label: string;
  holdingLabel?: string;
  doneLabel?: string;
  ms?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [p, setP] = useState(0);
  const [state, setState] = useState<"idle" | "holding" | "busy" | "done">("idle");
  const raf = useRef(0);
  const t0 = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setState((s) => (s === "holding" ? "idle" : s));
    setP((v) => (v >= 1 ? v : 0));
  }, []);

  const fire = useCallback(async () => {
    setState("busy");
    try {
      await onConfirm();
      setState("done");
    } catch {
      setState("idle");
      setP(0);
    }
  }, [onConfirm]);

  const start = useCallback(() => {
    if (disabled || state !== "idle") return;
    setState("holding");
    t0.current = performance.now();
    const tick = (now: number) => {
      const v = Math.min(1, (now - t0.current) / ms);
      setP(v);
      if (v >= 1) {
        navigator.vibrate?.(30);
        void fire();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [disabled, state, ms, fire]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const text = state === "busy" ? "One moment…" : state === "done" ? doneLabel : state === "holding" ? holdingLabel : label;

  return (
    <button
      type="button"
      disabled={disabled || state === "busy" || state === "done"}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") stop();
      }}
      onClick={(e) => e.preventDefault()}
      aria-label={`${label}: press and hold`}
      aria-live="polite"
      className={cn(
        "relative isolate flex min-h-14 w-full touch-none items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground select-none",
        "shadow-[0_10px_24px_-14px_var(--color-primary)] transition-transform active:scale-[0.99] disabled:opacity-90",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {/* the fill: grows left to right while held */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 -z-10 bg-ok"
        style={{ width: `${(state === "done" || state === "busy" ? 1 : p) * 100}%` }}
      />
      {state === "busy" ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Check className="size-5" aria-hidden="true" />}
      <span>{text}</span>
    </button>
  );
}
