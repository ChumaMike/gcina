"use client";

// SASL concept preview. NOT real sign language: a stylised 3D signer that shows WHERE a future
// South African Sign Language avatar would sit and WHAT it would sign. Turn it on, then hover
// (or tap, or tab to) any text: the text is outlined, each word lights up on the page in turn,
// and the figure makes a distinct hand shape + movement for that word. The gestures are made up
// (seeded from the word) so the demo is consistent; the real avatar is roadmap work with a
// Deaf-community partner, and the labels say so.

import { Hand, RotateCcw, Snail, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

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
const REST: ArmPose = { sx: 0, sz: 0.12, ex: -0.1, ez: 0, wy: 0, curl: [0.3, 0.35, 0.4, 0.4, 0.3] };
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

export function SaslPreview() {
  const [on, setOn] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [current, setCurrent] = useState(-1);
  const [run, setRun] = useState(0);
  const [slow, setSlow] = useState(false);
  const active = useRef<Element | null>(null);
  const wordRefs = useRef<Word[]>([]);
  const cue = useRef<Cue | null>(null);
  const waving = useRef(true);
  const mount = useRef<HTMLDivElement | null>(null);

  const toggle = useCallback(() => setOn((v) => !v), []);
  const replay = useCallback(() => {
    setCurrent(0);
    setRun((n) => n + 1);
  }, []);

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
    };
  }, [on]);

  // Step through the words like a signer would; light each one up on the page.
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
    const t = setTimeout(() => setCurrent((c) => c + 1), dur);
    return () => clearTimeout(t);
  }, [current, words, slow, run]);

  // The 3D signer.
  useEffect(() => {
    if (!on || !mount.current) return;
    const host = mount.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      host.textContent = "3D isn't available on this device.";
      return;
    }
    const W = 160;
    const H = 190;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, W / H, 0.1, 50);
    camera.position.set(0, 0.5, 4.1);
    camera.lookAt(0, 0.42, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(2, 3, 4);
    scene.add(sun);

    const skin = new THREE.MeshStandardMaterial({ color: 0x8d5a3b, roughness: 0.6 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
    const lips = new THREE.MeshStandardMaterial({ color: 0x5b1f1f, roughness: 0.7 });
    const mats = [skin, shirt, dark, lips];
    const geos: THREE.BufferGeometry[] = [];
    const g = <T extends THREE.BufferGeometry>(x: T) => (geos.push(x), x);

    const body = new THREE.Group();
    scene.add(body);
    body.add(new THREE.Mesh(g(new THREE.CapsuleGeometry(0.38, 0.55, 8, 16)), shirt));

    const head = new THREE.Group();
    head.position.y = 0.82;
    body.add(head);
    head.add(new THREE.Mesh(g(new THREE.SphereGeometry(0.3, 32, 16)), skin));
    const hair = new THREE.Mesh(g(new THREE.SphereGeometry(0.31, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.3)), dark);
    hair.rotation.x = -0.25;
    head.add(hair);
    const eyeGeo = g(new THREE.SphereGeometry(0.035, 12, 8));
    const browGeo = g(new THREE.BoxGeometry(0.09, 0.018, 0.02));
    const brows: THREE.Mesh[] = [];
    for (const x of [-0.1, 0.1]) {
      const eye = new THREE.Mesh(eyeGeo, dark);
      eye.position.set(x, 0.04, 0.27);
      head.add(eye);
      const brow = new THREE.Mesh(browGeo, dark);
      brow.position.set(x, 0.12, 0.265);
      head.add(brow);
      brows.push(brow);
    }
    const mouth = new THREE.Mesh(g(new THREE.SphereGeometry(1, 16, 8)), lips);
    mouth.position.set(0, -0.12, 0.265);
    head.add(mouth);

    const upperGeo = g(new THREE.CapsuleGeometry(0.08, 0.32, 6, 12));
    const foreGeo = g(new THREE.CapsuleGeometry(0.07, 0.28, 6, 12));
    const palmGeo = g(new THREE.BoxGeometry(0.15, 0.15, 0.055));
    const fingerGeo = g(new THREE.CapsuleGeometry(0.022, 0.07, 4, 8));
    const thumbGeo = g(new THREE.CapsuleGeometry(0.024, 0.05, 4, 8));

    type Arm = { side: number; shoulder: THREE.Group; elbow: THREE.Group; hand: THREE.Group; fingers: THREE.Group[]; thumb: THREE.Group; cur: ArmPose };
    const arm = (side: number): Arm => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.45 * side, 0.35, 0);
      body.add(shoulder);
      const upper = new THREE.Mesh(upperGeo, shirt);
      upper.position.y = -0.22;
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.44;
      shoulder.add(elbow);
      const fore = new THREE.Mesh(foreGeo, skin);
      fore.position.y = -0.2;
      elbow.add(fore);
      const hand = new THREE.Group();
      hand.position.y = -0.4;
      elbow.add(hand);
      const palm = new THREE.Mesh(palmGeo, skin);
      palm.position.y = -0.07;
      hand.add(palm);
      const fingers = [-0.054, -0.018, 0.018, 0.054].map((x) => {
        const f = new THREE.Group();
        f.position.set(x * side, -0.145, 0);
        hand.add(f);
        const m = new THREE.Mesh(fingerGeo, skin);
        m.position.y = -0.055;
        f.add(m);
        return f;
      });
      const thumb = new THREE.Group();
      thumb.position.set(-0.08 * side, -0.05, 0.01);
      hand.add(thumb);
      const tm = new THREE.Mesh(thumbGeo, skin);
      tm.position.y = -0.045;
      thumb.add(tm);
      return { side, shoulder, elbow, hand, fingers, thumb, cur: { ...REST, curl: [...REST.curl] } };
    };
    const arms = [arm(-1), arm(1)];

    const face = { open: 0.1, brow: 0 };
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

      body.position.y = reduce ? 0 : Math.sin(t * 1.6) * 0.015;
      head.rotation.y = reduce ? 0 : pose ? Math.sin(t * 2.1) * 0.12 : Math.sin(t * 0.7) * 0.08;
      head.rotation.x = pose && !reduce ? Math.sin(Math.PI * p) * 0.08 : 0;

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
        a.fingers.forEach((f, i) => (f.rotation.x = -cur.curl[i] * 1.6));
        a.thumb.rotation.set(-cur.curl[4] * 1.1, 0, -a.side * (0.5 + cur.curl[4] * 0.4));
      }

      // Mouthing the word (Deaf signers often mouth along) and raised brows for questions.
      const syll = c ? Math.max(1, Math.round(c.word.length / 3)) : 1;
      const openT = pose && !reduce ? 0.25 + 0.75 * Math.abs(Math.sin(p * Math.PI * syll)) : 0.1;
      face.open += (openT - face.open) * k;
      face.brow += ((pose?.brow ?? 0) - face.brow) * k;
      mouth.scale.set(0.065, 0.012 + face.open * 0.04, 0.025);
      for (const b of brows) b.position.y = 0.12 + face.brow * 0.035;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      geos.forEach((x) => x.dispose());
      mats.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [on]);

  const done = words.length > 0 && current >= words.length;

  return (
    <>
      <style>{`.sasl-highlight{outline:2px dashed #f59e0b;outline-offset:3px;border-radius:6px;background:color-mix(in srgb,#fde68a 35%,transparent)}::highlight(sasl-word){background-color:#fbbf24;color:#0f172a}`}</style>
      {!on ? (
        <button
          type="button"
          data-sasl-ignore
          onClick={toggle}
          aria-pressed={false}
          aria-label="Sign language preview"
          title="Sign language preview"
          className="fixed right-3 bottom-24 z-50 inline-flex size-12 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg ring-2 ring-white/70 hover:bg-teal-800 focus-visible:outline-3 focus-visible:outline-amber-400 md:bottom-6"
        >
          <Hand className="size-6" aria-hidden="true" />
        </button>
      ) : (
        <div
          data-sasl-ignore
          role="complementary"
          aria-label="South African Sign Language preview"
          className="fixed right-3 bottom-24 z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-black/10 bg-white p-3 text-slate-900 shadow-2xl md:bottom-6 dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">🤟 SASL avatar · concept preview</p>
            <button type="button" onClick={toggle} aria-label="Close the sign language preview (Esc)" className="-m-1 inline-flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div ref={mount} className="h-[190px] w-[160px] shrink-0" />
            <div className="min-w-0 text-sm" aria-live="polite">
              {words.length ? (
                <p className="leading-snug">
                  {words.map((w, i) => (
                    <span key={i} className={i === current ? "rounded bg-amber-300 px-0.5 font-semibold text-slate-900" : i < current ? "text-slate-500" : ""}>
                      {w}{" "}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="text-slate-600 dark:text-slate-300">Hover over, tap or tab to any text and I&apos;ll sign it, word by word.</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={replay}
              disabled={!words.length}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-black/10 px-3 text-xs font-medium hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {done ? "Sign it again" : "Replay"}
            </button>
            <button
              type="button"
              onClick={() => setSlow((s) => !s)}
              aria-pressed={slow}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${slow ? "border-teal-700 bg-teal-700 text-white" : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"}`}
            >
              <Snail className="size-4" aria-hidden="true" />
              Slower
            </button>
          </div>
          <p className="mt-2 text-xs leading-snug text-slate-600 dark:text-slate-300">
            Not real sign language yet: the hand shapes are placeholders. Coming: a South African Sign Language avatar, built and checked with a Deaf-community partner.
          </p>
        </div>
      )}
    </>
  );
}
