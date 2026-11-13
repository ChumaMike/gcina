import * as THREE from "three";
import { createAvatarMotion, type Cue } from "./motion";
import { createAvatar, fitAvatarCamera } from "./rig";

export function mountAvatar(host: HTMLElement, readState: () => { cue: Cue | null; waving: boolean; speaking: boolean }, onError: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  scene.add(new THREE.HemisphereLight(0xe6f5ff, 0x756353, 2));
  const key = new THREE.DirectionalLight(0xffe7d1, 2.7);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9e9f2, 1.25);
  fill.position.set(4, 2, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xbcf2e5, 2.8);
  rim.position.set(1, 4, -3);
  scene.add(rim);

  const abort = new AbortController();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const samplePose = createAvatarMotion();
  let avatar: Awaited<ReturnType<typeof createAvatar>> | undefined;
  let visible = true;
  let frameRequest = 0;
  let elapsed = 0;
  let lastFrame = 0;

  const canDraw = () => !abort.signal.aborted && visible && !document.hidden && avatar !== undefined;
  function draw(now: number, dt: number) {
    if (!avatar || !canDraw()) return;
    const { cue, waving, speaking } = readState();
    avatar.pose(samplePose(cue, waving, speaking, reduced.matches, now, elapsed, dt));
    renderer.render(scene, camera);
  }
  function tick(now: number) {
    if (!canDraw() || reduced.matches) {
      frameRequest = 0;
      return;
    }
    if (!lastFrame || now - lastFrame >= 1000 / 30 - 1) {
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.08) : 0;
      lastFrame = now;
      elapsed += dt;
      draw(now, dt);
    }
    frameRequest = requestAnimationFrame(tick);
  }
  function update() {
    if (canDraw() && !reduced.matches) {
      if (!frameRequest) frameRequest = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      lastFrame = 0;
      // Reduced motion keeps each cue as a still pose with no idle or jaw loop.
      if (reduced.matches) draw(performance.now(), 0);
    }
  }
  function resize() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height || abort.signal.aborted) return;
    renderer.setSize(width, height, false);
    fitAvatarCamera(camera, width, height);
    draw(performance.now(), 0);
  }

  const sizing = new ResizeObserver(resize);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  });
  sizing.observe(host);
  intersection.observe(host);
  document.addEventListener("visibilitychange", update);
  reduced.addEventListener("change", update);
  canvas.addEventListener("webglcontextlost", fail);

  function dispose() {
    if (abort.signal.aborted) return;
    abort.abort();
    cancelAnimationFrame(frameRequest);
    sizing.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange", update);
    reduced.removeEventListener("change", update);
    canvas.removeEventListener("webglcontextlost", fail);
    avatar?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  function fail() {
    dispose();
    onError();
  }

  createAvatar(undefined, abort.signal).then((loaded) => {
    if (abort.signal.aborted) {
      loaded.dispose();
      return;
    }
    avatar = loaded;
    scene.add(loaded.root);
    resize();
    update();
  }).catch(() => {
    if (!abort.signal.aborted) fail();
  });

  return { update, dispose };
}
