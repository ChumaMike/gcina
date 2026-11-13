import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as THREE from "three";
import { createAvatarMotion } from "../src/components/sasl-avatar/motion.ts";
import { AVATAR_URL, createAvatar, fitAvatarCamera } from "../src/components/sasl-avatar/rig.ts";

const glb = readFileSync(new URL(`../public${AVATAR_URL}`, import.meta.url));
const loadAvatar = () => createAvatar(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength));
const sizes = [[132, 158], [164, 196], [220, 262], [290, 346], [264, 315]];
const words = ["Overview", "invoice", "R1200", "Why?", "eighteen", "two", "izinkokhelo", "प्राप्त"];
const digits = [2, 3, 4, 5, 1];

function rigParts(root) {
  const bones = new Map();
  const meshes = [];
  root.traverse((object) => {
    if (object.isBone) bones.set(object.name, object);
    if (object.isSkinnedMesh) meshes.push(object);
  });
  return { bones, meshes };
}

function neutral() {
  return createAvatarMotion()(null, false, false, true, 0, 0, 0);
}

test("the V2 adapter moves each digit independently on its own hand", async () => {
  const avatar = await loadAvatar();
  const { bones } = rigParts(avatar.root);
  try {
    for (const [side, arm] of [["L", "dominant"], ["R", "weak"]]) {
      const fingers = digits.map((digit) => [1, 2, 3].map((joint) => bones.get(`finger${digit}-${joint}.${side}`)));
      const snapshot = () => fingers.map((finger) => finger.map((bone) => bone.quaternion.clone()));
      for (let digit = 0; digit < digits.length; digit++) {
        const pose = neutral();
        pose[arm].curl.fill(0);
        avatar.pose(pose);
        const open = snapshot();
        pose[arm].curl[digit] = 1;
        avatar.pose(pose);
        fingers.forEach((finger, index) => {
          const moved = finger.some((bone, joint) => bone.quaternion.angleTo(open[index][joint]) > 0.01);
          assert.equal(moved, digit === index, `${side} digit ${digit} should move on its own`);
        });
      }
      assert.ok(fingers.every((finger) => finger[2].parent === finger[1]));
    }
  } finally {
    avatar.dispose();
  }
});

test("the head and both skinned hands stay in frame at every existing zoom size", async () => {
  const avatar = await loadAvatar();
  const { bones, meshes } = rigParts(avatar.root);
  const head = bones.get("head");
  const subjects = meshes.map((mesh) => {
    const skin = mesh.geometry.getAttribute("skinIndex");
    const weights = mesh.geometry.getAttribute("skinWeight");
    const visibleJoints = mesh.skeleton.bones.map((bone) => {
      if (/^(finger|metacarpal|wrist)/.test(bone.name)) return true;
      for (let joint = bone; joint; joint = joint.parent) if (joint === head) return true;
      return false;
    });
    const samples = [];
    for (let vertex = 0; vertex < skin.count; vertex++) {
      for (let joint = 0; joint < 4; joint++) {
        if (!visibleJoints[skin.getComponent(vertex, joint)] || weights.getComponent(vertex, joint) <= 0.25) continue;
        samples.push(vertex);
        break;
      }
    }
    return { mesh, samples };
  });
  const cameras = sizes.map(([width, height]) => {
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    fitAvatarCamera(camera, width, height);
    assert.equal(camera.aspect, width / height);
    return camera;
  });

  const world = new THREE.Vector3(), clip = new THREE.Vector3();
  const advance = createAvatarMotion();
  let frameTime = 0;
  try {
    const scenes = [{ word: "rest" }, { word: "greeting", waving: true }, ...words.map((word) => ({ word, signing: true }))];
    for (const { word, waving = false, signing = false } of scenes) {
      const cue = signing ? { word, start: frameTime, dur: 660 } : null;
      for (let sample = 0; sample <= 12; sample++) {
        frameTime += 55;
        avatar.pose(advance(cue, waving, signing, false, frameTime, frameTime / 1000, 0.055));
        avatar.root.updateMatrixWorld(true);
        for (const { mesh, samples } of subjects) {
          for (const vertex of samples) {
            mesh.getVertexPosition(vertex, world).applyMatrix4(mesh.matrixWorld);
            for (const camera of cameras) {
              clip.copy(world).project(camera);
              if (!Number.isFinite(clip.x) || Math.abs(clip.x) > 1 || Math.abs(clip.y) > 1) {
                assert.fail(`${word}, sample ${sample} is clipped at aspect ${camera.aspect}: ${clip.toArray()}`);
              }
            }
          }
        }
      }
    }
  } finally {
    avatar.dispose();
  }
});

test("speech moves the jaw and reduced motion holds a stable pose", async () => {
  const avatar = await loadAvatar();
  const { bones } = rigParts(avatar.root);
  const jaw = bones.get("jaw");
  const idle = jaw.quaternion.clone();
  const advance = createAvatarMotion();
  try {
    avatar.pose(advance(null, false, false, true, 0, 0, 0));
    idle.copy(jaw.quaternion);
    const cue = { word: "Overview", start: 0, dur: 460 };
    avatar.pose(advance(cue, false, true, false, 170, 0.17, 0.055));
    assert.ok(jaw.quaternion.angleTo(idle) > 0.005, "speech must open the weighted jaw");
    avatar.pose(advance(cue, false, true, true, 220, 0.22, 0.055));
    assert.deepEqual(jaw.quaternion.toArray(), idle.toArray());
    const still = [...bones.values()].map((joint) => joint.quaternion.clone());
    avatar.pose(advance(cue, false, true, true, 400, 0.40, 0.055));
    [...bones.values()].forEach((joint, index) => assert.deepEqual(joint.quaternion.toArray(), still[index].toArray()));
  } finally {
    avatar.dispose();
  }
});

test("the GLB stays within the portrait budget and disposes shared resources once", async () => {
  const avatar = await loadAvatar();
  const { meshes } = rigParts(avatar.root);
  const resources = new Set();
  let triangles = 0;
  for (const mesh of meshes) {
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    resources.add(mesh.geometry);
    resources.add(mesh.skeleton);
    for (const material of [].concat(mesh.material)) resources.add(material);
  }
  assert.ok(triangles >= 70_000 && triangles < 80_000, `${triangles} skinned triangles`);
  const disposals = new Map();
  for (const resource of resources) {
    const original = resource.dispose.bind(resource);
    resource.dispose = () => {
      disposals.set(resource, (disposals.get(resource) ?? 0) + 1);
      original();
    };
  }
  avatar.dispose();
  avatar.dispose();
  assert.equal(disposals.size, resources.size);
  assert.ok([...disposals.values()].every((count) => count === 1));
});
