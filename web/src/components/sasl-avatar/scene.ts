import * as THREE from "three";
import { createAvatar } from "./rig";

export type ViewOptions = { paused: boolean; reduced: boolean; demo: boolean; slow: boolean };

/** Owns every GPU resource, listener and scheduled frame for one open preview. */
export function createAvatarScene(host: HTMLElement, onError: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  const avatar = createAvatar();
  avatar.root.traverse((object) => {
    if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
  });
  scene.add(avatar.root);
  scene.add(new THREE.HemisphereLight(0xe6f5ff, 0x756353, 2.5));
  const key = new THREE.DirectionalLight(0xffe7d1, 2.7);
  key.position.set(-3, 5, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.radius = 4;
  key.shadow.blurSamples = 6;
  key.shadow.camera.left = key.shadow.camera.bottom = -2;
  key.shadow.camera.right = key.shadow.camera.top = 2;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.015;
  key.target.position.set(0, 1.2, 0);
  scene.add(key.target);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9e9f2, 1.25);
  fill.position.set(4, 2, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xbcf2e5, 2.8);
  rim.position.set(1, 4, -3);
  scene.add(rim);

  let options: ViewOptions = { paused: false, reduced: false, demo: false, slow: false };
  let disposed = false, lost = false, visible = true;
  let raf = 0, elapsed = 0, last = 0, lastDraw = 0;
  let yaw = 0, targetYaw = 0;
  let qualitySamples = 0, qualityStart = 0, economical = false;
  let pointer: { id: number; x: number; yaw: number } | null = null;
  const canAnimate = () => !disposed && !lost && visible && !document.hidden && !options.paused && !options.reduced;

  function draw() {
    if (disposed || lost || document.hidden || !visible) return;
    avatar.root.rotation.y = yaw;
    renderer.render(scene, camera);
  }
  function frame(now: number) {
    raf = 0;
    if (!canAnimate()) return;
    // 30 fps is sufficient for this small studio portrait and saves mobile GPU work.
    if (now - lastDraw >= 1000 / 30 - 1) {
      if (!qualityStart) qualityStart = now;
      qualitySamples++;
      if (!economical && qualitySamples === 10 && now - qualityStart > 600) {
        // A slow GPU/software renderer keeps the same model and animation at
        // native resolution, without the extra shadow/blur passes.
        economical = true;
        renderer.shadowMap.enabled = false;
        key.castShadow = false;
        avatar.root.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => { material.needsUpdate = true; });
          }
        });
        renderer.setPixelRatio(1);
        resize();
      }
      const dt = last ? Math.min((now - last) / 1000, 0.08) : 0;
      last = now;
      lastDraw = now;
      elapsed += dt * (options.slow ? 0.58 : 1);
      yaw = THREE.MathUtils.damp(yaw, targetYaw, 12, dt);
      avatar.update(elapsed, options.demo, false);
      draw();
    }
    raf = requestAnimationFrame(frame);
  }
  function schedule() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    qualitySamples = 0;
    qualityStart = 0;
    if (canAnimate()) raf = requestAnimationFrame(frame);
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Fit both the full head and the entire hand workspace at narrow aspect ratios.
    const verticalFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = Math.max(1.52 / Math.tan(verticalFov), 1.12 / (Math.tan(verticalFov) * camera.aspect));
    camera.position.set(0, 1.08, distance + 0.25);
    camera.lookAt(0, 1.08, 0);
    camera.updateProjectionMatrix();
    draw();
  }
  function turn(value: number) {
    targetYaw = THREE.MathUtils.clamp(value, -0.3, 0.3);
    if (options.paused || options.reduced) {
      yaw = targetYaw;
      draw();
    }
  }
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    pointer = { id: e.pointerId, x: e.clientX, yaw: targetYaw };
    host.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (pointer?.id === e.pointerId) turn(pointer.yaw + (e.clientX - pointer.x) * 0.004);
  };
  const up = () => { pointer = null; };
  const keydown = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home"].includes(e.key)) return;
    e.preventDefault();
    turn(e.key === "Home" ? 0 : targetYaw + (e.key === "ArrowLeft" ? -0.1 : 0.1));
  };
  const visibility = () => { schedule(); draw(); };
  const contextLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    onError();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visibility();
  });
  intersection.observe(host);
  document.addEventListener("visibilitychange", visibility);
  host.addEventListener("pointerdown", down);
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerup", up);
  host.addEventListener("pointercancel", up);
  host.addEventListener("lostpointercapture", up);
  host.addEventListener("keydown", keydown);
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  resize();
  schedule();

  return {
    setOptions(next: ViewOptions) {
      options = next;
      if (next.reduced) avatar.update(0, false, true);
      draw();
      schedule();
    },
    resetView() { turn(0); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
      host.removeEventListener("lostpointercapture", up);
      host.removeEventListener("keydown", keydown);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      avatar.dispose();
      key.shadow.map?.dispose();
      key.shadow.mapPass?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
