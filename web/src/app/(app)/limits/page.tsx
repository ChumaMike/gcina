"use client";

import { CalendarDays, Hand, Lock, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorNote, PageHeader, timeAgo } from "@/components/bits";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { savePolicy } from "@/lib/derive";
import { formatZar, parseInput, toInput, toMinor } from "@/lib/money";
import type { Amount, Currency, Policy } from "@/lib/types";
import { cn } from "@/lib/utils";

type Key = "perPaymentMax" | "dailyMax" | "requireHumanAbove";

const FIELDS: { key: Key; label: string; help: string; icon: typeof Wallet }[] = [
  { key: "requireHumanAbove", label: "Ask me first above", help: "Payments over this always wait for your yes.", icon: Hand },
  { key: "perPaymentMax", label: "Most it can pay in one go", help: "Anything bigger is refused.", icon: Wallet },
  { key: "dailyMax", label: "Most it can pay in a day", help: "Counted from midnight, South African time.", icon: CalendarDays },
];

export default function LimitsPage() {
  const { policy, errors } = useData();
  return (
    <>
      <PageHeader title="Limits" lead="You set the rules. The agent works inside them and can't change them." />
      {policy ? <LimitsForm policy={policy} /> : errors.policy ? <ErrorNote message={errors.policy} /> : <Skeleton className="h-96 w-full max-w-3xl rounded-3xl" />}
    </>
  );
}

/** Slider range in whole RLUSD: comfortably above today's value, in round steps. */
function sliderMax(a: Amount | null, fallback: number) {
  const now = a ? Number(toMinor(a) / 100n) : fallback;
  return Math.max(100, Math.ceil((now * 3) / 50) * 50);
}

function LimitsForm({ policy }: { policy: Policy }) {
  const { legacyDrops, refresh } = useData();
  const currency: Currency = policy.perPaymentMax.currency;
  const fromPolicy = Object.fromEntries(FIELDS.map((f) => [f.key, toInput(policy[f.key])])) as Record<Key, string>;
  // While the owner isn't editing, the form follows the live policy; once they move or type, their edits win.
  const [edits, setEdits] = useState<Record<Key, string> | null>(null);
  const values = edits ?? fromPolicy;
  const dirty = edits !== null;
  const setValue = (k: Key, v: string) => setEdits({ ...values, [k]: v });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  // Slider ranges are fixed from the saved policy so the thumb doesn't jump while dragging.
  const [ranges] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, sliderMax(policy[f.key], 100)])) as Record<Key, number>);

  const parsed = Object.fromEntries(FIELDS.map((f) => [f.key, parseInput(currency, values[f.key])])) as Record<Key, Amount | null>;
  const invalid = FIELDS.filter((f) => parsed[f.key] === null).map((f) => f.key);
  const warnings: string[] = [];
  if (!invalid.length) {
    const [p, d, h] = [toMinor(parsed.perPaymentMax!), toMinor(parsed.dailyMax!), toMinor(parsed.requireHumanAbove!)];
    if (p > d) warnings.push("Your one-payment limit is bigger than your daily limit, so the daily limit will win.");
    if (h > p) warnings.push("“Ask me first” is above the one-payment limit, so big payments are refused before they reach you.");
  }
  const z = (k: Key) => (parsed[k] ? formatZar(parsed[k]!).replace(/\.00$/, "") : "…");

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
      setEdits(null);
      await refresh();
      toast.success("Limits saved. They apply from the very next invoice.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="flex max-w-3xl flex-col gap-5">
      {/* The rules in one sentence, live as the sliders move. */}
      <p aria-live="polite" className="reveal brand-field lift rounded-3xl p-6 text-lg leading-relaxed text-white sm:text-xl">
        Gcina pays bills up to <strong className="text-gold">{z("requireHumanAbove")}</strong> on its own and asks you above that. It never pays more than{" "}
        <strong className="text-gold">{z("perPaymentMax")}</strong> in one go, or <strong className="text-gold">{z("dailyMax")}</strong> in a day.
      </p>

      <ul className="flex flex-col gap-4">
        {FIELDS.map((f, i) => {
          const a = parsed[f.key];
          const bad = invalid.includes(f.key);
          const whole = a ? Number(toMinor(a) / 100n) : 0;
          return (
            <li key={f.key} className="reveal lift rounded-3xl bg-card p-5 sm:p-6" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                  <f.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <label htmlFor={f.key} className="block text-base font-semibold">
                    {f.label}
                  </label>
                  <p className="text-sm text-muted-foreground">{f.help}</p>
                </div>
              </div>

              <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums" aria-hidden="true">
                {bad ? "…" : z(f.key)}
              </p>

              {currency === "RLUSD" && (
                <input
                  type="range"
                  min={0}
                  max={Math.max(ranges[f.key], whole)}
                  step={1}
                  value={whole}
                  onChange={(e) => setValue(f.key, `${e.target.value}.00`)}
                  aria-label={`${f.label}, in RLUSD`}
                  aria-valuetext={a ? `${z(f.key)} (${values[f.key]} RLUSD)` : undefined}
                  className="mt-3 h-11 w-full cursor-pointer accent-[var(--color-primary)]"
                />
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="relative w-36">
                  {currency === "RLUSD" && (
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground" aria-hidden="true">
                      $
                    </span>
                  )}
                  <Input
                    id={f.key}
                    inputMode="decimal"
                    autoComplete="off"
                    value={values[f.key]}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    aria-invalid={bad || undefined}
                    aria-describedby={`${f.key}-help`}
                    className={cn("h-11 tabular-nums", currency === "RLUSD" && "pl-7")}
                  />
                </div>
                <span id={`${f.key}-help`} className="text-sm text-muted-foreground">
                  {bad ? <span className="font-medium text-danger">Enter an amount like 50 or 50.00.</span> : <>{currency} on the XRP Ledger · rand is indicative</>}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {warnings.map((w) => (
        <p key={w} className="rounded-2xl bg-gold/20 p-4 text-sm font-medium text-gold-ink">
          {w}
        </p>
      ))}
      <ErrorNote message={error} />

      <p className="flex items-start gap-3 rounded-2xl bg-accent p-4 text-[0.95rem] font-medium text-accent-foreground">
        <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          The agent can read these. It can&apos;t change them.
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            They live in a separate policy service that co-signs every payment. The agent has no key to it.
          </span>
        </span>
      </p>

      <div
        className={cn(
          "z-10 flex flex-col-reverse items-stretch gap-3 rounded-3xl bg-card/95 p-4 ring-1 ring-foreground/5 backdrop-blur sm:flex-row sm:items-center sm:justify-between",
          // Floats above the phone nav only while there is something to save.
          dirty && "sticky bottom-24 shadow-lg sm:bottom-4",
        )}
      >
        <p className="text-sm text-muted-foreground">
          {dirty ? "You have unsaved changes." : `Last changed ${policy.updatedAt ? timeAgo(policy.updatedAt) : "—"}`}
          {!dirty && policy.updatedBy ? ` by ${policy.updatedBy === "operator" ? "you" : policy.updatedBy === "seed" ? "the demo setup" : policy.updatedBy}.` : ""}
        </p>
        <div className="flex gap-2">
          {dirty && (
            <Button type="button" variant="outline" size="lg" onClick={() => setEdits(null)} disabled={saving}>
              Undo
            </Button>
          )}
          <Button type="submit" size="lg" disabled={!dirty || saving || invalid.length > 0} className="flex-1 sm:flex-none">
            {saving ? "Saving…" : "Save limits"}
          </Button>
        </div>
      </div>
    </form>
  );
}
