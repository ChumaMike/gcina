"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [judge, setJudge] = useState(false);

  // Judge QR: /login#judge=<passcode>. The fragment never reaches the server; read it once,
  // wipe it from the address bar and history, then sign in.
  useEffect(() => {
    const m = window.location.hash.match(/^#judge=(.+)$/);
    if (!m) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    const input = formRef.current?.elements.namedItem("passcode") as HTMLInputElement | null;
    if (!input) return;
    // Syncing with the URL (an external system) once on mount.
    setJudge(true);
    input.value = decodeURIComponent(m[1]);
    formRef.current?.requestSubmit();
  }, []);
  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={action} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="passcode" className="text-base">{judge ? "Judge passcode" : "Passcode"}</Label>
            <Input
              id="passcode"
              name="passcode"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              className="h-12 text-base"
              aria-invalid={state.error ? true : undefined}
              aria-describedby={state.error ? "passcode-error" : undefined}
            />
            {state.error && (
              <p id="passcode-error" role="alert" className="text-sm font-medium text-danger">
                {state.error}
              </p>
            )}
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Checking…" : judge ? "Be the owner" : "Open my dashboard"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
