import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createAvatar } from '../src/components/sasl-avatar/rig.ts';

test('both hands expose independent anatomical joint chains', () => {
  const avatar = createAvatar();
  try {
    for (const arm of [avatar.left, avatar.right]) {
      assert.equal(arm.elbow.parent, arm.shoulder);
      assert.equal(arm.wrist.parent, arm.elbow);
      assert.deepEqual(Object.keys(arm.fingers), ['index', 'middle', 'ring', 'little', 'thumb']);
      for (const [name, finger] of Object.entries(arm.fingers)) {
        assert.equal(finger.joints.length, name === 'thumb' ? 2 : 3);
        assert.equal(finger.joints[0].parent, arm.wrist);
        finger.joints.slice(1).forEach((joint, i) => assert.equal(joint.parent, finger.joints[i]));
      }
    }
    const unchanged = avatar.right.fingers.middle.joints[0].rotation.x;
    avatar.right.fingers.index.joints[1].rotation.x = -0.9;
    assert.equal(avatar.right.fingers.middle.joints[0].rotation.x, unchanged);
    assert.notEqual(avatar.left.fingers.index.joints[1].rotation.x, -0.9);
  } finally { avatar.dispose(); }
});

test('the head and every fingertip remain in frame throughout the movement study', () => {
  const avatar = createAvatar();
  try {
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    for (const aspect of [0.8, 0.97, 1.3, 1.5]) {
      camera.aspect = aspect;
      const fov = THREE.MathUtils.degToRad(16);
      camera.position.set(0, 1.08, Math.max(1.52 / Math.tan(fov), 1.12 / (Math.tan(fov) * aspect)) + 0.25);
      camera.lookAt(0, 1.08, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      for (let step = 0; step < 180; step++) {
        avatar.update(step / 15, true, false);
        avatar.root.rotation.y = Math.sin(step / 15) * 0.3;
        avatar.root.updateMatrixWorld(true);
        for (const object of [avatar.head, avatar.left.wrist, avatar.right.wrist]) {
          const box = new THREE.Box3().setFromObject(object);
          for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
            const p = new THREE.Vector3(x, y, z).project(camera);
            assert.ok(Math.abs(p.x) < 0.96 && Math.abs(p.y) < 0.96, `clipped ${object.name}, aspect=${aspect}, t=${step / 15}: ${p.toArray()}`);
          }
        }
      }
    }
  } finally { avatar.dispose(); }
});

test('reduced motion returns a stable neutral pose; idle has a blink and breathing', () => {
  const avatar = createAvatar();
  const snapshot = () => {
    avatar.root.updateMatrixWorld(true);
    const values = [];
    avatar.root.traverse((o) => values.push(...o.matrixWorld.elements));
    return values;
  };
  try {
    avatar.update(0, false, true);
    const neutral = snapshot();
    avatar.update(4.94, false, false);
    assert.ok(avatar.eyes.every((eye) => eye.scale.y < 0.05));
    assert.notEqual(avatar.chest.scale.y, 1);
    avatar.update(45, true, true);
    assert.deepEqual(snapshot(), neutral);
    avatar.update(125, false, true);
    assert.deepEqual(snapshot(), neutral);
  } finally { avatar.dispose(); }
});

test('geometry stays within a small portrait budget and owned resources dispose once', () => {
  const avatar = createAvatar();
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
