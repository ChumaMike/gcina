"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <Card>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="passcode" className="text-base">Owner passcode</Label>
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
            {pending ? "Checking…" : "Open my dashboard"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
