"use client";

// SASL concept preview + read-aloud voice.
//
// Sign language: NOT real sign language. A stylised 3D signer that shows WHERE a future South African
// Sign Language avatar would sit and WHAT it would sign. Turn it on, then hover (or tap, or tab to) any
// text: the text is outlined, each word lights up on the page in turn, and the figure makes a distinct
// hand shape + movement for that word. The gestures are made up (seeded from the word) so the demo is
// consistent; the real avatar is roadmap work with a Deaf-community partner, and the labels say so.
//
// Voice: optional. Reads the same text aloud with the device's own speech voices, in the language the
// viewer picks (it starts on the app language from the accessibility sheet). Non-English text is
// translated by /api/translate (Claude) first and always shown on screen too. If the device has no voice
// for that language we say so and show the text: we never read English while claiming it's isiZulu.
//
// Size: four sizes, remembered on this device.

import { Hand, Languages, RotateCcw, Snail, Volume2, VolumeX, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Cue } from "./sasl-avatar/motion";
import type { mountAvatar } from "./sasl-avatar/scene";
import { usePrefs } from "@/components/a11y/prefs";

const BLOCKS = "h1,h2,h3,h4,h5,h6,p,li,td,th,label,button,a,dt,dd,figcaption,legend,summary,[role=button],[data-sasl]";
const SKIP = "[data-sasl-ignore],script,style,svg,canvas,input,textarea,select,[aria-hidden=true]";
const MAX_WORDS = 28;
const HOVER_MS = 140;

type Word = { text: string; node: Text; start: number; end: number };

// ---------- remembered preferences (this device only; the panel works without them) ----------

const PREF = "gcina:sasl:";
function loadPref(key: string): string | null {
  try {
    return window.localStorage.getItem(PREF + key);
  } catch {
    return null;
  }
}
function savePref(key: string, value: string) {
  try {
    window.localStorage.setItem(PREF + key, value);
  } catch {
    /* private window or blocked storage: fine, it just won't be remembered */
  }
}

// ---------- sizes ----------

const SIZES = [
  { id: "s", label: "Small", w: 132, h: 158 },
  { id: "m", label: "Medium", w: 164, h: 196 },
  { id: "l", label: "Large", w: 220, h: 262 },
  { id: "xl", label: "Extra large", w: 290, h: 346 },
] as const;

// ---------- languages ----------

type Lang = { code: string; label: string; group: "za" | "more" | "device" };
const LANGS: Lang[] = [
  { code: "en-ZA", label: "English", group: "za" },
  { code: "zu-ZA", label: "isiZulu", group: "za" },
  { code: "xh-ZA", label: "isiXhosa", group: "za" },
  { code: "af-ZA", label: "Afrikaans", group: "za" },
  { code: "nso-ZA", label: "Sepedi", group: "za" },
  { code: "tn-ZA", label: "Setswana", group: "za" },
  { code: "st-ZA", label: "Sesotho", group: "za" },
  { code: "ts-ZA", label: "Xitsonga", group: "za" },
  { code: "ss-ZA", label: "siSwati", group: "za" },
  { code: "ve-ZA", label: "Tshivenḓa", group: "za" },
  { code: "nr-ZA", label: "isiNdebele", group: "za" },
  { code: "sw-KE", label: "Kiswahili", group: "more" },
  { code: "sn-ZW", label: "chiShona", group: "more" },
  { code: "ny-MW", label: "Chichewa", group: "more" },
  { code: "pt-PT", label: "Português", group: "more" },
  { code: "fr-FR", label: "Français", group: "more" },
  { code: "es-ES", label: "Español", group: "more" },
  { code: "de-DE", label: "Deutsch", group: "more" },
  { code: "ar", label: "العربية (Arabic)", group: "more" },
  { code: "hi-IN", label: "हिन्दी (Hindi)", group: "more" },
  { code: "zh-CN", label: "中文 (Chinese)", group: "more" },
];
const LANG_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const base = (code: string) => code.toLowerCase().split(/[-_]/)[0];
const isEnglish = (code: string) => base(code) === "en";

