"use client";

// SASL concept preview. NOT real sign language: a stylised 3D figure that shows WHERE a future
// South African Sign Language avatar would sit and WHAT it would sign. Turn it on, then hover
// (or tap) any text: the text is highlighted and the figure "signs" it word by word.
// The real avatar is roadmap work with a Deaf-community partner; the labels say so.

import { Hand, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

const TEXT_SELECTOR = "h1,h2,h3,h4,p,li,td,th,label,button,a,dt,dd,[data-sasl]";
const WORD_MS = 480;

function readable(el: Element): string {
  const t = (el as HTMLElement).innerText ?? el.textContent ?? "";
  return t.replace(/\s+/g, " ").trim().slice(0, 140);
}

export function SaslPreview() {
  const [on, setOn] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [current, setCurrent] = useState(-1);
  const active = useRef<Element | null>(null);
  const signing = useRef(false);
  const mount = useRef<HTMLDivElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  const toggle = useCallback(() => setOn((v) => !v), []);

  // Pick up the text under the pointer (or keyboard focus) and highlight it.
  useEffect(() => {
    if (!on) return;
    const pick = (target: EventTarget | null) => {
      if (!(target instanceof Element) || panel.current?.contains(target)) return;
      const el = target.closest(TEXT_SELECTOR);
      if (!el || el === active.current) return;
      const text = readable(el);
      if (!text) return;
      active.current?.classList.remove("sasl-highlight");
      el.classList.add("sasl-highlight");
      active.current = el;
      setWords(text.split(" "));
      setCurrent(0);
    };
    const over = (e: PointerEvent) => pick(e.target);
    const focus = (e: FocusEvent) => pick(e.target);
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("focusin", focus);
      active.current?.classList.remove("sasl-highlight");
      active.current = null;
      setWords([]);
      setCurrent(-1);
    };
  }, [on]);

  // Step through the words like a signer would.
  useEffect(() => {
    if (current < 0 || current >= words.length) {
      signing.current = false;
      return;
    }
    signing.current = true;
    const t = setTimeout(() => setCurrent((c) => c + 1), WORD_MS);
    return () => clearTimeout(t);
  }, [current, words]);

  // The 3D figure.
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
    const W = 150;
    const H = 170;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 50);
    camera.position.set(0, 0.55, 4.2);
    camera.lookAt(0, 0.45, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(2, 3, 4);
    scene.add(sun);

    const skin = new THREE.MeshStandardMaterial({ color: 0x8d5a3b, roughness: 0.6 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
    const geos: THREE.BufferGeometry[] = [];
    const g = <T extends THREE.BufferGeometry>(x: T) => (geos.push(x), x);

    const body = new THREE.Group();
    scene.add(body);
    const torso = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.38, 0.55, 8, 16)), shirt);
    torso.position.y = 0;
    body.add(torso);
    const head = new THREE.Mesh(g(new THREE.SphereGeometry(0.3, 32, 16)), skin);
    head.position.y = 0.82;
    body.add(head);
    for (const x of [-0.1, 0.1]) {
      const eye = new THREE.Mesh(g(new THREE.SphereGeometry(0.035, 12, 8)), dark);
      eye.position.set(x, 0.86, 0.27);
      body.add(eye);
    }

    type Arm = { shoulder: THREE.Group; elbow: THREE.Group; hand: THREE.Mesh; side: number };
    const arm = (side: number): Arm => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.45 * side, 0.35, 0);
      body.add(shoulder);
      const upper = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.08, 0.32, 6, 12)), shirt);
      upper.position.y = -0.22;
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.44;
      shoulder.add(elbow);
      const fore = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.07, 0.28, 6, 12)), skin);
      fore.position.y = -0.2;
      elbow.add(fore);
      const hand = new THREE.Mesh(g(new THREE.SphereGeometry(0.1, 16, 12)), skin);
      hand.scale.set(1, 1.2, 0.6);
      hand.position.y = -0.42;
      elbow.add(hand);
      return { shoulder, elbow, hand, side };
    };
    const arms = [arm(-1), arm(1)];

    let raf = 0;
    const clock = new THREE.Clock();
    const frame = () => {
      const t = clock.getElapsedTime();
      const busy = signing.current && !reduce;
      body.position.y = Math.sin(t * 1.6) * 0.015;
      head.rotation.y = busy ? Math.sin(t * 2.1) * 0.15 : Math.sin(t * 0.7) * 0.08;
      for (const a of arms) {
        const ph = a.side > 0 ? 0 : Math.PI / 2;
        if (busy) {
          // Hands up in the signing space in front of the chest, moving in small figures of eight.
          a.shoulder.rotation.x = -1.1 + Math.sin(t * 5 + ph) * 0.35;
          a.shoulder.rotation.z = a.side * (0.35 + Math.cos(t * 4 + ph) * 0.2);
          a.elbow.rotation.x = -1.2 + Math.sin(t * 6.5 + ph) * 0.45;
          a.hand.rotation.z = Math.sin(t * 7 + ph) * 0.6;
        } else if (a.side > 0 && !reduce) {
          // Idle: a friendly wave with the right hand.
          a.shoulder.rotation.x = -0.2;
          a.shoulder.rotation.z = 2.4;
          a.elbow.rotation.x = 0;
          a.elbow.rotation.z = Math.sin(t * 6) * 0.35;
        } else {
          a.shoulder.rotation.set(0, 0, a.side * 0.12);
          a.elbow.rotation.set(0, 0, 0);
        }
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      geos.forEach((x) => x.dispose());
      [skin, shirt, dark].forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [on]);

  return (
    <>
      <style>{`.sasl-highlight{outline:3px solid #f59e0b;outline-offset:3px;background:color-mix(in srgb,#fde68a 45%,transparent);border-radius:6px;transition:background .15s}`}</style>
      {!on ? (
        <button
          type="button"
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
          ref={panel}
          role="complementary"
          aria-label="South African Sign Language preview"
          className="fixed right-4 bottom-24 z-50 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-3 text-slate-900 shadow-2xl md:bottom-6 dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">🤟 SASL avatar · concept preview</p>
            <button type="button" onClick={toggle} aria-label="Close the sign language preview" className="-m-1 inline-flex size-10 items-center justify-center rounded-full hover:bg-black/5">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div ref={mount} className="h-[170px] w-[150px] shrink-0" />
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
                <p className="text-slate-600 dark:text-slate-300">Hover over or tap any text and I&apos;ll show it here.</p>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs leading-snug text-slate-600 dark:text-slate-300">
            Not real sign language yet. Coming: a South African Sign Language avatar, built and checked with a Deaf-community partner.
          </p>
        </div>
      )}
    </>
  );
}
