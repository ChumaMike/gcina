import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type FingerName = "index" | "middle" | "ring" | "little" | "thumb";
export type FingerRig = { joints: THREE.Group[] };
export type ArmRig = {
  side: number;
  shoulder: THREE.Group;
  elbow: THREE.Group;
  wrist: THREE.Group;
  fingers: Record<FingerName, FingerRig>;
};

/** Local joint rotations, in radians. Left/right always mean the character's side.
 * This is an animation interface, not a vocabulary or a text-to-sign system. */
export type ArmPose = {
  shoulder: [number, number, number];
  elbow: [number, number, number];
  wrist: [number, number, number];
  curls: [number, number, number, number, number];
};

const FINGER_NAMES: FingerName[] = ["index", "middle", "ring", "little", "thumb"];

/** A self-contained, original character: no remote model, texture or asset licence. */
export function createAvatar() {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const geo = <T extends THREE.BufferGeometry>(g: T) => (geometries.add(g), g);
  const mat = (color: number, roughness = 0.6, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, ...extra });
    materials.add(m);
    return m;
  };
  const skin = mat(0x985e40, 0.64);
  const skinWarm = mat(0x875239, 0.67);
  const lips = mat(0x774537, 0.56);
  const seam = mat(0x512c26, 0.78);
  const hair = mat(0x211b19, 0.88);
  const hairHighlight = mat(0x302520, 0.83);
  const shirt = mat(0x087b76, 0.83);
  const collar = mat(0x075c59, 0.8);
  const stitching = mat(0x31938a, 0.88);
  const cream = mat(0xfff6e5, 0.35);
  const iris = mat(0x583a25, 0.28);
  const pupil = mat(0x171c1b, 0.22);
  const gold = mat(0xc6a66a, 0.3, { metalness: 0.65 });
  const nail = mat(0xb77e61, 0.5);
  const sphere = geo(new THREE.SphereGeometry(1, 20, 14));
  const smallSphere = geo(new THREE.SphereGeometry(1, 10, 8));

  function ellipsoid(parent: THREE.Object3D, material: THREE.Material, position: number[], scale: number[], small = false) {
    const m = new THREE.Mesh(small ? smallSphere : sphere, material);
    m.position.set(position[0], position[1], position[2]);
    m.scale.set(scale[0], scale[1], scale[2]);
    parent.add(m);
    return m;
  }

  function curve(parent: THREE.Object3D, points: number[][], radius: number, material: THREE.Material) {
    const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p as [number, number, number])));
    const mesh = new THREE.Mesh(geo(new THREE.TubeGeometry(path, 16, radius, 6, false)), material);
    parent.add(mesh);
    return mesh;
  }

  // Smooth elliptical lofts give the torso, sleeves and forearms tailored contours.
  function loft(parent: THREE.Object3D, rings: number[][], material: THREE.Material) {
    const profile = new THREE.CatmullRomCurve3(rings.map(([y, width, depth]) => new THREE.Vector3(width, y, depth)));
    const positions: number[] = [];
    const indices: number[] = [];
    const rows = 20, columns = 28;
    for (let i = 0; i <= rows; i++) {
      const p = profile.getPoint(i / rows);
      for (let j = 0; j <= columns; j++) {
        const a = j / columns * Math.PI * 2;
        positions.push(Math.sin(a) * p.x, p.y, Math.cos(a) * p.z);
        if (i < rows && j < columns) {
          const k = i * (columns + 1) + j;
          indices.push(k, k + 1, k + columns + 1, k + 1, k + columns + 2, k + columns + 1);
        }
      }
    }
    const geometry = geo(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    parent.add(mesh);
    return mesh;
  }

  function joint(parent: THREE.Object3D, name: string, x = 0, y = 0, z = 0) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  const root = new THREE.Group();
  root.name = "GcinaAvatar";
  const chest = joint(root, "chest");
  loft(chest, [[-0.14, 0.35, 0.215], [0.08, 0.39, 0.235], [0.45, 0.405, 0.235], [0.85, 0.46, 0.255], [1.13, 0.50, 0.245], [1.27, 0.44, 0.21], [1.39, 0.18, 0.145]], shirt);
  ellipsoid(chest, skin, [0, 1.44, 0], [0.151, 0.22, 0.147]);

  // A polo collar, placket, fine seams and a small Gcina insignia.
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(side * 0.02, 1.28);
    shape.lineTo(side * 0.12, 1.41);
    shape.quadraticCurveTo(side * 0.23, 1.38, side * 0.30, 1.27);
    shape.lineTo(side * 0.17, 1.12);
    shape.lineTo(side * 0.02, 1.28);
    const mesh = new THREE.Mesh(geo(new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.012, bevelThickness: 0.008 })), collar);
    mesh.position.z = 0.205;
    chest.add(mesh);
    curve(chest, [[side * 0.20, 1.34, 0.23], [side * 0.27, 1.27, 0.23], [side * 0.17, 1.15, 0.23]], 0.004, stitching);
  }
  curve(chest, [[0, 1.26, 0.263], [0, 1.1, 0.267], [0, 0.96, 0.27]], 0.023, collar);
  for (const y of [1.18, 1.04]) ellipsoid(chest, cream, [0, y, 0.29], [0.012, 0.012, 0.006], true);
  curve(chest, [[-0.35, 0.05, 0.10], [0, 0.025, 0.237], [0.35, 0.05, 0.10]], 0.004, stitching);
  // Three nested, open arcs: a discreet embroidered mark rather than a texture.
  for (let i = 0; i < 3; i++) {
    const points = Array.from({ length: 12 }, (_, n) => {
      const a = 0.25 + n / 11 * Math.PI * 1.6;
      return [0.30 + Math.cos(a) * (0.026 + i * 0.012), 1.015 + Math.sin(a) * (0.026 + i * 0.012), 0.244];
    });
    curve(chest, points, 0.0035, cream);
  }

  const head = joint(chest, "head", 0, 1.88, 0);
  head.scale.setScalar(1.12);
  const faceGeo = geo(new THREE.SphereGeometry(1, 48, 32));
  const vertices = faceGeo.getAttribute("position");
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const jaw = 1 - 0.13 * Math.max(0, -y);
    const px = x * 0.293 * jaw;
    const py = y * (y < 0 ? 0.35 : 0.385);
    const front = Math.max(0, z) ** 6;
    const cheeks = 0.022 * Math.exp(-((Math.abs(px) - 0.16) ** 2 / 0.008 + (py + 0.06) ** 2 / 0.009));
    const muzzle = 0.029 * Math.exp(-(px ** 2 / 0.012 + (py + 0.17) ** 2 / 0.008));
    vertices.setXYZ(i, px, py, z * 0.245 + front * (cheeks + muzzle));
  }
  faceGeo.computeVertexNormals();
  head.add(new THREE.Mesh(faceGeo, skin));

  const eyes: THREE.Group[] = [];
  const brows: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, [side * 0.29, -0.035, 0], [0.048, 0.081, 0.046]);
    ellipsoid(head, skinWarm, [side * 0.314, -0.032, 0.029], [0.021, 0.047, 0.018]);
    ellipsoid(head, skin, [side * 0.306, -0.051, 0.044], [0.018, 0.024, 0.016]);
    ellipsoid(head, gold, [side * 0.302, -0.101, 0.038], [0.013, 0.013, 0.011], true);

    const eye = joint(head, side < 0 ? "eye.R" : "eye.L", side * 0.113, 0.028, 0.225);
    eye.rotation.y = side * 0.12;
    ellipsoid(eye, skin, [0, 0, -0.01], [0.079, 0.048, 0.031]);
    ellipsoid(eye, cream, [0, 0, 0], [0.066, 0.033, 0.025]);
    ellipsoid(eye, iris, [-side * 0.006, 0, 0.024], [0.030, 0.030, 0.008]);
    ellipsoid(eye, pupil, [-side * 0.006, 0, 0.031], [0.013, 0.016, 0.005]);
    ellipsoid(eye, cream, [-0.011, 0.011, 0.036], [0.007, 0.007, 0.003], true);
    ellipsoid(eye, cream, [0.009, -0.009, 0.035], [0.0025, 0.0025, 0.002], true);
    curve(eye, [[-0.067, 0, 0], [-0.035, 0.031, 0.014], [0.012, 0.036, 0.018], [0.063, 0.006, 0]], 0.006, skinWarm);
    curve(eye, [[-0.066, 0, 0], [0, -0.033, 0.013], [0.065, 0.005, 0]], 0.006, skin);
    eyes.push(eye);
    const brow = joint(head, side < 0 ? "brow.R" : "brow.L", side * 0.113, 0.126, 0.226);
    curve(brow, [[-side * 0.065, -0.008, 0], [-side * 0.02, 0.01, 0.011], [side * 0.025, 0.011, 0.002], [side * 0.064, -0.004, -0.016]], 0.012, hair);
    brows.push(brow);
  }
  ellipsoid(head, skin, [0, -0.026, 0.248], [0.034, 0.083, 0.037]);
  ellipsoid(head, skin, [0, -0.082, 0.273], [0.053, 0.036, 0.052]);
  for (const s of [-1, 1]) {
    ellipsoid(head, skin, [s * 0.043, -0.09, 0.268], [0.027, 0.024, 0.029]);
    ellipsoid(head, skinWarm, [s * 0.032, -0.104, 0.297], [0.013, 0.006, 0.006], true);
  }
  const mouth = joint(head, "mouth", 0, -0.188, 0.233);
  curve(mouth, [[-0.10, 0.027, -0.015], [-0.047, 0.01, 0.012], [-0.018, 0.016, 0.017], [0, 0.01, 0.018], [0.018, 0.016, 0.017], [0.047, 0.01, 0.012], [0.10, 0.027, -0.015]], 0.008, lips);
  curve(mouth, [[-0.10, 0.025, -0.015], [-0.045, -0.01, 0.014], [0, -0.018, 0.023], [0.045, -0.01, 0.014], [0.10, 0.025, -0.015]], 0.011, lips);
  curve(mouth, [[-0.098, 0.026, -0.01], [-0.045, 0.002, 0.023], [0, -0.005, 0.029], [0.045, 0.002, 0.023], [0.098, 0.026, -0.01]], 0.004, seam);

  // An instanced curl cap: rich silhouette and highlights in just two draw calls.
  const curlGeo = geo(new THREE.IcosahedronGeometry(1, 1));
  const curlMatrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  const count = 360;
  for (let i = 0; i < count; i++) {
    const y = 1 - (i + 0.5) / count * 2;
    const radial = Math.sqrt(1 - y * y);
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const x = Math.cos(angle) * radial, z = Math.sin(angle) * radial;
    if (y < (z > 0 ? 0.40 - 0.19 * Math.abs(x) : -0.3)) continue;
    const size = 0.036 + (Math.sin(i * 17.1) + 1) * 0.009;
    dummy.position.set(x * 0.305, y * 0.385 + 0.025, z * 0.254 - 0.008);
    dummy.scale.set(size, size * 0.88, size);
    dummy.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    dummy.updateMatrix();
    curlMatrices.push(dummy.matrix.clone());
  }
  // Underlying cap prevents pinholes between curls, with a forehead-shaped hairline.
  const capGeo = geo(new THREE.SphereGeometry(1, 48, 24));
  const capPositions = capGeo.getAttribute("position"), capUv = capGeo.getAttribute("uv");
  for (let i = 0; i < capPositions.count; i++) {
    const phi = capUv.getX(i) * Math.PI * 2;
    const threshold = Math.sin(phi) > 0 ? 0.4 - 0.19 * Math.abs(Math.cos(phi)) : 0.21 + 0.51 * Math.sin(phi);
    const theta = (1 - capUv.getY(i)) * Math.acos(threshold);
    capPositions.setXYZ(i, -Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
  }
  capGeo.computeVertexNormals();
  const cap = new THREE.Mesh(capGeo, hair);
  cap.scale.set(0.303, 0.383, 0.255);
  cap.position.set(0, 0.027, -0.012);
  head.add(cap);
  for (let group = 0; group < 2; group++) {
    const selected = curlMatrices.filter((_, i) => i % 4 === 0 ? group === 1 : group === 0);
    const curls = new THREE.InstancedMesh(curlGeo, group ? hairHighlight : hair, selected.length);
    selected.forEach((m, i) => curls.setMatrixAt(i, m));
    head.add(curls);
  }

  function arm(side: number): ArmRig {
    const suffix = side < 0 ? "R" : "L";
    const shoulder = joint(chest, `shoulder.${suffix}`, side * 0.49, 1.12, 0);
    // Loft winding runs from low y to high y.
    loft(shoulder, [[-0.39, 0.134, 0.139], [-0.32, 0.15, 0.155], [-0.08, 0.18, 0.176], [0.08, 0.15, 0.145], [0.17, 0.002, 0.002]], shirt);
    loft(shoulder, [[-0.40, 0.137, 0.142], [-0.36, 0.145, 0.15]], collar);
    ellipsoid(shoulder, skin, [0, -0.455, 0], [0.113, 0.19, 0.113]);
    const elbow = joint(shoulder, `elbow.${suffix}`, 0, -0.58, 0);
    ellipsoid(elbow, skin, [0, 0, 0], [0.105, 0.105, 0.107]);
    loft(elbow, [[-0.50, 0.061, 0.058], [-0.4, 0.073, 0.069], [-0.22, 0.098, 0.09], [-0.07, 0.105, 0.103], [0.025, 0.09, 0.089]], skin);
    const wrist = joint(elbow, `wrist.${suffix}`, 0, -0.50, 0);
    wrist.scale.setScalar(1.14);
    ellipsoid(wrist, skin, [0, -0.027, 0], [0.065, 0.088, 0.058]);
    ellipsoid(wrist, skin, [0, -0.125, 0], [0.091, 0.123, 0.047]);
    ellipsoid(wrist, skin, [-side * 0.052, -0.11, 0.014], [0.046, 0.07, 0.04]);
    const fingers = {} as Record<FingerName, FingerRig>;
    const lengths = [0.18, 0.205, 0.19, 0.15];
    for (let i = 0; i < 5; i++) {
      const thumb = i === 4;
      const name = FINGER_NAMES[i];
      const base = joint(wrist, `${name}.01.${suffix}`, thumb ? -side * 0.074 : side * (-0.062 + i * 0.041), thumb ? -0.09 : -0.212 + Math.abs(i - 1.4) * 0.01, thumb ? 0.01 : 0);
      base.rotation.z = thumb ? -side * 0.66 : -side * (i - 1.5) * 0.075;
      const joints = [base];
      const parts = thumb ? [0.062, 0.056] : [lengths[i] * 0.44, lengths[i] * 0.32, lengths[i] * 0.24];
      let parent = base;
      parts.forEach((length, segment) => {
        if (segment) {
          parent = joint(parent, `${name}.0${segment + 1}.${suffix}`, 0, -parts[segment - 1], 0);
          joints.push(parent);
        }
        const radius = (thumb ? 0.026 : 0.0205 - i * 0.0009) * (1 - segment * 0.12);
        ellipsoid(parent, skin, [0, -length / 2, 0], [radius, length / 2 + radius * 0.55, radius], true);
        if (segment === parts.length - 1) {
          ellipsoid(parent, nail, [0, -length * 0.60, -radius * 0.89], [radius * 0.65, length * 0.28, 0.003], true);
        }
      });
      fingers[name] = { joints };
    }
    return { side, shoulder, elbow, wrist, fingers };
  }
  const right = arm(-1), left = arm(1);

  // Batch rigid detail within each joint, preserving every animated transform.
  // This reduces driver overhead without merging across fingers or facial controls.
  root.traverse((parent) => {
    const batches = new Map<string, THREE.Mesh[]>();
    for (const child of parent.children) {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || Array.isArray(child.material)) continue;
      const key = `${child.material.uuid}:${Object.keys(child.geometry.attributes).sort().join()}:${!!child.geometry.index}`;
      const batch = batches.get(key) ?? [];
      batch.push(child);
      batches.set(key, batch);
    }
    for (const batch of batches.values()) {
      if (batch.length < 2) continue;
      const parts = batch.map((mesh) => {
        mesh.updateMatrix();
        return mesh.geometry.clone().applyMatrix4(mesh.matrix);
      });
      const merged = mergeGeometries(parts);
      parts.forEach((part) => part.dispose());
      if (!merged) continue;
      batch.forEach((mesh) => parent.remove(mesh));
      parent.add(new THREE.Mesh(geo(merged), batch[0].material));
    }
  });

  function poseArm(a: ArmRig, p: ArmPose) {
    a.shoulder.rotation.set(...p.shoulder);
    a.elbow.rotation.set(...p.elbow);
    a.wrist.rotation.set(...p.wrist);
    FINGER_NAMES.forEach((name, i) => a.fingers[name].joints.forEach((j, segment) => {
      j.rotation.x = -p.curls[i] * (segment === 0 ? 1.05 : 1.35);
    }));
  }

  /** No gesture is inferred from text. This fixed range-of-motion study is only
   * for inspecting the rig; replace with community-validated animation data. */
  let demoBlend = 0, previousTime = 0;
  function update(seconds: number, demo: boolean, still: boolean) {
    const t = still ? 0 : seconds;
    const dt = Math.max(0, Math.min(0.1, t - previousTime));
    previousTime = t;
    demoBlend = still ? 0 : THREE.MathUtils.damp(demoBlend, demo ? 1 : 0, 5, dt);
    chest.scale.y = 1 + Math.sin(t * 1.7) * 0.004;
    head.rotation.set(Math.sin(t * 0.8) * 0.012, Math.sin(t * 0.6) * 0.025, Math.sin(t * 0.7) * 0.009);
    const blinkAt = t % 5.7;
    const blink = !still && blinkAt > 4.8 && blinkAt < 5.08 ? Math.sin((blinkAt - 4.8) / 0.28 * Math.PI) ** 2 : 0;
    eyes.forEach((eye) => { eye.scale.y = 1 - blink * 0.97; });
    brows.forEach((b, i) => { b.position.y = 0.126 + Math.sin(t * 0.65 + i * 0.3) * 0.003; });
    const blend = demoBlend;
    for (const a of [left, right]) {
      const cycle = (Math.sin(t * 1.2 + (a.side > 0 ? 0.55 : 0)) + 1) / 2;
      poseArm(a, {
        shoulder: [-0.15 - blend * 0.20, 0, a.side * (0.19 + blend * 0.09)],
        elbow: [-1.30 - blend * (0.44 + cycle * 0.25), 0, -a.side * (0.44 - blend * 0.12)],
        wrist: [0.28 - blend * 0.22, a.side * (0.45 + blend * 0.3), a.side * 0.24],
        curls: [0.18 + blend * cycle * 0.5, 0.22 + blend * cycle * 0.5, 0.26 + blend * cycle * 0.5, 0.3 + blend * cycle * 0.5, 0.16 + blend * cycle * 0.2],
      });
    }
  }
  update(0, false, true);
  return {
    root, chest, head, eyes, brows, mouth, left, right, poseArm, update,
    dispose() {
      root.traverse((object) => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
