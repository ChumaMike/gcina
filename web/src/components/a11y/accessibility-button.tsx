"use client";

import { Hand } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { LANGS } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { usePrefs } from "./prefs";
import { SpeakToGcina } from "./speak-to-gcina";

/** The universal-access figure with a little depth: gradient body, highlight and soft shadow. */
function AccessIcon({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-9", className)}>
      <defs>
        <radialGradient id={`${id}-b`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#3fa0ff" />
          <stop offset="0.6" stopColor="#1463d6" />
          <stop offset="1" stopColor="#0a3d91" />
        </radialGradient>
        <filter id={`${id}-s`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#0a2a66" floodOpacity="0.45" />
        </filter>
      </defs>
      <circle cx="24" cy="24" r="21" fill={`url(#${id}-b)`} filter={`url(#${id}-s)`} />
      <ellipse cx="18" cy="13" rx="9" ry="5" fill="#ffffff" opacity="0.28" />
      <g fill="#ffffff">
        <circle cx="24" cy="12.5" r="3.4" />
        <path d="M12.5 17.6c-.9-.3-1.9.2-2.2 1.1-.3.9.2 1.9 1.1 2.2l7.6 2.4v4.1l-2.7 9.1c-.3 1 .3 2 1.2 2.3 1 .3 2-.3 2.3-1.2l2.5-8.4h1l2.5 8.4c.3.9 1.3 1.5 2.3 1.2.9-.3 1.5-1.3 1.2-2.3l-2.7-9.1v-4.1l7.6-2.4c.9-.3 1.4-1.3 1.1-2.2-.3-.9-1.3-1.4-2.2-1.1L24 21.1Z" />
      </g>
    </svg>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

export function AccessibilityButton({ compact = false }: { compact?: boolean }) {
  const { prefs, set, t } = usePrefs();
  const [open, setOpen] = useState(false);
  const [sasl, setSasl] = useState(false);

  // Keep the SASL preview switch in step with the floating preview (sasl-preview.tsx).
  useEffect(() => {
    const on = (e: Event) => setSasl(Boolean((e as CustomEvent<{ on: boolean }>).detail?.on));
    window.addEventListener("gcina:sasl-state", on);
    return () => window.removeEventListener("gcina:sasl-state", on);
  }, []);
  const toggleSasl = (v: boolean) => {
    setSasl(v);
    window.dispatchEvent(new CustomEvent("gcina:sasl", { detail: { on: v } }));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t("a11y.title")}
          className={cn(
            "flex min-h-12 items-center gap-3 rounded-xl text-left transition-transform hover:scale-[1.03] active:scale-95",
            compact ? "size-12 justify-center" : "w-full px-2 text-[0.95rem] font-medium hover:bg-muted",
          )}
        >
          <AccessIcon className={compact ? "size-9" : "size-10"} />
          {!compact && <span>{t("a11y.title")}</span>}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 text-xl">
            <AccessIcon className="size-10" /> {t("a11y.title")}
          </SheetTitle>
          <SheetDescription>{t("a11y.lead")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-8">
          <section aria-labelledby="a11y-lang">
            <h3 id="a11y-lang" className="mb-2 font-semibold">
              {t("a11y.language")}
            </h3>
            <div role="radiogroup" aria-labelledby="a11y-lang" className="grid grid-cols-2 gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  role="radio"
                  aria-checked={prefs.lang === l.code}
                  lang={`${l.code}-ZA`}
                  onClick={() => set({ lang: l.code })}
                  className={cn(
                    "min-h-12 rounded-lg border px-3 text-left font-medium",
                    prefs.lang === l.code ? "border-primary bg-accent text-foreground ring-2 ring-primary" : "border-border hover:bg-muted",
                  )}
                >
                  {l.name}
                </button>
              ))}
            </div>
            {prefs.lang !== "en" && <p className="mt-2 text-xs text-muted-foreground">{t("a11y.aiNote")}</p>}
          </section>

          <section aria-labelledby="a11y-size">
            <h3 id="a11y-size" className="mb-2 font-semibold">
              {t("a11y.textSize")}
            </h3>
            <div role="radiogroup" aria-labelledby="a11y-size" className="grid grid-cols-3 gap-2">
              {(["A", "A+", "A++"] as const).map((label, i) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={prefs.textSize === i}
                  aria-label={["Normal text", "Larger text", "Largest text"][i]}
                  onClick={() => set({ textSize: i as 0 | 1 | 2 })}
                  className={cn(
                    "min-h-12 rounded-lg border font-semibold",
                    ["text-base", "text-lg", "text-xl"][i],
                    prefs.textSize === i ? "border-primary bg-accent ring-2 ring-primary" : "border-border hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border px-3">
            <Row label={t("a11y.contrast")}>
              <Switch checked={prefs.contrast} onCheckedChange={(v) => set({ contrast: v })} aria-label={t("a11y.contrast")} />
            </Row>
            <Row label={t("a11y.listen")} hint={t("a11y.sound")}>
              <Switch checked={prefs.listen} onCheckedChange={(v) => set({ listen: v })} aria-label={t("a11y.listen")} />
            </Row>
            <Row label={t("a11y.motion")}>
              <Switch checked={prefs.reduceMotion} onCheckedChange={(v) => set({ reduceMotion: v })} aria-label={t("a11y.motion")} />
            </Row>
          </section>

          <section aria-labelledby="a11y-sasl" className="rounded-xl border border-dashed border-border p-3">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Hand className="size-6" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h3 id="a11y-sasl" className="flex flex-wrap items-center gap-2 font-semibold">
                  {t("a11y.sasl")}
                  <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold tracking-wide text-warn uppercase">Coming</span>
                </h3>
                <p className="text-sm text-muted-foreground">{t("a11y.saslComing")}</p>
              </div>
            </div>
            <Row label={t("a11y.saslPreview")} hint="A stylised figure, not real signing.">
              <Switch checked={sasl} onCheckedChange={toggleSasl} aria-label={t("a11y.saslPreview")} />
            </Row>
          </section>

          <section aria-labelledby="a11y-speak">
            <h3 id="a11y-speak" className="mb-2 font-semibold">
              🎤 {t("a11y.speak")}
            </h3>
            <SpeakToGcina onNavigate={() => setOpen(false)} />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