/** A voice that really speaks this language. English may use any English voice; other languages must match. */
function voiceFor(code: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const norm = (s: string) => s.toLowerCase().replace("_", "-");
  const exact = voices.find((v) => norm(v.lang) === norm(code));
  if (exact) return exact;
  const b = base(code);
  const same = voices.filter((v) => base(v.lang) === b);
  return same.find((v) => v.localService) ?? same[0] ?? null;
}

// ---------- picking text on the page ----------

function hasOwnText(el: Element) {
  for (const n of el.childNodes) if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) return true;
  return false;
}

/** The sentence-sized element under the pointer: a heading/paragraph/button/link if there is one, else the nearest element with its own text (amounts in cards, badges…). */
function pickTarget(t: Element): Element | null {
  if (t.closest(SKIP)) return null;
  const block = t.closest(BLOCKS);
  if (block) return block;
  for (let el: Element | null = t, i = 0; el && el !== document.body && i < 4; el = el.parentElement, i++) {
    if (hasOwnText(el)) return el;
  }
  return null;
}

function wordsIn(el: Element): Word[] {
  const out: Word[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walk.nextNode() as Text | null; n && out.length < MAX_WORDS; n = walk.nextNode() as Text | null) {
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(n.data)) && out.length < MAX_WORDS) out.push({ text: m[0], node: n, start: m.index, end: m.index + m[0].length });
  }
  return out;
}

const canHighlight = () => typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";

/** Lights up one word in the page itself (CSS Custom Highlight API: no DOM changes). */
function markWord(w: Word | undefined) {
  if (!canHighlight()) return;
  if (!w || !w.node.isConnected || w.end > w.node.length) {
    CSS.highlights.delete("sasl-word");
    return;
  }
  const r = new Range();
  r.setStart(w.node, w.start);
  r.setEnd(w.node, w.end);
  CSS.highlights.set("sasl-word", new Highlight(r));
}

/** How long a word is "signed" for. Numbers are finger-spelled (slower), punctuation adds a pause. */
function wordMs(w: string) {
  const core = /\d/.test(w) ? 320 + 110 * Math.min(w.length, 7) : 380 + 32 * Math.min(w.length, 12);
  return core + (/[.,!?;:]$/.test(w) ? 220 : 0);
}

// ---------- component ----------

type VoiceNote = { tone: "info" | "warn"; text: string } | null;

