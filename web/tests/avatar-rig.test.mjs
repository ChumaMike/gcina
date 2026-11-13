import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as THREE from 'three';
import { createAvatar as loadAvatar } from '../src/components/sasl-avatar/rig.ts';

const file = readFileSync(new URL('../public/avatars/gcina-v2.glb', import.meta.url));
const createAvatar = () => loadAvatar(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const descends = (child, parent) => { for (let p = child.parent; p; p = p.parent) if (p === parent) return true; return false; };

test('both hands expose independent anatomical joint chains', async () => {
  const avatar = await createAvatar();
  try {
    for (const arm of [avatar.left, avatar.right]) {
      assert.ok(descends(arm.elbow, arm.shoulder));
      assert.ok(descends(arm.wrist, arm.elbow));
      assert.deepEqual(Object.keys(arm.fingers), ['index', 'middle', 'ring', 'little', 'thumb']);
      for (const [name, finger] of Object.entries(arm.fingers)) {
        assert.equal(finger.joints.length, name === 'thumb' ? 2 : 3);
        assert.ok(descends(finger.joints[0], arm.wrist));
        finger.joints.slice(1).forEach((joint, i) => assert.equal(joint.parent, finger.joints[i]));
      }
    }
    const unchanged = avatar.right.fingers.middle.joints[0].rotation.x;
    avatar.right.fingers.index.joints[1].rotation.x = -0.9;
    assert.equal(avatar.right.fingers.middle.joints[0].rotation.x, unchanged);
    assert.notEqual(avatar.left.fingers.index.joints[1].rotation.x, -0.9);
  } finally { avatar.dispose(); }
});

test('the head and every fingertip remain in frame throughout the movement study', async () => {
  const avatar = await createAvatar();
  try {
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    for (const aspect of [0.8, 0.97, 1.3, 1.5]) {
      camera.aspect = aspect;
      const fov = THREE.MathUtils.degToRad(16);
      camera.position.set(0, 1.13, Math.max(1.22 / Math.tan(fov), 1.18 / (Math.tan(fov) * aspect)) + 0.25);
      camera.lookAt(0, 1.13, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      for (let step = 0; step < 36; step++) {
        avatar.update(step / 3, true, false);
        avatar.root.rotation.y = Math.sin(step / 3) * 0.3;
        avatar.root.updateMatrixWorld(true);
        for (const region of ["head", "left", "right"]) {
          const box = avatar.bounds(region);
          for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
            const p = new THREE.Vector3(x, y, z).project(camera);
            assert.ok(Math.abs(p.x) < 0.96 && Math.abs(p.y) < 0.96, `clipped ${region}, aspect=${aspect}, t=${step / 3}: ${p.toArray()}`);
          }
        }
      }
    }
  } finally { avatar.dispose(); }
});

test('reduced motion returns a stable neutral pose; idle has a blink and breathing', async () => {
  const avatar = await createAvatar();
  const snapshot = () => {
    avatar.root.updateMatrixWorld(true);
    const values = [];
    avatar.root.traverse((o) => values.push(...o.matrixWorld.elements));
    return values;
  };
  try {
    avatar.update(0, false, true);
    const neutral = snapshot();
    const lids = avatar.lids.map(({upper}) => upper.quaternion.clone());
    const eyeScales = avatar.eyes.map(eye => eye.scale.clone());
    avatar.update(4.94, false, false);
    assert.ok(avatar.lids.every(({upper}, i) => upper.quaternion.angleTo(lids[i]) > .25));
    assert.ok(avatar.eyes.every((eye, i) => eye.scale.distanceTo(eyeScales[i]) < 1e-7), "blink moves eyelids, not eyeballs");
    assert.notEqual(avatar.chest.scale.y, 1);
    avatar.update(45, true, true);
    assert.ok(snapshot().every((n, i) => Math.abs(n-neutral[i]) < 1e-6), "neutral pose must be stable");
    avatar.update(125, false, true);
    assert.ok(snapshot().every((n, i) => Math.abs(n-neutral[i]) < 1e-6), "neutral pose must be stable");
  } finally { avatar.dispose(); }
});

test('geometry stays within a small portrait budget and owned resources dispose once', async () => {
  const avatar = await createAvatar();
  const geometries = new Set(), materials = new Set();
  let triangles = 0, disposed = 0;
  avatar.root.traverse((o) => {
    if (!o.isMesh) return;
    geometries.add(o.geometry);
    materials.add(o.material);
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
  });
  for (const resource of [...geometries, ...materials]) resource.addEventListener('dispose', () => disposed++);
  assert.ok(triangles < 80_000, `${triangles} triangles exceeds portrait budget`);
  avatar.dispose();
  assert.equal(disposed, geometries.size + materials.size);
  console.log(`Avatar: ${triangles.toLocaleString()} triangles, ${geometries.size} geometries, ${materials.size} materials`);
});
