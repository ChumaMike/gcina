/** Browser speech owns audio only after an explicit Listen/Replay action.
 * A generation token makes late callbacks from cancelled utterances harmless.
 * Boundary events are the sole source of spoken-word timing; no guessed clock.
 */
export type SpeechStatus = "idle" | "starting" | "speaking" | "paused" | "error" | "unsupported";
export type SpeechState = { status: SpeechStatus; word: number; message: string; timed: boolean };
export type SpeechSettings = { voiceURI?: string; rate?: number };
type SpeechPort = Pick<SpeechSynthesis, "speak" | "cancel" | "pause" | "resume" | "getVoices">;
export const initialSpeech: SpeechState = { status: "idle", word: -1, message: "Audio plays only when you press Listen.", timed: false };

export function preferredVoice(voices: SpeechSynthesisVoice[]) {
  return voices.find((v) => /^en[-_]ZA$/i.test(v.lang)) ?? voices.find((v) => /^en\b/i.test(v.lang) && v.localService) ?? voices.find((v) => /^en\b/i.test(v.lang)) ?? voices.find((v) => v.default) ?? voices[0];
}

export function createSpeechController(
  port: SpeechPort | undefined,
  notify: (state: SpeechState) => void,
  makeUtterance: (text: string) => SpeechSynthesisUtterance = (text) => new SpeechSynthesisUtterance(text),
) {
  let state: SpeechState = port ? { ...initialSpeech } : { ...initialSpeech, status: "unsupported", message: "Read aloud is unavailable in this browser. Your selected text remains available." };
  let generation = 0, disposed = false, active = false;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let timing: ReturnType<typeof setTimeout> | undefined;
  let current: SpeechSynthesisUtterance | undefined;
  const publish = (next: Partial<SpeechState>) => { state = { ...state, ...next }; if (!disposed) notify(state); };
  const clearTimers = () => { clearTimeout(watchdog); clearTimeout(timing); };
  function cancel() {
    generation++;
    clearTimers();
    if (current) current.onstart = current.onend = current.onerror = current.onboundary = current.onpause = current.onresume = null;
    current = undefined;
    if (active) { active = false; port?.cancel(); }
  }
  function stop(message = initialSpeech.message) {
    cancel();
    publish({ status: port ? "idle" : "unsupported", word: -1, timed: false, message: port ? message : state.message });
  }
  function listen(text: string, settings: SpeechSettings = {}) {
    if (disposed || !port || !text.trim()) return;
    cancel();
    const token = generation;
    const valid = () => !disposed && token === generation;
    const words = [...text.matchAll(/\S+/g)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
    let lastIndex = -1;
    try {
      const utterance = makeUtterance(text);
      current = utterance;
      const voices = port.getVoices();
      const voice = voices.find((v) => v.voiceURI === settings.voiceURI) ?? preferredVoice(voices);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? "en-ZA";
      utterance.rate = Math.max(0.5, Math.min(1.5, settings.rate ?? 1));
      utterance.onstart = () => {
        if (!valid()) return;
        clearTimeout(watchdog);
        publish({ status: "speaking", message: "Reading aloud. Mouth movement is approximate." });
        timing = setTimeout(() => {
          if (valid() && !state.timed) publish({ message: "Reading aloud. This voice does not provide word timing; all text stays visible." });
        }, 1200);
      };
      utterance.onboundary = (event) => {
        if (!valid() || state.status !== "speaking" || event.name !== "word" || !Number.isInteger(event.charIndex) || event.charIndex < lastIndex || event.charIndex >= text.length) return;
        const word = words.findIndex((w) => event.charIndex >= w.start && event.charIndex < w.end);
        if (word < 0) return;
        lastIndex = event.charIndex;
        publish({ word, timed: true, message: "Reading aloud. Mouth movement is approximate." });
      };
      utterance.onend = () => {
        if (!valid()) return;
        clearTimers(); active = false; current = undefined;
        publish({ status: "idle", word: words.length, message: "Finished reading. Replay to listen again." });
      };
      utterance.onerror = (event) => {
        if (!valid()) return;
        clearTimers(); active = false; current = undefined;
        publish({ status: "error", word: -1, message: event.error === "not-allowed" ? "Audio was blocked. Press Listen to try again." : "This voice could not play. Choose another installed voice or try again; your text is still available." });
      };
      publish({ status: "starting", word: -1, timed: false, message: "Starting voice…" });
      active = true;
      watchdog = setTimeout(() => {
        if (!valid()) return;
        cancel();
        publish({ status: "error", word: -1, message: "The voice did not start. Check your browser’s speech voices or choose another voice." });
      }, 10000);
      port.speak(utterance);
    } catch {
      cancel(); publish({ status: "error", word: -1, message: "Read aloud could not start. Your selected text is still available." });
    }
  }
  return {
    getState: () => state,
    listen,
    stop,
    pause() { if (active && state.status === "speaking") { port?.pause(); publish({ status: "paused", message: "Reading paused." }); } },
    resume() { if (active && state.status === "paused") { port?.resume(); publish({ status: "speaking", message: "Reading aloud. Mouth movement is approximate." }); } },
    dispose() { disposed = true; cancel(); },
  };
}
