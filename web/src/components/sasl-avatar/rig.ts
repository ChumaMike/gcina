import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type FingerName = "index" | "middle" | "ring" | "little" | "thumb";
export type HandPose = "relaxed" | "open" | "closed";
export type FingerRig = { joints: THREE.Bone[]; opposition?: THREE.Bone };
export type ArmRig = {
  side: number;
  shoulder: THREE.Bone;
  elbow: THREE.Bone;
  wrist: THREE.Bone;
  fingers: Record<FingerName, FingerRig>;
};
export type ArmPose = {
  shoulder: [number, number, number];
  elbow: [number, number, number];
  wrist: [number, number, number];
  curls: [number, number, number, number, number];
};
export type RigInspection = { pose?: HandPose; finger?: FingerName; curl?: number; side?: "left" | "right" | "both" };
const FINGER_NAMES: FingerName[] = ["index", "middle", "ring", "little", "thumb"];
const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);

/** Load the checked-in, licensed anatomical GLB. The returned control surface
 * retains the V1 arm/face handles, with rotations now relative to bind pose. */
export async function createAvatar(source: string | ArrayBuffer = "/avatars/gcina-v2.glb", signal?: AbortSignal) {
  const buffer = typeof source === "string" ? await fetch(source, { signal }).then((response) => {
    if (!response.ok) throw new Error(`Avatar model: HTTP ${response.status}`);
    return response.arrayBuffer();
  }) : source;
  const { scene: root, parser } = await new GLTFLoader().parseAsync(buffer, "");
  root.name = "GcinaAvatar";
  const meshes: THREE.SkinnedMesh[] = [];
  const bones = new Map<string, THREE.Bone>();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse((o) => {
    if (o instanceof THREE.Bone) {
      const node = parser.associations.get(o)?.nodes;
      if (node !== undefined) o.name = parser.json.nodes[node].name;
      bones.set(o.name, o);
    }
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
      // Skinning can move the hands outside the static GLB bounds.
      o.frustumCulled = false;
      if (o instanceof THREE.SkinnedMesh) { meshes.push(o); skeletons.add(o.skeleton); }
    }
  });
  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    skeletons.forEach((s) => s.dispose());
  };
  if (signal?.aborted) { dispose(); throw new DOMException("Avatar load cancelled", "AbortError"); }
  function bone(name: string) {
    const b = bones.get(name);
    if (!b) { dispose(); throw new Error(`Missing avatar joint: ${name}`); }
    return b;
  }
  root.updateMatrixWorld(true);
  const bind = new Map<THREE.Bone, THREE.Quaternion>();
  const parentBind = new Map<THREE.Bone, THREE.Quaternion>();
  const world = new Map<THREE.Bone, THREE.Vector3>();
  bones.forEach((b) => {
    bind.set(b, b.quaternion.clone());
    parentBind.set(b, b.parent!.getWorldQuaternion(new THREE.Quaternion()));
    world.set(b, b.getWorldPosition(new THREE.Vector3()));
  });
  const q = new THREE.Quaternion();
  function delta(b: THREE.Bone, axis: THREE.Vector3, angle: number) {
    const p = parentBind.get(b)!;
    q.setFromAxisAngle(axis, angle).premultiply(p.clone().invert()).multiply(p);
    b.quaternion.copy(q.multiply(bind.get(b)!));
  }
  function local(b: THREE.Bone, euler: [number, number, number]) {
    b.quaternion.copy(bind.get(b)!).multiply(q.setFromEuler(new THREE.Euler(...euler)));
  }
  function arm(side: number): ArmRig {
    const s = side > 0 ? "L" : "R";
    const fingers = {} as Record<FingerName, FingerRig>;
    FINGER_NAMES.forEach((name, index) => {
      const digit = name === "thumb" ? 1 : index + 2;
      fingers[name] = {
        joints: (name === "thumb" ? [2, 3] : [1, 2, 3]).map((segment) => bone(`finger${digit}-${segment}.${s}`)),
        ...(name === "thumb" ? { opposition: bone(`finger1-1.${s}`) } : {}),
      };
    });
    return { side, shoulder: bone(`upperarm01.${s}`), elbow: bone(`lowerarm01.${s}`), wrist: bone(`wrist.${s}`), fingers };
  }
  const left = arm(1), right = arm(-1);
  const axes = new Map<ArmRig, { palm: THREE.Vector3; forearm: THREE.Vector3; elbow: THREE.Vector3; curls: Map<THREE.Bone, THREE.Vector3> }>();
  for (const a of [left, right]) {
    const index = world.get(a.fingers.index.joints[0])!, little = world.get(a.fingers.little.joints[0])!;
    const middle = world.get(a.fingers.middle.joints[0])!, wrist = world.get(a.wrist)!;
    const palm = little.clone().sub(index).cross(middle.clone().sub(wrist)).normalize().multiplyScalar(a.side);
    const upper = world.get(a.elbow)!.clone().sub(world.get(a.shoulder)!);
    const forearm = wrist.clone().sub(world.get(a.elbow)!).normalize();
    const elbow = upper.cross(forearm).normalize();
    const curls = new Map<THREE.Bone, THREE.Vector3>();
    for (const finger of Object.values(a.fingers)) {
      finger.joints.forEach((b) => {
        const next = b.children.find((c) => c instanceof THREE.Bone) as THREE.Bone | undefined;
        const direction = next ? world.get(next)!.clone().sub(world.get(b)!).normalize() : new THREE.Vector3(0, 1, 0).applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()));
        curls.set(b, direction.cross(palm).normalize());
      });
    }
    axes.set(a, { palm, forearm, elbow, curls });
  }
  const restingWrists = new Map<ArmRig, THREE.Quaternion>();
  for (const a of [left, right]) {
    const frame = axes.get(a)!;
    const forward = world.get(a.fingers.middle.joints[0])!.clone().sub(world.get(a.wrist)!).normalize();
    const across = forward.clone().cross(frame.palm).normalize();
    const sourceFrame = new THREE.Matrix4().makeBasis(across, forward, across.clone().cross(forward).normalize());
    const desiredForward = new THREE.Vector3(a.side * .25, -.75, .61).normalize();
    const desiredAcross = desiredForward.clone().cross(Z).normalize();
    const desiredFrame = new THREE.Matrix4().makeBasis(desiredAcross, desiredForward, desiredAcross.clone().cross(desiredForward).normalize());
    restingWrists.set(a, new THREE.Quaternion().setFromRotationMatrix(desiredFrame)
      .multiply(new THREE.Quaternion().setFromRotationMatrix(sourceFrame).invert())
      .multiply(a.wrist.getWorldQuaternion(new THREE.Quaternion())));
  }
  const chest = bone("spine01"), head = bone("head"), mouth = bone("jaw");
  const eyes = [bone("eye.R"), bone("eye.L")];
  const brows = [bone("oculi01.R"), bone("oculi01.L")];
  const lids = ["R", "L"].map((s) => ({ upper: bone(`orbicularis03.${s}`), lower: bone(`orbicularis04.${s}`) }));
  function setFinger(a: ArmRig, name: FingerName, value: number) {
    const curl = THREE.MathUtils.clamp(value, 0, 1), finger = a.fingers[name], frame = axes.get(a)!;
    finger.joints.forEach((b, i) => delta(b, frame.curls.get(b)!, curl * (name === "thumb" ? [0.55, 0.75][i] : [1.05, 1.25, 0.75][i])));
    if (finger.opposition) {
      // Oppose across the palm toward the folded index, with clearance above
      // the finger surface. Solve in world space so either wrist orientation works.
      const cmc = finger.opposition;
      cmc.quaternion.copy(bind.get(cmc)!);
      root.updateMatrixWorld(true);
      const origin = cmc.getWorldPosition(new THREE.Vector3());
      const tip = finger.joints[1].localToWorld(new THREE.Vector3(0, .06, 0));
      const index = a.fingers.index.joints[0].getWorldPosition(new THREE.Vector3());
      const little = a.fingers.little.joints[0].getWorldPosition(new THREE.Vector3());
      const middle = a.fingers.middle.joints[0].getWorldPosition(new THREE.Vector3());
      const wrist = a.wrist.getWorldPosition(new THREE.Vector3());
      const normal = little.sub(index).cross(middle.sub(wrist)).normalize().multiplyScalar(a.side);
      const target = a.fingers.middle.joints[0].getWorldPosition(new THREE.Vector3()).addScaledVector(normal, .09);
      const rotation = new THREE.Quaternion().setFromUnitVectors(tip.sub(origin).normalize(), target.sub(origin).normalize());
      const parent = cmc.parent!.getWorldQuaternion(new THREE.Quaternion());
      rotation.premultiply(parent.clone().invert()).multiply(parent);
      cmc.quaternion.premultiply(new THREE.Quaternion().slerp(rotation, curl));
    }
  }
  function poseArm(a: ArmRig, pose: ArmPose) {
    local(a.shoulder, pose.shoulder); local(a.elbow, pose.elbow); local(a.wrist, pose.wrist);
    FINGER_NAMES.forEach((name, i) => setFinger(a, name, pose.curls[i]));
  }
  let demoBlend = 0, previousTime = 0;
  function update(seconds: number, demo: boolean, still: boolean, speech = 0, inspect?: RigInspection) {
    const t = still ? 0 : seconds;
    const dt = Math.max(0, Math.min(0.1, t - previousTime)); previousTime = t;
    demoBlend = still ? 0 : THREE.MathUtils.damp(demoBlend, demo ? 1 : 0, 5, dt);
    chest.scale.y = 1 + Math.sin(t * 1.6) * 0.0025;
    delta(head, new THREE.Vector3(0, 1, 0), Math.sin(t * 0.55) * 0.018);
    const phase = t % 5.7;
    const blink = !still && phase > 4.8 && phase < 5.08 ? Math.sin((phase - 4.8) / 0.28 * Math.PI) ** 2 : 0;
    lids.forEach(({ upper, lower }) => { delta(upper, X, blink * 0.43); delta(lower, X, -blink * 0.10); });
    brows.forEach((b, i) => delta(b, Z, Math.sin(t * 0.65) * (i ? -0.012 : 0.012)));
    // Browser speech does not expose audio/visemes. This jaw envelope is an
    // explicitly approximate speaking motion; reduced motion suppresses it.
    delta(mouth, X, still ? 0 : THREE.MathUtils.clamp(speech, 0, 1) * 0.13);
    for (const a of [left, right]) {
      const frame = axes.get(a)!;
      const cycle = (Math.sin(t * 1.2 + (a.side > 0 ? 0.6 : 0)) + 1) / 2;
      delta(a.shoulder, Z, -a.side * (0.46 - demoBlend * 0.04));
      delta(a.elbow, frame.elbow, 0.70 + demoBlend * (0.18 + cycle * 0.14));
      a.elbow.rotateY(-a.side * 0.80);
      delta(bone(`lowerarm02.${a.side > 0 ? "L" : "R"}`), frame.forearm, -a.side * 0.80);
      root.updateMatrixWorld(true);
      a.wrist.quaternion.copy(a.wrist.parent!.getWorldQuaternion(new THREE.Quaternion()).invert())
        .multiply(root.getWorldQuaternion(new THREE.Quaternion())).multiply(restingWrists.get(a)!);
      FINGER_NAMES.forEach((name, i) => {
        let curl = (name === "thumb" ? 0.12 : 0.10 + i * 0.035) + demoBlend * cycle * 0.45;
        const selected = !inspect?.side || inspect.side === "both" || (inspect.side === "left") === (a.side > 0);
        if (selected && inspect?.pose === "open") curl = 0;
        if (selected && inspect?.pose === "closed") curl = 1;
        if (selected && inspect?.finger === name) curl = inspect.curl ?? 0;
        setFinger(a, name, curl);
      });
    }
    root.updateMatrixWorld(true);
    skeletons.forEach((s) => s.update());
  }
  type Region = "head" | "left" | "right";
  const regions = new Map<Region, { mesh: THREE.SkinnedMesh; indices: number[] }[]>();
  for (const region of ["head", "left", "right"] as const) {
    const entries = meshes.map((mesh) => {
      const index = mesh.geometry.getAttribute("skinIndex"), weight = mesh.geometry.getAttribute("skinWeight");
      const eligible = new Set(mesh.skeleton.bones.map((b, i) => {
        const name = b.name;
        if (region !== "head") return /^(finger|metacarpal|wrist)/.test(name) && name.endsWith(region === "left" ? "L" : "R") ? i : -1;
        for (let p: THREE.Object3D | null = b; p; p = p.parent) if (p === head) return i;
        return -1;
      }).filter((i) => i >= 0));
      const indices: number[] = [];
      for (let i = 0; i < index.count; i++) {
        for (let j = 0; j < 4; j++) if (eligible.has(index.getComponent(i, j)) && weight.getComponent(i, j) > 0.15) { indices.push(i); break; }
      }
      return { mesh, indices };
    });
    regions.set(region, entries);
  }
  const point = new THREE.Vector3();
  function bounds(region: Region, target = new THREE.Box3()) {
    root.updateMatrixWorld(true);
    skeletons.forEach((s) => s.update());
    target.makeEmpty();
    for (const { mesh, indices } of regions.get(region)!) for (const index of indices) {
      mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld); target.expandByPoint(point);
    }
    return target;
  }
  update(0, false, true);
  return { root, chest, head, eyes, brows, lids, mouth, left, right, meshes, bones, poseArm, setFinger, update, bounds, dispose };
}
