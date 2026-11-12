"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorNote, PageHeader, timeAgo } from "@/components/bits";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { savePolicy } from "@/lib/derive";
import { formatAmount, formatZar, parseInput, toInput, toMinor } from "@/lib/money";
import type { Amount, Currency, Policy } from "@/lib/types";

type Key = "perPaymentMax" | "dailyMax" | "requireHumanAbove";

const FIELDS: { key: Key; label: string; help: string }[] = [
  { key: "perPaymentMax", label: "Most it can pay in one go", help: "Anything bigger waits for you." },
  { key: "dailyMax", label: "Most it can pay in a day", help: "Counted from midnight, South African time." },
  { key: "requireHumanAbove", label: "Ask me first above", help: "Payments over this amount always wait for your OK." },
];

export default function LimitsPage() {
  const { policy, errors } = useData();
  return (
    <>
      <PageHeader title="Limits" lead="You set the rules. The agent works inside them." />
      {policy ? <LimitsForm policy={policy} /> : errors.policy ? <ErrorNote message={errors.policy} /> : <Skeleton className="h-96 w-full max-w-2xl" />}
    </>
  );
}

function LimitsForm({ policy }: { policy: Policy }) {
  const { legacyDrops, refresh } = useData();
  const currency: Currency = policy.perPaymentMax.currency;
  const fromPolicy = Object.fromEntries(FIELDS.map((f) => [f.key, toInput(policy[f.key])])) as Record<Key, string>;
  // While the owner isn't editing, the form follows the live policy; once they type, their edits win.
  const [edits, setEdits] = useState<Record<Key, string> | null>(null);
  const values = edits ?? fromPolicy;
  const dirty = edits !== null;
  const setDirty = (d: boolean) => !d && setEdits(null);
  const setValues = (fn: (v: Record<Key, string>) => Record<Key, string>) => setEdits(fn(values));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const parsed = Object.fromEntries(FIELDS.map((f) => [f.key, parseInput(currency, values[f.key])])) as Record<Key, Amount | null>;
  const invalid = FIELDS.filter((f) => parsed[f.key] === null).map((f) => f.key);
  const warnings: string[] = [];
  if (!invalid.length) {
    const [p, d, h] = [toMinor(parsed.perPaymentMax!), toMinor(parsed.dailyMax!), toMinor(parsed.requireHumanAbove!)];
    if (p > d) warnings.push("Your one-payment limit is bigger than your daily limit, so the daily limit will win.");
    if (h > p) warnings.push("“Ask me first” is above the one-payment limit, so big payments already wait for you anyway.");
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid.length) return;
    setSaving(true);
    setError(undefined);
    try {
      await savePolicy(
        { perPaymentMax: parsed.perPaymentMax!, dailyMax: parsed.dailyMax!, requireHumanAbove: parsed.requireHumanAbove! },
        legacyDrops,
      );
      setDirty(false);
      await refresh();
      toast.success("Limits saved. They apply from the very next invoice.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-2xl">
      <Card>
        <CardContent className="flex flex-col gap-6">
          <p className="flex items-start gap-3 rounded-xl bg-accent p-4 text-[0.95rem] font-medium text-accent-foreground">
            <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Changes apply instantly. The agent can&apos;t change these.
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                They live in a separate policy service that co-signs every payment. The agent has no key to it.
              </span>
            </span>
          </p>

          {FIELDS.map((f) => {
            const a = parsed[f.key];
            const bad = invalid.includes(f.key);
            return (
              <div key={f.key} className="flex flex-col gap-2">
                <Label htmlFor={f.key} className="text-base">
                  {f.label}
                </Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 sm:max-w-64">
                    {currency === "RLUSD" && (
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-lg text-muted-foreground" aria-hidden="true">
                        $
                      </span>
                    )}
                    <Input
                      id={f.key}
                      inputMode="decimal"
                      autoComplete="off"
                      value={values[f.key]}
                      onChange={(e) => {
                        setDirty(true);
                        setValues((v) => ({ ...v, [f.key]: e.target.value }));
                      }}
                      aria-invalid={bad || undefined}
                      aria-describedby={`${f.key}-help`}
                      className={`h-12 text-lg tabular-nums ${currency === "RLUSD" ? "pl-7" : ""}`}
                    />
                  </div>
                  <span className="text-base font-medium text-muted-foreground">{currency}</span>
                </div>
                <p id={`${f.key}-help`} className="text-sm text-muted-foreground">
                  {bad ? (
                    <span className="font-medium text-danger">Enter an amount like 50 or 50.00.</span>
                  ) : (
                    <>
                      ≈ <span className="tabular-nums">{a ? formatZar(a) : "…"}</span> indicative · {f.help}
                    </>
                  )}
                </p>
              </div>
            );
          })}

          {warnings.map((w) => (
            <p key={w} className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
              {w}
            </p>
          ))}
          <ErrorNote message={error} />
        </CardContent>
        <CardFooter className="flex flex-col-reverse items-stretch gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Last changed {policy.updatedAt ? timeAgo(policy.updatedAt) : "—"}
            {policy.updatedBy ? ` by ${policy.updatedBy === "operator" ? "you" : policy.updatedBy}` : ""}. Now:{" "}
            {formatAmount(policy.perPaymentMax)} / {formatAmount(policy.dailyMax)} / {formatAmount(policy.requireHumanAbove)}
          </p>
          <div className="flex gap-2">
            {dirty && (
              <Button type="button" variant="outline" size="lg" onClick={() => setDirty(false)} disabled={saving}>
                Undo
              </Button>
            )}
            <Button type="submit" size="lg" disabled={!dirty || saving || invalid.length > 0} className="flex-1 sm:flex-none">
              {saving ? "Saving…" : "Save limits"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
