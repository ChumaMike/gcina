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
import * as THREE from "three";
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

// ---------- made-up but consistent gestures ----------

type ArmPose = { sx: number; sz: number; ex: number; ez: number; wy: number; curl: number[] };
type Pose = { r: ArmPose; l: ArmPose; two: boolean; move: number; brow: number; spell: boolean };

// finger curls (index, middle, ring, little) + thumb: open B, fist A, point 1, V, Y, C, flat O
const SHAPES = [
  [0, 0, 0, 0, 0.2],
  [1, 1, 1, 1, 0.1],
  [0, 1, 1, 1, 0.9],
  [0, 0, 1, 1, 0.9],
  [1, 1, 1, 0, 0],
  [0.5, 0.5, 0.5, 0.5, 0.5],
  [0.8, 0.8, 0.8, 0.8, 0.7],
];
const REST: ArmPose = { sx: 0.05, sz: 0.1, ex: -0.25, ez: 0, wy: 0, curl: [0.3, 0.35, 0.4, 0.4, 0.3] };
const WEAK: ArmPose = { sx: -0.35, sz: 0.1, ex: -1.0, ez: 0, wy: 0.3, curl: [0.4, 0.4, 0.4, 0.4, 0.4] };
const WAVE: ArmPose = { sx: -0.2, sz: 2.4, ex: 0, ez: 0, wy: 0, curl: [0, 0, 0, 0, 0.2] };

