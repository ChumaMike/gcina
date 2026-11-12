"use client";

import { Bot, Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { hiddenParts, splitEmail } from "@/lib/hidden-text";
import { cn } from "@/lib/utils";

/**
 * "What you see / What the AI sees" for an HTML invoice. The rendered view is a fully
 * sandboxed iframe (no scripts, no same-origin), so the supplier's HTML can't run or reach the app.
 */
export function InvoiceTwoViews({ id, raw }: { id: string; raw: string }) {
  const [view, setView] = useState<"you" | "ai">("you");
  const { head, body } = splitEmail(raw);
  const parts = hiddenParts(raw);
  const hiddenCount = parts.filter((p) => p.hidden).length;
  const preRef = useRef<HTMLPreElement>(null);

  // Open the AI view on the hidden part, so the room sees it without scrolling.
  useEffect(() => {
    if (view !== "ai") return;
    const pre = preRef.current;
    const mark = pre?.querySelector("mark");
    if (pre && mark) pre.scrollTop = Math.max(0, mark.offsetTop - 24);
  }, [view]);

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={`How ${id} looks`} className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            ["you", Eye, "What you see"],
            ["ai", Bot, "What the AI sees"],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => setView(key)}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
              view === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {view === "you" ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <pre className="border-b border-border bg-muted/60 px-3 py-2 font-mono text-xs whitespace-pre-wrap">{head}</pre>
          <iframe
            title={`${id} as an e-mail, the way a person sees it`}
            sandbox=""
            referrerPolicy="no-referrer"
            srcDoc={body}
            className="block h-80 w-full bg-white"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {hiddenCount > 0 && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
              {hiddenCount === 1 ? "1 hidden part" : `${hiddenCount} hidden parts`} in red: invisible to you, but the AI reads every word.
            </p>
          )}
          <pre ref={preRef} className="relative max-h-96 overflow-auto rounded-xl border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
            {parts.map((p, i) =>
              p.hidden ? (
                <mark key={i} className="rounded bg-danger-soft text-danger outline-2 outline-danger">
                  <span className="sr-only">Hidden from you: </span>
                  {p.text}
                </mark>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
