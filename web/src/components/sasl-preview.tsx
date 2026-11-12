"use client";

// Accessibility concept only. Text selection and reading pace are preserved, but
// the character never derives invented signs or mouth movements from page text.
import { Hand, Pause, Play, RotateCcw, Snail, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AvatarViewport } from "./sasl-avatar/viewport";

const BLOCKS = "h1,h2,h3,h4,h5,h6,p,li,td,th,label,button,a,dt,dd,figcaption,legend,summary,[role=button],[data-sasl]";
const SKIP = "[data-sasl-ignore],script,style,svg,canvas,input,textarea,select,[aria-hidden=true]";
const MAX_WORDS = 28;
const HOVER_MS = 140;

type Word = { text: string; node: Text; start: number; end: number };

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

/** Reading pace for selected text; this is not sign timing or fingerspelling. */
function wordMs(w: string) {
  const core = /\d/.test(w) ? 320 + 110 * Math.min(w.length, 7) : 380 + 32 * Math.min(w.length, 12);
  return core + (/[.,!?;:]$/.test(w) ? 220 : 0);
}


const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(MOTION_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const motionSnapshot = () => window.matchMedia(MOTION_QUERY).matches;
const serverMotionSnapshot = () => true;

export function SaslPreview() {
  const [on, setOn] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [current, setCurrent] = useState(-1);
  const [run, setRun] = useState(0);
  const [slow, setSlow] = useState(false);
  const [paused, setPaused] = useState(false);
  const [demo, setDemo] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, serverMotionSnapshot);
  const active = useRef<Element | null>(null);
  const wordRefs = useRef<Word[]>([]);
  const launcher = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOn(false);
    setDemo(false);
    requestAnimationFrame(() => launcher.current?.focus());
  }, []);
  const replay = useCallback(() => {
    setCurrent(0);
    setPaused(false);
    setRun((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!on) return;
    closeButton.current?.focus();
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
      timer = window.setTimeout(() => choose(t), e.pointerType === "mouse" ? HOVER_MS : 0);
    };
    const touch = (e: PointerEvent) => {
      if (e.pointerType === "touch" && e.target instanceof Element) choose(e.target);
    };
    const focus = (e: FocusEvent) => e.target instanceof Element && choose(e.target);
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerdown", touch, { passive: true });
    document.addEventListener("focusin", focus);
    document.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerdown", touch);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("keydown", key);
      active.current?.classList.remove("sasl-highlight");
      active.current = null;
      wordRefs.current = [];
      markWord(undefined);
      setWords([]);
      setCurrent(-1);
    };
  }, [on, close]);

  useEffect(() => {
    const w = words[current];
    if (!on || w === undefined) {
      markWord(undefined);
      return;
    }
    markWord(wordRefs.current[current]);
    if (paused) return;
    const timer = setTimeout(() => setCurrent((c) => c + 1), wordMs(w) * (slow ? 1.7 : 1));
    return () => clearTimeout(timer);
  }, [on, current, words, slow, run, paused]);

  const done = words.length > 0 && current >= words.length;
  const button = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-40";
  const inactive = "border-slate-200 hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10";
  const selected = "border-teal-700 bg-teal-700 text-white";

  return (
    <>
      <style>{`.sasl-highlight{outline:2px dashed #f59e0b;outline-offset:3px;border-radius:6px;background:color-mix(in srgb,#fde68a 35%,transparent)}::highlight(sasl-word){background-color:#fbbf24;color:#0f172a}.sasl-studio{height:min(280px,27dvh)}@media(min-width:768px){.sasl-studio{height:min(350px,40dvh)}}@media(max-height:560px) and (min-width:768px){.sasl-studio{height:240px}}`}</style>
      {!on ? (
        <button
          ref={launcher}
          type="button"
          data-sasl-ignore
          onClick={() => { setPaused(false); setOn(true); }}
          aria-expanded={false}
          aria-controls="sasl-preview-panel"
          aria-label="Sign language preview"
          title="Sign language preview"
          className="fixed right-3 bottom-24 z-50 inline-flex size-12 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg ring-2 ring-white/70 hover:bg-teal-800 focus-visible:outline-3 focus-visible:outline-amber-400 md:bottom-6"
        >
          <Hand className="size-6" aria-hidden="true" />
        </button>
      ) : (
        <aside
          id="sasl-preview-panel"
          data-sasl-ignore
          aria-label="South African Sign Language concept preview"
          className="fixed right-3 bottom-24 z-50 max-h-[64dvh] w-[min(23rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-3xl border border-black/10 bg-white p-3 text-slate-900 shadow-[0_16px_64px_-12px_#123f3b55] md:bottom-6 md:max-h-[calc(100dvh-3rem)] dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="mb-3 flex items-center justify-between gap-2 pl-1">
            <div>
              <p className="text-sm font-semibold tracking-tight">A more human connection</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">South African Sign Language · concept</p>
            </div>
            <button ref={closeButton} type="button" onClick={close} aria-label="Close the sign language preview (Esc)" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-teal-700 dark:hover:bg-white/10">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <AvatarViewport paused={paused} reduced={reduced} demo={demo} slow={slow} />
          <div className="mt-3 px-1">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
              <span>{words.length ? "Selected text" : "Explore the concept"}</span>
              {words.length > 0 && <span>{done ? "Complete" : `${Math.min(current + 1, words.length)} / ${words.length}`}</span>}
            </div>
            <div className="max-h-20 min-h-10 overflow-y-auto text-sm leading-relaxed">
              {words.length ? (
                <p>{words.map((w, i) => <span key={i} className={i === current ? "rounded bg-amber-200 px-0.5 font-medium text-slate-900" : i < current ? "text-slate-500 dark:text-slate-400" : ""}>{w}{" "}</span>)}</p>
              ) : (
                <p className="text-slate-600 dark:text-slate-300">Hover over, tap or tab to page text to preview the reading flow.</p>
              )}
            </div>
            <p className="sr-only" role="status">{words.length ? `Selected text: ${words.join(" ")}` : "Select page text to explore the concept. This is not SASL translation."}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={replay} disabled={!words.length} className={`${button} ${inactive}`}>
              <RotateCcw className="size-3.5" aria-hidden="true" />{done ? "Replay text" : "Replay"}
            </button>
            <button type="button" onClick={() => setSlow((s) => !s)} aria-pressed={slow} className={`${button} ${slow ? selected : inactive}`}>
              <Snail className="size-3.5" aria-hidden="true" /> Slower
            </button>
            <button type="button" onClick={() => setPaused((v) => !v)} aria-pressed={paused} className={`${button} ${paused ? selected : inactive}`}>
              {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}{paused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={() => { setDemo((v) => !v); setPaused(false); }} disabled={reduced} aria-pressed={demo && !reduced} title={reduced ? "Rig motion is disabled by your reduced-motion preference" : "Inspect the rig with a fixed movement study"} className={`${button} ${demo && !reduced ? selected : inactive}`}>
              <Hand className="size-3.5" aria-hidden="true" /> {demo && !reduced ? "Stop rig demo" : "Try rig demo"}
            </button>
          </div>
          <p className="mt-3 border-t border-slate-100 px-1 pt-2.5 text-[11px] leading-relaxed text-slate-500 dark:border-white/10 dark:text-slate-400">
            <strong className="font-semibold text-slate-700 dark:text-slate-300">Movement study, not SASL translation.</strong>{" "}
            Authentic signing requires animation built and validated with Deaf SASL experts.
          </p>
        </aside>
      )}
    </>
  );
}