function rng(word: string) {
  let h = 2166136261;
  for (const c of word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const poses = new Map<string, Pose>();
function poseFor(word: string): Pose {
  const hit = poses.get(word);
  if (hit) return hit;
  const r = rng(word);
  const spell = /\d/.test(word);
  const two = !spell && r() < 0.45;
  const shape = SHAPES[Math.floor(r() * SHAPES.length)];
  const dom: ArmPose = spell
    ? { sx: -1.25, sz: 0.25, ex: -1.2, ez: 0, wy: 0, curl: [0, 1, 1, 1, 0.9] }
    : { sx: -0.7 - r() * 0.8, sz: -0.4 + r() * 0.65, ex: -0.4 - r() * 1.2, ez: 0, wy: (r() - 0.5) * 1.4, curl: shape };
  const weak = two ? { ...dom, curl: r() < 0.6 ? shape : SHAPES[Math.floor(r() * SHAPES.length)] } : WEAK;
  const p: Pose = { r: dom, l: weak, two, move: r(), brow: word.endsWith("?") ? 1 : 0, spell };
  poses.set(word, p);
  return p;
}

// ---------- component ----------

type Cue = { word: string; start: number; dur: number };
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
  const mount = useRef<HTMLDivElement | null>(null);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const camera = useRef<THREE.PerspectiveCamera | null>(null);
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
      return;
    }
    const dur = wordMs(w) * (slow ? 1.7 : 1);
    cue.current = { word: w, start: performance.now(), dur };
    markWord(wordRefs.current[current]);
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
      synth.cancel();
    };
    // `slow` and the label only matter for the next reading; don't restart mid-sentence for them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, voiceOn, lang, words, run, voices, canSpeak]);

  // The 3D signer (sign mode only; voice-only mode never starts WebGL).
  useEffect(() => {
    if (!on || !signing || !mount.current) return;
    const host = mount.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let r: THREE.WebGLRenderer;
    try {
      r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      host.textContent = "3D isn't available on this device.";
      return;
    }
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    host.appendChild(r.domElement);
    r.domElement.setAttribute("aria-hidden", "true");
    r.domElement.style.display = "block";
    renderer.current = r;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, 164 / 196, 0.1, 50);
    cam.position.set(0, 0.5, 3.75);
    cam.lookAt(0, 0.4, 0);
    camera.current = cam;

    // Studio lighting: warm key, soft fill, teal rim so the hands stand out against the background.
    scene.add(new THREE.HemisphereLight(0xfff6ec, 0x1d3b38, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(2.2, 3, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffe2cc, 0.55);
    fill.position.set(-3, 1, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x5eead4, 1.5);
    rim.position.set(-1.5, 2.5, -3);
    scene.add(rim);

    const skin = new THREE.MeshPhysicalMaterial({ color: 0x8a5a3c, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xffc9a8), sheenRoughness: 0.6 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.72 });
    const collar = new THREE.MeshStandardMaterial({ color: 0xe6f4f1, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x17171b, roughness: 0.92 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.35 });
    const iris = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.25 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x6e3030, roughness: 0.5 });
    const mouthIn = new THREE.MeshStandardMaterial({ color: 0x2c0b0b, roughness: 0.9 });
    const browMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });
    const mats: THREE.Material[] = [skin, shirt, collar, hairMat, white, iris, shine, lipMat, mouthIn, browMat];
    const geos: THREE.BufferGeometry[] = [];
    const g = <T extends THREE.BufferGeometry>(x: T) => (geos.push(x), x);

    const body = new THREE.Group();
    scene.add(body);

    // Torso: a smooth lathe from waist to shoulders, flattened front-to-back.
    const profile = [
      [0.0, -0.62],
      [0.29, -0.6],
      [0.32, -0.3],
      [0.35, 0.0],
      [0.4, 0.22],
      [0.38, 0.32],
      [0.24, 0.42],
      [0.11, 0.46],
      [0.0, 0.47],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const torso = new THREE.Mesh(g(new THREE.LatheGeometry(profile, 40)), shirt);
    torso.scale.z = 0.7;
    body.add(torso);
    const collarRing = new THREE.Mesh(g(new THREE.TorusGeometry(0.115, 0.026, 10, 32)), collar);
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.y = 0.45;
    collarRing.scale.set(1, 0.85, 1);
    body.add(collarRing);
    const neck = new THREE.Mesh(g(new THREE.CylinderGeometry(0.085, 0.1, 0.2, 20)), skin);
    neck.position.y = 0.53;
    body.add(neck);

    // Head.
    const head = new THREE.Group();
    head.position.y = 0.83;
    body.add(head);
    const skull = new THREE.Mesh(g(new THREE.SphereGeometry(0.27, 40, 28)), skin);
    skull.scale.set(0.94, 1.08, 0.98);
    head.add(skull);
    const earGeo = g(new THREE.SphereGeometry(0.055, 16, 12));
    for (const x of [-0.25, 0.25]) {
      const ear = new THREE.Mesh(earGeo, skin);
      ear.position.set(x, 0.0, -0.01);
      ear.scale.set(0.5, 1, 0.75);
      head.add(ear);
    }
    const nose = new THREE.Mesh(g(new THREE.SphereGeometry(0.042, 16, 12)), skin);
    nose.position.set(0, -0.025, 0.255);
    nose.scale.set(1, 0.85, 0.9);
    head.add(nose);

    // Short textured hair: a cap plus small curls spread over the top of the head.
    const cap = new THREE.Mesh(g(new THREE.SphereGeometry(0.285, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2.15)), hairMat);
    cap.scale.set(0.95, 1.08, 0.99);
    cap.rotation.x = -0.18;
    head.add(cap);
    const curlGeo = g(new THREE.IcosahedronGeometry(0.034, 1));
    const N = 90;
    const curls = new THREE.InstancedMesh(curlGeo, hairMat, N);
    const m4 = new THREE.Matrix4();
    const tilt = new THREE.Vector3(1, 0, 0);
    const shape = new THREE.Vector3(0.27, 0.293, 0.283);
    let placed = 0;
    for (let i = 0; i < N * 2 && placed < N; i++) {
      const y = 1 - (i / (N * 2 - 1)) * 0.62;
      const rr = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      const p = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr).applyAxisAngle(tilt, -0.18);
      if (p.z > 0.55 && p.y < 0.72) continue; // keep the forehead clear
      p.multiply(shape);
      m4.makeTranslation(p.x, p.y, p.z);
      curls.setMatrixAt(placed++, m4);
    }
    curls.count = placed;
    head.add(curls);

    // Eyes (they blink), brows, mouth.
    const eyes: THREE.Group[] = [];
    const brows: THREE.Mesh[] = [];
    const scleraGeo = g(new THREE.SphereGeometry(0.043, 20, 14));
    const irisGeo = g(new THREE.SphereGeometry(0.025, 16, 12));
    const shineGeo = g(new THREE.SphereGeometry(0.007, 8, 6));
    const browGeo = g(new THREE.CapsuleGeometry(0.012, 0.065, 4, 8));
    for (const x of [-0.092, 0.092]) {
      const eye = new THREE.Group();
      eye.position.set(x, 0.045, 0.218);
      head.add(eye);
      const sc = new THREE.Mesh(scleraGeo, white);
      sc.scale.set(1, 0.92, 0.55);
      eye.add(sc);
      const ir = new THREE.Mesh(irisGeo, iris);
      ir.position.z = 0.017;
      ir.scale.z = 0.5;
      eye.add(ir);
      const sh = new THREE.Mesh(shineGeo, shine);
      sh.position.set(0.008, 0.009, 0.03);
      eye.add(sh);
      eyes.push(eye);
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.rotation.z = Math.PI / 2 + (x < 0 ? -0.08 : 0.08);
      brow.position.set(x, 0.118, 0.236);
      head.add(brow);
      brows.push(brow);
    }
    const mouth = new THREE.Group();
    mouth.position.set(0, -0.125, 0.232);
    head.add(mouth);
    const inner = new THREE.Mesh(g(new THREE.SphereGeometry(1, 20, 12)), mouthIn);
    mouth.add(inner);
    const smile = new THREE.Mesh(g(new THREE.TorusGeometry(0.052, 0.011, 8, 24, Math.PI)), lipMat);
    smile.rotation.z = Math.PI;
    smile.position.y = 0.022;
    smile.scale.set(1, 0.55, 0.6);
    mouth.add(smile);

    // Arms with two-joint fingers.
    const upperGeo = g(new THREE.CapsuleGeometry(0.082, 0.3, 6, 14));
    const cuffGeo = g(new THREE.TorusGeometry(0.083, 0.014, 8, 20));
    const foreGeo = g(new THREE.CapsuleGeometry(0.066, 0.28, 6, 14));
    const palmGeo = g(new THREE.CapsuleGeometry(0.068, 0.07, 6, 14));
    const segGeo = g(new THREE.CapsuleGeometry(0.021, 0.04, 4, 8));
    const thumbGeo = g(new THREE.CapsuleGeometry(0.024, 0.045, 4, 8));

    type Arm = { side: number; shoulder: THREE.Group; elbow: THREE.Group; hand: THREE.Group; fingers: [THREE.Group, THREE.Group][]; thumb: THREE.Group; cur: ArmPose };
    const arm = (side: number): Arm => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.39 * side, 0.27, 0);
      body.add(shoulder);
      const upper = new THREE.Mesh(upperGeo, shirt);
      upper.position.y = -0.2;
      shoulder.add(upper);
      const cuff = new THREE.Mesh(cuffGeo, collar);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.36;
      shoulder.add(cuff);
      const elbow = new THREE.Group();
      elbow.position.y = -0.42;
      shoulder.add(elbow);
      const fore = new THREE.Mesh(foreGeo, skin);
      fore.position.y = -0.18;
      elbow.add(fore);
      const hand = new THREE.Group();
      hand.position.y = -0.38;
      elbow.add(hand);
      const palm = new THREE.Mesh(palmGeo, skin);
      palm.position.y = -0.06;
      palm.scale.set(1.05, 1, 0.45);
      hand.add(palm);
      const fingers = [-0.051, -0.017, 0.017, 0.051].map((x, i): [THREE.Group, THREE.Group] => {
        const len = i === 1 ? 1.08 : i === 3 ? 0.82 : 1;
        const knuckle = new THREE.Group();
        knuckle.position.set(x * side, -0.135, 0);
        hand.add(knuckle);
        const prox = new THREE.Mesh(segGeo, skin);
        prox.position.y = -0.036 * len;
        prox.scale.y = len;
        knuckle.add(prox);
        const mid = new THREE.Group();
        mid.position.y = -0.068 * len;
        knuckle.add(mid);
        const dist = new THREE.Mesh(segGeo, skin);
        dist.position.y = -0.032 * len;
        dist.scale.set(0.92, len * 0.9, 0.92);
        mid.add(dist);
        return [knuckle, mid];
      });
      const thumb = new THREE.Group();
      thumb.position.set(-0.075 * side, -0.045, 0.012);
      hand.add(thumb);
      const tm = new THREE.Mesh(thumbGeo, skin);
      tm.position.y = -0.045;
      thumb.add(tm);
      return { side, shoulder, elbow, hand, fingers, thumb, cur: { ...REST, curl: [...REST.curl] } };
    };
    const arms = [arm(-1), arm(1)];

    const face = { open: 0.1, brow: 0 };
    let blinkAt = performance.now() + 2500;
    let raf = 0;
    let last = performance.now();
    const frame = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const c = cue.current;
      const pose = c ? poseFor(c.word) : null;
      const p = c ? Math.min(1, Math.max(0, (now - c.start) / c.dur)) : 0;
      const k = 1 - Math.exp(-dt * (reduce ? 40 : 11));

      body.position.y = reduce ? 0 : Math.sin(t * 1.6) * 0.012;
      torso.scale.x = reduce ? 1 : 1 + Math.sin(t * 1.6) * 0.006; // breathing
      head.rotation.y = reduce ? 0 : pose ? Math.sin(t * 2.1) * 0.1 : Math.sin(t * 0.7) * 0.07;
      head.rotation.x = pose && !reduce ? Math.sin(Math.PI * p) * 0.07 : 0;
      head.rotation.z = reduce ? 0 : Math.sin(t * 0.5) * 0.02;

      for (const a of arms) {
        const signingThis = pose && (a.side > 0 || pose.two);
        const tgt: ArmPose = pose ? (a.side > 0 ? pose.r : pose.l) : waving.current && a.side > 0 && !reduce ? WAVE : REST;
        let msx = 0;
        let msz = 0;
        let mex = 0;
        let mez = 0;
        if (signingThis && !reduce) {
          const env = Math.sin(Math.PI * p);
          if (pose.spell) {
            mex = -Math.abs(Math.sin(p * Math.PI * Math.max(2, c!.word.length))) * 0.18; // a small tap per character
          } else if (pose.move < 0.34) {
            msx = Math.sin(p * Math.PI * 4) * 0.13 * env; // small circles
            msz = Math.cos(p * Math.PI * 4) * 0.1 * env;
          } else if (pose.move < 0.67) {
            mex = -Math.abs(Math.sin(p * Math.PI * 3)) * 0.3; // repeated taps
          } else {
            msz = (p - 0.5) * 0.55; // a sweep across the body
          }
        } else if (tgt === WAVE) {
          mez = Math.sin(t * 6) * 0.35;
        }
        const cur = a.cur;
        cur.sx += (tgt.sx + msx - cur.sx) * k;
        cur.sz += (tgt.sz + msz - cur.sz) * k;
        cur.ex += (tgt.ex + mex - cur.ex) * k;
        cur.ez += (tgt.ez + mez - cur.ez) * k;
        cur.wy += (tgt.wy - cur.wy) * k;
        for (let i = 0; i < 5; i++) cur.curl[i] += (tgt.curl[i] - cur.curl[i]) * k;
        a.shoulder.rotation.set(cur.sx, 0, a.side * cur.sz);
        a.elbow.rotation.set(cur.ex, 0, cur.ez);
        a.hand.rotation.set(-0.25, a.side * cur.wy, 0);
        a.fingers.forEach(([kn, mid], i) => {
          kn.rotation.x = -cur.curl[i] * 0.95;
          mid.rotation.x = -cur.curl[i] * 1.15;
        });
        a.thumb.rotation.set(-cur.curl[4] * 1.1, 0, -a.side * (0.5 + cur.curl[4] * 0.4));
      }

      // Blinking: a quick 140 ms close-and-open every few seconds.
      let lid = 1;
      if (!reduce) {
        const since = now - blinkAt;
        if (since >= 140) blinkAt = now + 2600 + Math.random() * 2600;
        else if (since >= 0) lid = Math.max(0.08, Math.abs(since - 70) / 70);
      }
      for (const e of eyes) e.scale.y = lid;

      // Mouthing the word (Deaf signers often mouth along) and raised brows for questions.
      const syll = c ? Math.max(1, Math.round(c.word.length / 3)) : 1;
      const openT = pose && !reduce ? 0.25 + 0.75 * Math.abs(Math.sin(p * Math.PI * syll)) : 0.05;
      face.open += (openT - face.open) * k;
      face.brow += ((pose?.brow ?? 0) - face.brow) * k;
      inner.scale.set(0.045, 0.006 + face.open * 0.034, 0.02);
      smile.scale.set(1 - face.open * 0.25, 0.55 - face.open * 0.25, 0.6);
      for (const b of brows) b.position.y = 0.118 + face.brow * 0.032;

      r.render(scene, cam);
      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      geos.forEach((x) => x.dispose());
      mats.forEach((m) => m.dispose());
      curls.dispose();
      r.dispose();
      r.domElement.remove();
      renderer.current = null;
      camera.current = null;
    };
  }, [on, signing]);

  // Resize the canvas without rebuilding the figure.
  useEffect(() => {
    const r = renderer.current;
    const cam = camera.current;
    if (!on || !signing || !r || !cam) return;
    r.setSize(stage.w, stage.h);
    cam.aspect = stage.w / stage.h;
    cam.updateProjectionMatrix();
  }, [on, signing, stage.w, stage.h]);

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
