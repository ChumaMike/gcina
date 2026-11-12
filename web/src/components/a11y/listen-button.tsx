"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LANGS } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { usePrefs } from "./prefs";
import { speak, speechSupported, stopSpeaking } from "./speech";

/**
 * "Listen": a voice note of the explanation, via the browser's own speech.
 * The same words are always on screen next to it, so nothing depends on hearing it.
 */
export function ListenButton({ text, className }: { text: string; className?: string }) {
  const { prefs, t, speechLang } = usePrefs();
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  // Feature-detect after hydration (the server can't know).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(speechSupported());
    return () => stopSpeaking();
  }, []);

  if (!prefs.listen || !supported) return null;

  const toggle = () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    const r = speak(text, speechLang, () => setPlaying(false));
    setPlaying(true);
    const name = LANGS.find((l) => l.code === prefs.lang)?.name ?? "this language";
    setNote(r.fellBack ? `No ${name} voice on this device yet, so it reads in English. The text is shown.` : null);
  };

  return (
    <span className={cn("inline-flex flex-col", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {playing ? <Square className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
        {playing ? t("stop") : t("listen")}
      </button>
      {note && (
        <span role="status" className="text-xs text-muted-foreground">
          {note}
        </span>
      )}
    </span>
  );
}