export function SaslPreview() {
  const { speechLang } = usePrefs();
  const [on, setOn] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [current, setCurrent] = useState(-1);
  const [run, setRun] = useState(0);
  const [slow, setSlow] = useState(false);
  const [sizeIx, setSizeIx] = useState(1);
  const [viewW, setViewW] = useState(1024);
  // "sign": the 3D signer (voice optional). "voice": no figure, just read-aloud in the chosen language.
  const [mode, setMode] = useState<"sign" | "voice">("sign");
  const [voicePref, setVoiceOn] = useState(false);
  const [chosenLang, setChosenLang] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [spoken, setSpoken] = useState<{ text: string; label: string } | null>(null);
  const [note, setNote] = useState<VoiceNote>(null);

  const active = useRef<Element | null>(null);
  const wordRefs = useRef<Word[]>([]);
  const cue = useRef<Cue | null>(null);
  const waving = useRef(true);
  const speechDriven = useRef(false);
  const speakingForAvatar = useRef(false);
  const mount = useRef<HTMLDivElement | null>(null);
  const avatarScene = useRef<ReturnType<typeof mountAvatar> | null>(null);
  const translations = useRef(new Map<string, string>());

  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const signing = mode === "sign";
  const voiceOn = mode === "voice" || voicePref;
  // The panel's own choice wins; otherwise follow the app language from the accessibility sheet.
  const lang = chosenLang ?? speechLang;

  // Remembered preferences.
  useEffect(() => {
    const s = SIZES.findIndex((x) => x.id === loadPref("size"));
    if (s >= 0) setSizeIx(s);
    setVoiceOn(loadPref("voice") === "on");
    const l = loadPref("lang");
    if (l && LANG_CODE.test(l)) setChosenLang(l);
    const onResize = () => setViewW(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The device's voices arrive asynchronously in most browsers.
  useEffect(() => {
    if (!canSpeak) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [canSpeak]);

  const size = SIZES[sizeIx];
  // Never wider than the phone: keep 16px gutters plus the panel's padding.
  const stage = useMemo(() => {
    const w = Math.min(size.w, Math.max(110, viewW - 56));
    return { w, h: Math.round((w * size.h) / size.w) };
  }, [size, viewW]);
  const stacked = signing && sizeIx >= 2;

  const langOptions = useMemo(() => {
    const known = new Set(LANGS.map((l) => base(l.code)));
    const extra: Lang[] = [];
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames(["en"], { type: "language" });
    } catch {
      names = null;
    }
    for (const v of voices) {
      const b = base(v.lang);
      if (!b || known.has(b)) continue;
      known.add(b);
      const code = v.lang.replace("_", "-");
      let label = code;
      try {
        label = names?.of(code) ?? code;
      } catch {
        /* keep the code */
      }
      extra.push({ code, label, group: "device" });
    }
    extra.sort((a, b) => a.label.localeCompare(b.label));
    const all = [...LANGS, ...extra];
    // A language picked earlier on another device may not be listed here: keep it selectable.
    if (!all.some((l) => l.code === lang)) all.push({ code: lang, label: lang, group: "device" });
    return all;
  }, [voices, lang]);
  const langLabel = langOptions.find((l) => l.code === lang)?.label ?? lang;

  const toggle = useCallback(() => setOn((v) => !v), []);
  const openAs = (m: "sign" | "voice") => {
    setMode(m);
    setOn(true);
  };

  // The accessibility sheet (W5) switches the preview with a window event, and mirrors its state.
  useEffect(() => {
    const set = (e: Event) => {
      const v = Boolean((e as CustomEvent<{ on: boolean }>).detail?.on);
      if (v) setMode("sign");
      setOn(v);
    };
    window.addEventListener("gcina:sasl", set);
    return () => window.removeEventListener("gcina:sasl", set);
  }, []);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("gcina:sasl-state", { detail: { on: on && signing } }));
  }, [on, signing]);

  const replay = useCallback(() => {
    setCurrent(0);
    setRun((n) => n + 1);
  }, []);
  const resize = (d: number) => {
    const n = Math.max(0, Math.min(SIZES.length - 1, sizeIx + d));
    setSizeIx(n);
    savePref("size", SIZES[n].id);
  };
  const toggleVoice = () => {
    const next = !voicePref;
    setVoiceOn(next);
    savePref("voice", next ? "on" : "off");
    if (!next && canSpeak) window.speechSynthesis.cancel();
  };
  const chooseLang = (code: string) => {
    setChosenLang(code);
    savePref("lang", code);
  };

  // Pick up the text under the pointer (or keyboard focus) and outline it.
  useEffect(() => {
    if (!on) return;
    let timer = 0;
    const choose = (t: Element) => {
      const el = pickTarget(t);
      if (!el || el === active.current) return;
      const ws = wordsIn(el);
      if (!ws.length) return;
      active.current?.classList.remove("sasl-highlight");
      el.classList.add("sasl-highlight");
      active.current = el;
      wordRefs.current = ws;
      setWords(ws.map((w) => w.text));
      setCurrent(0);
      setRun((n) => n + 1);
    };
    const over = (e: PointerEvent) => {
      if (!(e.target instanceof Element)) return;
      const t = e.target;
      window.clearTimeout(timer);
      // a short wait for the mouse so sweeping across the page doesn't flicker; touch is instant
      timer = window.setTimeout(() => choose(t), e.pointerType === "mouse" ? HOVER_MS : 0);
    };
    const focus = (e: FocusEvent) => e.target instanceof Element && choose(e.target);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOn(false);
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("focusin", focus);
    document.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("keydown", key);
      active.current?.classList.remove("sasl-highlight");
      active.current = null;
      wordRefs.current = [];
      cue.current = null;
      markWord(undefined);
      setWords([]);
      setCurrent(-1);
      setSpoken(null);
      setNote(null);
    };
  }, [on]);

  // Step through the words like a signer would; light each one up on the page.
  // While an English voice is reading, the voice's word boundaries drive this instead of the timer.
  useEffect(() => {
    waving.current = words.length === 0;
    const w = words[current];
    if (w === undefined) {
      cue.current = null;
      markWord(undefined);
      avatarScene.current?.update();
      return;
    }
    const dur = wordMs(w) * (slow ? 1.7 : 1);
    cue.current = { word: w, start: performance.now(), dur };
    markWord(wordRefs.current[current]);
    avatarScene.current?.update();
    if (speechDriven.current) return;
    const t = setTimeout(() => setCurrent((c) => c + 1), dur);
    return () => clearTimeout(t);
  }, [current, words, slow, run]);

  // Read it aloud (optional).
  useEffect(() => {
    speechDriven.current = false;
    if (!on || !voiceOn || !canSpeak || !words.length) {
      if (canSpeak) window.speechSynthesis.cancel();
      return;
    }
    const synth = window.speechSynthesis;
    const text = words.join(" ");
    let cancelled = false;
    let watchdog = 0;

    const say = (line: string, voice: SpeechSynthesisVoice, followWords: boolean) => {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(line);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = slow ? 0.78 : 1;
      // The existing utterance supplies playback state to the character.
      u.addEventListener("start", () => { if (!cancelled) speakingForAvatar.current = true; });
      const stopMouth = () => { if (!cancelled) speakingForAvatar.current = false; };
      u.addEventListener("end", stopMouth);
      u.addEventListener("error", stopMouth);
      if (followWords) {
        // Map the voice's position back to the word on the page, so the highlight and the signer follow the voice.
        const starts: number[] = [];
        let at = 0;
        for (const w of words) {
          starts.push(at);
          at += w.length + 1;
        }
        let heard = false;
        u.onboundary = (e) => {
          if (cancelled || e.name !== "word") return;
          if (!heard) {
            heard = true;
            speechDriven.current = true;
          }
          let i = 0;
          while (i + 1 < starts.length && starts[i + 1] <= e.charIndex) i++;
          setCurrent(i);
        };
        // Some voices never report word boundaries: the timer keeps stepping instead.
        watchdog = window.setTimeout(() => {
          if (!heard && !cancelled) speechDriven.current = false;
        }, 1200);
        u.onend = () => {
          if (cancelled || !heard) return;
          speechDriven.current = false;
          setCurrent(words.length);
        };
      }
      u.onerror = () => {
        if (!cancelled) speechDriven.current = false;
      };
      synth.speak(u);
    };

    (async () => {
      if (isEnglish(lang)) {
        const v = voiceFor(lang, voices) ?? voiceFor("en-GB", voices) ?? voiceFor("en-US", voices);
        setSpoken({ text, label: "English" });
        if (!v) {
          setNote({ tone: "warn", text: "This device has no English voice, so the text is shown instead." });
          return;
        }
        setNote(null);
        say(text, v, true);
        return;
      }
      // Another language: translate first (owner sign-in only), always show the text, speak only with a real voice.
      const key = `${lang}\n${text}`;
      let out = translations.current.get(key) ?? null;
      let why = "";
      if (!out) {
        setNote({ tone: "info", text: `Translating into ${langLabel}…` });
        try {
          const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
          const json = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
          if (res.ok && json.text) {
            out = json.text;
            translations.current.set(key, out);
          } else {
            why = json.error ?? `the translator answered ${res.status}`;
          }
        } catch {
          why = "the translator couldn't be reached";
        }
      }
      if (cancelled) return;
      if (!out) {
        const english = voiceFor("en-ZA", voices) ?? voiceFor("en-GB", voices) ?? voiceFor("en-US", voices);
        setSpoken({ text, label: "English" });
        setNote({ tone: "warn", text: `No ${langLabel} translation: ${why.replace(/\.$/, "")}. ${english ? "Reading it in English instead." : "Showing the English text."}` });
        if (english) say(text, english, true);
        return;
      }
      setSpoken({ text: out, label: `${langLabel} · AI translation, being checked` });
      const v = voiceFor(lang, voices);
      if (!v) {
        setNote({ tone: "warn", text: `There's no ${langLabel} voice on this device yet, so the translation is shown as text.` });
        return;
      }
      setNote(null);
      say(out, v, false);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      speechDriven.current = false;
      speakingForAvatar.current = false;
      synth.cancel();
    };
    // `slow` and the label only matter for the next reading; don't restart mid-sentence for them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, voiceOn, lang, words, run, voices, canSpeak]);

  // The 3D signer (sign mode only; voice-only mode never starts WebGL).
  useEffect(() => {
    const host = mount.current;
    if (!on || !signing || !host) return;
    let closed = false;
    const unavailable = () => {
      if (!closed) host.textContent = "3D isn't available on this device.";
    };
    import("./sasl-avatar/scene").then(({ mountAvatar }) => {
      if (closed) return;
      avatarScene.current = mountAvatar(host, () => ({
        cue: cue.current,
        waving: waving.current,
        speaking: speakingForAvatar.current,
      }), unavailable);
    }).catch(unavailable);
    return () => {
      closed = true;
      avatarScene.current?.dispose();
      avatarScene.current = null;
    };
  }, [on, signing]);

  const done = words.length > 0 && current >= words.length;
  const chip = "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-medium focus-visible:outline-3 focus-visible:outline-amber-400 disabled:opacity-40";
  const chipOff = "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10";
  const chipOn = "border-teal-700 bg-teal-700 text-white";
  const zoomBtn =
    "inline-flex size-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow ring-1 ring-black/10 hover:bg-white focus-visible:outline-3 focus-visible:outline-amber-400 disabled:opacity-40 dark:bg-slate-800/90 dark:text-slate-100";
  const panelW = stacked ? stage.w + 26 : signing ? 320 : 300;
  const launcher =
    "inline-flex size-12 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-white/70 focus-visible:outline-3 focus-visible:outline-amber-400";
  const tab = (active: boolean) =>
    `inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold focus-visible:outline-3 focus-visible:outline-amber-400 ${
      active ? "bg-white text-teal-800 shadow dark:bg-slate-700 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
    }`;
  const voiceHint = (code: string) => (isEnglish(code) || !canSpeak || voiceFor(code, voices) ? "" : " (text only on this device)");

  return (
    <>
      <style>{`.sasl-highlight{outline:2px dashed #f59e0b;outline-offset:3px;border-radius:6px;background:color-mix(in srgb,#fde68a 35%,transparent)}::highlight(sasl-word){background-color:#fbbf24;color:#0f172a}`}</style>
      {!on ? (
        <div data-sasl-ignore className="fixed right-3 bottom-28 z-50 flex flex-col gap-2 md:bottom-6">
          <button
            type="button"
            onClick={() => openAs("voice")}
            aria-label="Read aloud: hear any text on screen, in your language"
            title="Read aloud (voice only)"
            className={`${launcher} bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800`}
          >
            <Volume2 className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openAs("sign")}
            aria-label="Sign language preview"
            title="Sign language preview"
            className={`${launcher} bg-gradient-to-br from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900`}
          >
            <Hand className="size-6" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div
          data-sasl-ignore
          role="complementary"
          aria-label="Sign language and read-aloud"
          style={{ width: `min(${panelW}px, calc(100vw - 1.5rem))` }}
          className="fixed right-3 bottom-28 z-50 max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl border border-black/10 bg-white p-3 text-slate-900 shadow-2xl md:bottom-6 md:max-h-[calc(100dvh-3rem)] dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{signing ? "🤟 SASL avatar · concept preview" : "🔊 Read aloud"}</p>
            <button
              type="button"
              onClick={toggle}
              aria-label="Close (Esc)"
              className="-m-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-3 focus-visible:outline-amber-400 dark:hover:bg-white/10"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div role="group" aria-label="How should I help?" className="mt-2 flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
            <button type="button" aria-pressed={signing} onClick={() => setMode("sign")} className={tab(signing)}>
              <Hand className="size-4" aria-hidden="true" />
              Sign language
            </button>
            <button type="button" aria-pressed={!signing} onClick={() => setMode("voice")} className={tab(!signing)}>
              <Volume2 className="size-4" aria-hidden="true" />
              Voice only
            </button>
          </div>

          <div className={`mt-2 flex gap-3 ${stacked ? "flex-col items-center" : "items-center"}`}>
            {signing && (
            <div className="relative shrink-0">
              <div
                ref={mount}
                style={{ width: stage.w, height: stage.h }}
                className="overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_38%,#ccfbf1_0%,#f0fdfa_45%,#ffffff_80%)] ring-1 ring-teal-900/10 dark:bg-[radial-gradient(circle_at_50%_38%,#134e4a_0%,#0f2a2a_50%,#0f172a_85%)] dark:ring-white/10"
              />
              <div className="absolute right-1 bottom-1 flex gap-1">
                <button type="button" onClick={() => resize(-1)} disabled={sizeIx === 0} aria-label="Make the signer smaller" title="Smaller" className={zoomBtn}>
                  <ZoomOut className="size-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => resize(1)} disabled={sizeIx === SIZES.length - 1} aria-label="Make the signer bigger" title="Bigger" className={zoomBtn}>
                  <ZoomIn className="size-4" aria-hidden="true" />
                </button>
              </div>
              <span className="sr-only" aria-live="polite">
                Signer size: {size.label}
              </span>
            </div>
            )}

            <div className={`min-w-0 text-sm ${stacked || !signing ? "w-full" : ""}`} aria-live="polite">
              {words.length ? (
                <p className={`leading-snug ${sizeIx === 3 ? "text-base" : ""}`}>
                  {words.map((w, i) => (
                    <span key={i} className={i === current ? "rounded bg-amber-300 px-0.5 font-semibold text-slate-900" : i < current ? "text-slate-500 dark:text-slate-400" : ""}>
                      {w}{" "}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="text-slate-600 dark:text-slate-300">
                  {signing
                    ? `Hover over, tap or tab to any text and I'll sign it, word by word${voiceOn ? `, and read it aloud in ${langLabel}` : ""}.`
                    : `Hover over, tap or tab to any text and I'll read it aloud in ${langLabel}. Pick another language below.`}
                </p>
              )}
            </div>
          </div>

          {voiceOn && spoken && spoken.label !== "English" && (
            <div className="mt-2 rounded-xl bg-teal-50 p-2 text-sm dark:bg-teal-950/60">
              <p className="text-[11px] font-medium tracking-wide text-teal-800 uppercase dark:text-teal-300">{spoken.label}</p>
              <p className="mt-0.5 leading-snug" lang={lang}>
                {spoken.text}
              </p>
            </div>
          )}
          {voiceOn && note && (
            <p role="status" className={`mt-2 text-xs leading-snug ${note.tone === "warn" ? "text-amber-800 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"}`}>
              {note.text}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={replay} disabled={!words.length} className={`${chip} ${chipOff}`}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {done ? "Again" : "Replay"}
            </button>
            <button type="button" onClick={() => setSlow((s) => !s)} aria-pressed={slow} className={`${chip} ${slow ? chipOn : chipOff}`}>
              <Snail className="size-4" aria-hidden="true" />
              Slower
            </button>
            {canSpeak && signing && (
              <button type="button" onClick={toggleVoice} aria-pressed={voiceOn} className={`${chip} ${voiceOn ? chipOn : chipOff}`}>
                {voiceOn ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
                Read aloud
              </button>
            )}
          </div>

          {canSpeak && voiceOn && (
            <label className="mt-2 flex items-center gap-2 text-xs">
              <Languages className="size-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden="true" />
              <span className="shrink-0 font-medium">Language</span>
              <select
                value={lang}
                onChange={(e) => chooseLang(e.target.value)}
                className="min-h-10 min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-2 text-sm dark:border-white/15 dark:bg-slate-800"
              >
                <optgroup label="South Africa">
                  {langOptions
                    .filter((l) => l.group === "za")
                    .map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                        {voiceHint(l.code)}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="More languages">
                  {langOptions
                    .filter((l) => l.group === "more")
                    .map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                        {voiceHint(l.code)}
                      </option>
                    ))}
                </optgroup>
                {langOptions.some((l) => l.group === "device") && (
                  <optgroup label="Other voices on this device">
                    {langOptions
                      .filter((l) => l.group === "device")
                      .map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </label>
          )}

          {!canSpeak && !signing && (
            <p role="status" className="mt-2 text-xs leading-snug text-amber-800 dark:text-amber-300">
              This browser can&apos;t read aloud. Try Chrome, Edge, Safari or Samsung Internet.
            </p>
          )}
          <p className="mt-2 text-xs leading-snug text-slate-600 dark:text-slate-300">
            {signing ? "Not real sign language yet: the hand shapes are placeholders. Coming: a South African Sign Language avatar, built and checked with a Deaf-community partner." : ""}
            {voiceOn ? `${signing ? " " : ""}Read-aloud uses your device's own voices; translations are by AI and still being checked.` : ""}
          </p>
        </div>
      )}
    </>
  );
}
