"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ErrorNote } from "./bits";

export type ConfirmRequest = {
  title: string;
  description?: React.ReactNode;
  body?: React.ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
  /** When set, the owner must tick this statement before the confirm button works. */
  requireCheck?: string;
  /** When set, the owner must also type this (e.g. the supplier's name, any case) before confirming. */
  requireType?: { label: string; value: string };
  onConfirm: () => Promise<void>;
};

/** Bottom sheet confirmation (thumb-reachable on a phone; no browser confirm()). */
export function useConfirm() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState("");
  const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();
  const typedOk = !req?.requireType || norm(typed) === norm(req.requireType.value);
  const open = (r: ConfirmRequest) => {
    setChecked(false);
    setTyped("");
    setError(undefined);
    setReq(r);
  };

  const close = () => {
    if (busy) return;
    setReq(null);
    setError(undefined);
  };

  const sheet = (
    <Sheet open={req !== null} onOpenChange={(o) => !o && close()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        {req && (
          <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
            <SheetHeader className="px-4 pt-6">
              <SheetTitle className="text-xl">{req.title}</SheetTitle>
              {req.description && <SheetDescription className="text-base">{req.description}</SheetDescription>}
            </SheetHeader>
            {req.body && <div className="px-4">{req.body}</div>}
            {req.requireCheck && (
              <label className="mx-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 border-border p-3 text-base has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 size-6 shrink-0 accent-[var(--color-primary)]"
                />
                <span>{req.requireCheck}</span>
              </label>
            )}
            {req.requireType && (
              <div className="mx-4 flex flex-col gap-1.5">
                <label htmlFor="confirm-typed" className="text-sm font-medium">
                  {req.requireType.label}
                </label>
                <input
                  id="confirm-typed"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  placeholder={req.requireType.value}
                  aria-invalid={typed !== "" && !typedOk}
                  className="h-12 rounded-lg border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-ring aria-invalid:border-danger"
                />
              </div>
            )}
            <div className="px-4">
              <ErrorNote message={error} />
            </div>
            <SheetFooter className="flex-col-reverse gap-2 px-4 sm:flex-row sm:justify-end">
              <Button variant="outline" size="lg" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button
                size="lg"
                variant={req.tone === "danger" ? "destructive" : "default"}
                className={req.tone === "danger" ? "bg-danger text-white hover:bg-danger/90" : undefined}
                disabled={busy || (!!req.requireCheck && !checked) || !typedOk}
                onClick={async () => {
                  setBusy(true);
                  setError(undefined);
                  try {
                    await req.onConfirm();
                    setReq(null);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "One moment…" : req.confirmLabel}
              </Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );

  return { confirm: open, sheet };
}
