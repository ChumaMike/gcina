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
  onConfirm: () => Promise<void>;
};

/** Bottom sheet confirmation (thumb-reachable on a phone; no browser confirm()). */
export function useConfirm() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [checked, setChecked] = useState(false);
  const open = (r: ConfirmRequest) => {
    setChecked(false);
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
                disabled={busy || (!!req.requireCheck && !checked)}
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
