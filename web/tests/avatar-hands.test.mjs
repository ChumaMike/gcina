import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as THREE from 'three';
import { createAvatar } from '../src/components/sasl-avatar/rig.ts';
import { createSoftwareSkinning } from '../src/components/sasl-avatar/software-skinning.ts';
const file = readFileSync(new URL('../public/avatars/gcina-v2.glb', import.meta.url));
const load = () => createAvatar(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const point = bone => bone.getWorldPosition(new THREE.Vector3());

test('each of ten digits moves independently; thumb has a distinct opposition joint', async () => {
  const avatar = await load();
  try {
    for (const arm of [avatar.left, avatar.right]) for (const name of Object.keys(arm.fingers)) {
      avatar.update(0, false, true, 0, { pose: 'open' });
      const selected = arm.fingers[name], before = point(selected.joints.at(-1));
      const others = [avatar.left, avatar.right].flatMap(a => Object.values(a.fingers)).filter(f => f !== selected).map(f => ({ f, q: f.joints.map(b => b.quaternion.clone()) }));
      avatar.setFinger(arm, name, 1); avatar.root.updateMatrixWorld(true);
      assert.ok(point(selected.joints.at(-1)).distanceTo(before) > .025, `${arm.side}/${name} must articulate`);
      for (const {f,q} of others) f.joints.forEach((b,i) => assert.deepEqual(b.quaternion.toArray(), q[i].toArray(), 'another digit was changed'));
      if (name === 'thumb') assert.ok(selected.opposition && selected.opposition !== selected.joints[0]);
    }
  } finally { avatar.dispose(); }
});

test('open-to-closed poses fold fingertips toward each palm with finite skinning', async () => {
  const avatar = await load();
  try {
    for (const arm of [avatar.left, avatar.right]) {
      const reach = () => ['index','middle','ring','little'].reduce((sum,name) => sum + point(arm.fingers[name].joints.at(-1)).distanceTo(point(arm.wrist)),0);
      avatar.update(0,false,true,0,{pose:'open'}); const open = reach();
      avatar.update(0,false,true,0,{pose:'closed'}); const closed = reach();
      assert.ok(closed < open - .15, 'a fist must fold inward rather than merely rotate the whole hand');
      const box = avatar.bounds(arm.side > 0 ? 'left' : 'right');
      assert.ok([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));
      assert.ok(box.getSize(new THREE.Vector3()).length() < .65);
    }
  } finally { avatar.dispose(); }
});

test('each hand is one connected skin surface from wrist through all five digits', async () => {
  const avatar = await load();
  try {
    const mesh = avatar.meshes.find(m => m.material.name.startsWith('Skin'));
    const geometry = mesh.geometry, positions = geometry.getAttribute('position');
    const keys = [], graph = new Map();
    for(let i=0;i<positions.count;i++) {
      const key = [positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
      keys.push(key); if(!graph.has(key))graph.set(key,new Set());
    }
    for(let i=0;i<geometry.index.count;i+=3) {
      const tri=[0,1,2].map(j=>keys[geometry.index.getX(i+j)]);
      for(const a of tri)for(const b of tri)graph.get(a).add(b);
    }
    const index=geometry.getAttribute('skinIndex'), weight=geometry.getAttribute('skinWeight');
    for(const suffix of ['L','R']) {
      const targets = new Set(); let start;
      for(let i=0;i<positions.count;i++)for(let j=0;j<4;j++) {
        const name=mesh.skeleton.bones[index.getComponent(i,j)].name;
        if(weight.getComponent(i,j)>.25 && name.endsWith('.'+suffix)) {
          if(name.startsWith('finger'))targets.add(keys[i]);
          if(name.startsWith('wrist'))start=keys[i];
        }
      }
      const visited=new Set([start]),queue=[start];
      for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i]))if(!visited.has(next)){visited.add(next);queue.push(next)}
      assert.ok(targets.size>500,'check the actual detailed mesh, not just joint handles');
      assert.ok([...targets].every(key=>visited.has(key)), `${suffix} has detached finger geometry`);
    }
  } finally { avatar.dispose(); }
});

test('software fallback matches GPU skinning through animation, rotation and blinking', async () => {
  const avatar = await load(), software = createSoftwareSkinning(avatar.meshes);
  try {
    for (const [t,yaw] of [[0,0],[2.5,.3],[4.94,-.3]]) {
      avatar.root.rotation.y=yaw; avatar.update(t,true,false,.7); software.update();
      for(let m=0;m<avatar.meshes.length;m++) {
        const source=avatar.meshes[m], result=software.meshes[m].geometry.getAttribute('position');
        for(let i=0;i<result.count;i+=Math.max(1,Math.floor(result.count/60))) {
          const expected=source.getVertexPosition(i,new THREE.Vector3());
          assert.ok(expected.distanceTo(new THREE.Vector3().fromBufferAttribute(result,i))<1e-5, 'fallback changed the character surface');
        }
      }
    }
    assert.ok(avatar.meshes.every(m=>!m.visible));
  } finally { software.dispose(); assert.ok(avatar.meshes.every(m=>m.visible)); avatar.dispose(); }
});
