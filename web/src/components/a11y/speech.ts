"use client";

// Browser speech, honest about what the device can do: we only claim a language is spoken
// when the device actually has a voice for it.

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function voices(): SpeechSynthesisVoice[] {
  return speechSupported() ? window.speechSynthesis.getVoices() : [];
}

/** Best voice for a BCP-47 tag like "zu-ZA": exact match, then same language, else null. */
export function voiceFor(tag: string): SpeechSynthesisVoice | null {
  const all = voices();
  const lower = tag.toLowerCase();
  const base = lower.split("-")[0];
  return all.find((v) => v.lang.toLowerCase() === lower) ?? all.find((v) => v.lang.toLowerCase().split(/[-_]/)[0] === base) ?? null;
}

export type SpeakResult = { spokenIn: string | null; fellBack: boolean };

/**
 * Speak `text`. Uses a voice for `tag` if the device has one, else an English (ideally en-ZA) voice,
 * and reports that it fell back so the UI can say "voice not available in this language yet".
 */
export function speak(text: string, tag: string, onEnd?: () => void): SpeakResult {
  if (!speechSupported()) return { spokenIn: null, fellBack: true };
  window.speechSynthesis.cancel();
  const want = voiceFor(tag);
  const english = voiceFor("en-ZA") ?? voiceFor("en-GB") ?? voiceFor("en-US");
  const voice = want ?? english;
  const u = new SpeechSynthesisUtterance(text);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = "en-ZA";
  }
  u.rate = 0.95;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return { spokenIn: voice?.lang ?? "en-ZA", fellBack: !want && !tag.toLowerCase().startsWith("en") };
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
