export type Cue = { word: string; start: number; dur: number };
type ArmTarget = { sx: number; sz: number; ex: number; ez: number; wy: number; curl: number[] };
type Pose = { r: ArmTarget; l: ArmTarget; two: boolean; move: number; brow: number; spell: boolean };

// These are the existing concept preview's placeholder shapes, timed by its word cues.
const SHAPES = [
  [0, 0, 0, 0, 0.2],
  [1, 1, 1, 1, 0.1],
  [0, 1, 1, 1, 0.9],
  [0, 0, 1, 1, 0.9],
  [1, 1, 1, 0, 0],
  [0.5, 0.5, 0.5, 0.5, 0.5],
  [0.8, 0.8, 0.8, 0.8, 0.7],
];
const REST: ArmTarget = { sx: 0.05, sz: 0.1, ex: -0.25, ez: 0, wy: 0, curl: [0.3, 0.35, 0.4, 0.4, 0.3] };
const WEAK: ArmTarget = { sx: -0.35, sz: 0.1, ex: -1.0, ez: 0, wy: 0.3, curl: [0.4, 0.4, 0.4, 0.4, 0.4] };
const WAVE: ArmTarget = { sx: -0.55, sz: 0.18, ex: -1.62, ez: 0, wy: 0, curl: [0, 0, 0, 0, 0.2] };

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

function poseFor(word: string): Pose {
  const r = rng(word);
  const spell = /\d/.test(word);
  const two = !spell && r() < 0.45;
  const shape = SHAPES[Math.floor(r() * SHAPES.length)];
  const dom: ArmTarget = spell
    ? { sx: -1.25, sz: 0.25, ex: -1.2, ez: 0, wy: 0, curl: [0, 1, 1, 1, 0.9] }
    : { sx: -0.7 - r() * 0.8, sz: -0.4 + r() * 0.65, ex: -0.4 - r() * 1.2, ez: 0, wy: (r() - 0.5) * 1.4, curl: shape };
  const weak = two ? { ...dom, curl: r() < 0.6 ? shape : SHAPES[Math.floor(r() * SHAPES.length)] } : WEAK;
  return { r: dom, l: weak, two, move: r(), brow: word.endsWith("?") ? 1 : 0, spell };
}

// Angles are relative to the new character's relaxed pose.
export type ArmPose = { lift: number; spread: number; bend: number; sweep: number; twist: number; curl: number[] };
export type PortraitPose = {
  dominant: ArmPose;
  weak: ArmPose;
  breath: number;
  pitch: number;
  yaw: number;
  tilt: number;
  blink: number;
  brow: number;
  jaw: number;
};

/** Preserve the panel's cue, greeting, and hand-shape timing on the skinned rig. */
export function createAvatarMotion() {
  const restingArm = (): ArmPose => ({ lift: 0, spread: 0, bend: 0, sweep: 0, twist: 0, curl: [...REST.curl] });
  const frame: PortraitPose = {
    dominant: restingArm(),
    weak: restingArm(),
    breath: 0, pitch: 0, yaw: 0, tilt: 0, blink: 0, brow: 0, jaw: 0,
  };
  let activeWord: string | undefined;
  let gesture: Pose | undefined;
  let blinkAt = 2.5;
  let jaw = 0;
  let brow = 0;

  function armFrame(arm: ArmPose, target: ArmTarget, k: number, t: number, progress: number, movement?: Pose) {
    let sx = target.sx, sz = target.sz, ex = target.ex, ez = target.ez;
    let wave = 0;
    if (movement) {
      const envelope = Math.sin(Math.PI * progress);
      if (movement.spell) {
        ex -= Math.abs(Math.sin(progress * Math.PI * Math.max(2, activeWord!.length))) * 0.18;
      } else if (movement.move < 0.34) {
        sx += Math.sin(progress * Math.PI * 4) * 0.13 * envelope;
        sz += Math.cos(progress * Math.PI * 4) * 0.1 * envelope;
      } else if (movement.move < 0.67) {
        ex -= Math.abs(Math.sin(progress * Math.PI * 3)) * 0.3;
      } else {
        sz += (progress - 0.5) * 0.55;
      }
    } else if (target === WAVE) {
      wave = Math.sin(t * 6);
      ez += wave * 0.18;
    }

    arm.lift += (REST.sx - sx - arm.lift) * k;
    arm.spread += (sz - REST.sz - arm.spread) * k;
    arm.bend += (REST.ex - ex - arm.bend) * k;
    arm.sweep += (ez - arm.sweep) * k;
    arm.twist += (target.wy + wave * 0.22 - arm.twist) * k;
    for (let i = 0; i < arm.curl.length; i++) arm.curl[i] += (target.curl[i] - arm.curl[i]) * k;
  }

  return (cue: Cue | null, waving: boolean, speaking: boolean, reduced: boolean, now: number, elapsed: number, dt: number): PortraitPose => {
    if (cue?.word !== activeWord) {
      activeWord = cue?.word;
      gesture = activeWord ? poseFor(activeWord) : undefined;
    }
    const progress = cue ? Math.min(1, Math.max(0, (now - cue.start) / cue.dur)) : 0;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 11);
    const t = reduced ? 0 : elapsed;
    const moving = reduced ? undefined : gesture;

    armFrame(frame.dominant, gesture?.r ?? (waving && !reduced ? WAVE : REST), k, t, progress, moving);
    armFrame(frame.weak, gesture?.l ?? REST, k, t, progress, moving?.two ? moving : undefined);

    frame.breath = Math.sin(t * 1.6);
    frame.pitch = moving ? Math.sin(Math.PI * progress) * 0.07 : 0;
    frame.yaw = Math.sin(t * (moving ? 2.1 : 0.7)) * (moving ? 0.1 : 0.07);
    frame.tilt = Math.sin(t * 0.5) * 0.02;
    const sinceBlink = t - blinkAt;
    frame.blink = !reduced && sinceBlink >= 0 && sinceBlink < 0.14 ? Math.sin(sinceBlink / 0.14 * Math.PI) : 0;
    if (sinceBlink >= 0.14) blinkAt = t + 2.6 + Math.random() * 2.6;

    // SpeechSynthesis supplies playback state, so animate a jaw envelope without lip sync.
    const syllables = cue ? Math.max(1, Math.round(cue.word.length / 3)) : 1;
    const open = speaking
      ? 0.2 + 0.8 * Math.abs(Math.sin(t * 10.2) * Math.sin(t * 6.4 + 0.5))
      : moving ? 0.25 + 0.55 * Math.abs(Math.sin(progress * Math.PI * syllables)) : 0;
    jaw += ((reduced ? 0 : open) - jaw) * k;
    brow += ((gesture?.brow ?? 0) - brow) * k;
    frame.jaw = jaw;
    frame.brow = brow;
    return frame;
  };
}
