"use client";

import { Mic, MicOff, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LANGS } from "@/lib/i18n/messages";
import { usePrefs } from "./prefs";
import { recognitionCtor, speak } from "./speech";

// Small, honest voice control: a handful of commands, the answer always shown as text,
// and a typed fallback when the phone can't listen in the chosen language.
const COMMANDS: { re: RegExp; href?: string; say: string }[] = [
  { re: /approv|waiting|vuma|goedkeur|izivumelwano/i, href: "/approvals", say: "Opening Approvals." },
  { re: /overview|home|ekhaya|oorsig|tuis|isishwankathelo/i, href: "/", say: "Opening the Overview." },
  { re: /invoice|faktu|invoyisi/i, href: "/invoices", say: "Opening Invoices." },
  { re: /supplier|verskaff|abahlinzeki|ababoneleli/i, href: "/suppliers", say: "Opening Suppliers." },
  { re: /limit|limiet|imikhawulo|imida/i, href: "/limits", say: "Opening Limits." },
  { re: /how (does|it)|how it works|hoe werk|isebenza/i, href: "/how-it-works", say: "Opening How it works." },
];

export function SpeakToGcina({ onNavigate }: { onNavigate?: () => void }) {
  const { prefs, speechLang } = usePrefs();
  const { approvals } = useData();
  const router = useRouter();
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState("");
  const [typed, setTyped] = useState("");
  const rec = useRef<{ stop: () => void } | null>(null);
  const langName = LANGS.find((l) => l.code === prefs.lang)?.name ?? "English";

  useEffect(() => {
    // Feature-detect after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanListen(recognitionCtor() !== null);
    return () => rec.current?.stop();
  }, []);

  // Every answer is shown as text (in the sheet AND as a toast, which survives navigation).
  const reply = (text: string) => {
    setAnswer(text);
    toast.message(text);
    if (prefs.listen) speak(text, "en-ZA");
  };
  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  const act = (said: string) => {
    setHeard(said);
    const waiting = approvals?.filter((a) => a.status === "pending").length ?? 0;
    // Questions first ("what is waiting?" must answer, not just open a page).
    if (/\b(what|status|anything|any|kukhona|wat|yini)\b|\?/i.test(said)) {
      if (waiting === 0) return reply("Nothing is waiting for you. The agent is handling the rest.");
      reply(`${waiting} ${waiting === 1 ? "payment is" : "payments are"} waiting for you to approve. Opening Approvals.`);
      return go("/approvals");
    }
    const c = COMMANDS.find((x) => x.re.test(said));
    if (!c) return reply('Try "approvals", "overview", "invoices", or "what is waiting?"');
    reply(c.say);
    if (c.href) go(c.href);
  };

  const listen = () => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = new Ctor();
    r.lang = speechLang;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => act(e.results[0]?.[0]?.transcript ?? "");
    r.onerror = (e) =>
      setAnswer(
        e.error === "language-not-supported"
          ? `This phone can't listen in ${langName} yet. Type instead.`
          : e.error === "not-allowed" || e.error === "service-not-allowed"
            ? "The microphone is blocked for this site. Type instead."
            : e.error === "no-speech"
              ? "I didn't hear anything. Try again, or type."
              : "Listening didn't work this time. Type instead.",
      );
    r.onend = () => setListening(false);
    rec.current = r;
    setAnswer("");
    setListening(true);
    r.start();
  };

  return (
    <div className="flex flex-col gap-3">
      {canListen ? (
        <Button type="button" size="lg" variant={listening ? "default" : "outline"} onClick={listen} aria-pressed={listening}>
          {listening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
          {listening ? "Listening… tap to stop" : `Speak (${langName})`}
        </Button>
      ) : (
        <p className="rounded-lg bg-muted p-3 text-sm">Speaking to Gcina isn&apos;t available on this phone yet. Type instead.</p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.trim()) act(typed.trim());
          setTyped("");
        }}
      >
        <label htmlFor="speak-typed" className="sr-only">
          Or type a command
        </label>
        <Input id="speak-typed" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder='e.g. "what is waiting?"' className="h-11" />
        <Button type="submit" size="icon" className="size-11 shrink-0" aria-label="Send">
          <Send aria-hidden="true" />
        </Button>
      </form>
      <div aria-live="polite" className="text-sm">
        {heard && (
          <p className="text-muted-foreground">
            You said: <span className="text-foreground">&ldquo;{heard}&rdquo;</span>
          </p>
        )}
        {answer && <p className="font-medium">{answer}</p>}
      </div>
    </div>
  );
}
