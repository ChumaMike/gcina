"use client";

import { useEffect, useRef, useState } from "react";
import { createSpeechController, initialSpeech, preferredVoice, type SpeechSettings } from "./speech";

export function useAvatarSpeech(onWord: (word: number) => void) {
  const [speech, setSpeech] = useState(initialSpeech);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const controller = useRef<ReturnType<typeof createSpeechController> | null>(null);
  const wordCallback = useRef(onWord);
  useEffect(() => { wordCallback.current = onWord; }, [onWord]);
  useEffect(() => {
    const port = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window ? window.speechSynthesis : undefined;
    const instance = createSpeechController(port, (next) => { setSpeech(next); wordCallback.current(next.word); });
    controller.current = instance;
    const refresh = () => {
      const available = port?.getVoices() ?? [];
      setVoices(available);
      setVoiceURI((selected) => available.some((v) => v.voiceURI === selected) ? selected : preferredVoice(available)?.voiceURI ?? "");
    };
    const timer = setTimeout(() => { refresh(); setSpeech(instance.getState()); }, 0);
    port?.addEventListener("voiceschanged", refresh);
    return () => { clearTimeout(timer); port?.removeEventListener("voiceschanged", refresh); instance.dispose(); controller.current = null; };
  }, []);
  const settings: SpeechSettings = { voiceURI, rate };
  return { speech, voices, voiceURI, setVoiceURI, rate, setRate,
    listen: (text: string, slower = false) => controller.current?.listen(text, { ...settings, rate: rate * (slower ? 0.75 : 1) }),
    stop: () => controller.current?.stop(),
    pause: () => controller.current?.pause(),
    resume: () => controller.current?.resume(),
  };
}
