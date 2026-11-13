import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { ArmPose, PortraitPose } from "./motion";

// The existing static media path is available to both owner and judge sessions.
export const AVATAR_URL = "/photos/avatars/gcina-v2.glb";

const FINGERS = ["index", "middle", "ring", "little", "thumb"] as const;
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

function jointAxis(bone: THREE.Bone, direction: THREE.Vector3) {
  return direction.clone().applyQuaternion(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
}

/** The existing stage zooms by changing CSS size. Keep the same portrait framing at each size. */
export function fitAvatarCamera(camera: THREE.PerspectiveCamera, width: number, height: number) {
  camera.aspect = width / height;
  const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distance = Math.max(1.18 / halfFov, 1.08 / (halfFov * camera.aspect));
  // This leaves room below the resting hands for the stage's original zoom buttons.
  camera.position.set(0, 0.95, distance + 0.40);
  camera.lookAt(0, 0.95, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

/** Load the shared V2 mesh and retarget the existing preview pose to its anatomical joints. */
export async function createAvatar(source: string | ArrayBuffer = AVATAR_URL, signal?: AbortSignal) {
  const bytes = typeof source === "string" ? await fetch(source, { signal }).then((response) => {
    if (!response.ok) throw new Error(`Avatar model: HTTP ${response.status}`);
    return response.arrayBuffer();
  }) : source;
  const { scene: root, parser } = await new GLTFLoader().parseAsync(bytes, "");
  const bones = new Map<string, THREE.Bone>();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const skeletons = new Set<THREE.Skeleton>();
  let disposed = false;

  root.name = "GcinaAvatar";
  root.traverse((object) => {
    if (object instanceof THREE.Bone) {
      const node = parser.associations.get(object)?.nodes;
      if (node !== undefined) object.name = parser.json.nodes[node].name;
      bones.set(object.name, object);
    }
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      const surfaces = Array.isArray(object.material) ? object.material : [object.material];
      surfaces.forEach((material) => materials.add(material));
      // Hand and arm movement can exceed the bind-pose bounds in the file.
      object.frustumCulled = false;
    }
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
  });
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    skeletons.forEach((skeleton) => skeleton.dispose());
  };
  if (signal?.aborted) {
    dispose();
    signal.throwIfAborted();
  }

  function bone(name: string) {
    const joint = bones.get(name);
    if (!joint) {
      dispose();
      throw new Error(`Missing avatar joint: ${name}`);
    }
    return joint;
  }

  root.updateMatrixWorld(true);
  const position = (joint: THREE.Bone) => joint.getWorldPosition(new THREE.Vector3());
  const rotation = new THREE.Quaternion();
  const combined = new THREE.Quaternion();
  const delta = (joint: THREE.Bone, bind: THREE.Quaternion, axis: THREE.Vector3, angle: number) => {
    joint.quaternion.copy(rotation.setFromAxisAngle(axis, angle)).multiply(bind);
  };

  function arm(side: 1 | -1) {
    const suffix = side === 1 ? "L" : "R";
    const shoulder = bone(`upperarm01.${suffix}`);
    const elbow = bone(`lowerarm01.${suffix}`);
    const forearm = bone(`lowerarm02.${suffix}`);
    const wrist = bone(`wrist.${suffix}`);
    const fingers = FINGERS.map((name, index) => {
      const digit = name === "thumb" ? 1 : index + 2;
      const joints = (name === "thumb" ? [2, 3] : [1, 2, 3]).map((segment) => bone(`finger${digit}-${segment}.${suffix}`));
      return { name, joints };
    });

    const index = position(fingers[0].joints[0]);
    const middle = position(fingers[1].joints[0]);
    const little = position(fingers[3].joints[0]);
    const forward = middle.clone().sub(position(wrist)).normalize();
    const palm = little.sub(index).cross(forward).normalize().multiplyScalar(side);
    const across = forward.clone().cross(palm).normalize();
    const bindPalm = new THREE.Matrix4().makeBasis(across, forward, across.clone().cross(forward).normalize());
    const wristBind = wrist.getWorldQuaternion(new THREE.Quaternion());
    // Aim along the forearm at rest and show the palms at a slight angle.
    const restForward = new THREE.Vector3(side * 0.22, -0.64, 0.74).normalize();
    const restAcross = restForward.clone().cross(new THREE.Vector3(side * 0.25, 0.18, 1)).normalize();
    const restPalm = new THREE.Matrix4().makeBasis(restAcross, restForward, restAcross.clone().cross(restForward).normalize());
    const restingWrist = new THREE.Quaternion().setFromRotationMatrix(restPalm)
      .multiply(new THREE.Quaternion().setFromRotationMatrix(bindPalm).invert()).multiply(wristBind);

    const shoulderBind = shoulder.quaternion.clone();
    const shoulderLift = jointAxis(shoulder, X), shoulderSpread = jointAxis(shoulder, Z);
    const elbowBind = elbow.quaternion.clone();
    const forearmBind = forearm.quaternion.clone();
    const upperDirection = position(elbow).sub(position(shoulder));
    const alongForearm = position(wrist).sub(position(elbow)).normalize();
    const elbowBend = jointAxis(elbow, upperDirection.cross(alongForearm).normalize());
    const elbowSweep = jointAxis(elbow, Z);
    const forearmTwist = jointAxis(forearm, alongForearm);
    const grip = fingers.map(({ name, joints }) => joints.map((joint, segment) => {
      const next = joints[segment + 1];
      const direction = next
        ? position(next).sub(position(joint)).normalize()
        : Y.clone().applyQuaternion(joint.getWorldQuaternion(new THREE.Quaternion()));
      return {
        joint, bind: joint.quaternion.clone(), axis: jointAxis(joint, direction.cross(palm)),
        angle: name === "thumb" ? [0.55, 0.75][segment] : [1.05, 1.25, 0.75][segment],
      };
    }));

    const opposition = bone(`finger1-1.${suffix}`);
    const oppositionBind = opposition.quaternion.clone();
    const thumbTip = fingers[4].joints[1];
    const wristParent = new THREE.Quaternion();
    const thumbBase = new THREE.Vector3(), thumbGoal = new THREE.Vector3(), thumbNormal = new THREE.Vector3();
    const thumbMiddle = new THREE.Vector3(), thumbIndex = new THREE.Vector3(), thumbLittle = new THREE.Vector3();
    const thumbWrist = new THREE.Vector3(), thumbEnd = new THREE.Vector3();
    const thumbRotation = new THREE.Quaternion(), thumbParent = new THREE.Quaternion(), thumbDelta = new THREE.Quaternion();
    return (pose: ArmPose, yaw: number) => {
      // Retarget relative to the relaxed V2 arm: the old rig's angles assume vertical bind arms.
      const lift = THREE.MathUtils.clamp(pose.lift * 0.70, -0.1, 1.05);
      const spread = THREE.MathUtils.clamp(pose.spread * 0.42, -0.25, 0.42);
      const bend = THREE.MathUtils.clamp(pose.bend * 0.56, -0.25, 0.82);
      combined.setFromAxisAngle(shoulderLift, -lift).multiply(rotation.setFromAxisAngle(shoulderSpread, side * (spread - 0.46)));
      shoulder.quaternion.copy(combined).multiply(shoulderBind);
      combined.setFromAxisAngle(elbowSweep, side * pose.sweep * 0.84).multiply(rotation.setFromAxisAngle(elbowBend, 0.75 + bend));
      elbow.quaternion.copy(combined).multiply(elbowBind);
      elbow.rotateY(-side * 0.70);
      delta(forearm, forearmBind, forearmTwist, -side * 0.63);

      wrist.parent!.getWorldQuaternion(wristParent);
      combined.setFromAxisAngle(X, -bend * 1.22 - lift * 0.35).multiply(restingWrist)
        .premultiply(rotation.setFromAxisAngle(Y, yaw + side * pose.twist * 0.42))
        .premultiply(rotation.setFromAxisAngle(Z, side * spread * 1.32));
      wrist.quaternion.copy(wristParent.invert()).multiply(combined);

      grip.forEach((digit, i) => {
        const curl = THREE.MathUtils.clamp(pose.curl[i], 0, 1);
        for (const { joint, bind, axis, angle } of digit) delta(joint, bind, axis, curl * angle);
      });
      const thumb = THREE.MathUtils.clamp(pose.curl[4], 0, 1);
      opposition.quaternion.copy(oppositionBind);
      if (thumb > 0) {
        // Aim the thumb across the palm and keep a little clearance above the finger bases.
        wrist.updateWorldMatrix(true, true);
        opposition.getWorldPosition(thumbBase);
        thumbTip.localToWorld(thumbEnd.set(0, 0.06, 0));
        fingers[0].joints[0].getWorldPosition(thumbIndex);
        fingers[1].joints[0].getWorldPosition(thumbMiddle);
        fingers[3].joints[0].getWorldPosition(thumbLittle);
        wrist.getWorldPosition(thumbWrist);
        thumbNormal.copy(thumbLittle).sub(thumbIndex).cross(thumbGoal.copy(thumbMiddle).sub(thumbWrist)).normalize().multiplyScalar(side);
        thumbGoal.copy(thumbMiddle).addScaledVector(thumbNormal, 0.09);
        thumbRotation.setFromUnitVectors(thumbEnd.sub(thumbBase).normalize(), thumbGoal.sub(thumbBase).normalize());
        opposition.parent!.getWorldQuaternion(thumbParent);
        thumbRotation.premultiply(thumbDelta.copy(thumbParent).invert()).multiply(thumbParent);
        opposition.quaternion.premultiply(thumbDelta.identity().slerp(thumbRotation, thumb));
      }
    };
  }

  const dominantArm = arm(1), weakArm = arm(-1);
  const chest = bone("spine01");
  const head = bone("head");
  const headBind = head.quaternion.clone();
  const headAxes = [X, Y, Z].map((axis) => jointAxis(head, axis));
  const jaw = bone("jaw");
  const jawBind = jaw.quaternion.clone();
  const jawAxis = jointAxis(jaw, X);
  const brows = [-1, 1].map((side) => {
    const joint = bone(`oculi01.${side === 1 ? "L" : "R"}`);
    return { joint, bind: joint.quaternion.clone(), axis: jointAxis(joint, Z), side };
  });
  const lids = ["R", "L"].flatMap((side) =>
    [0.43, -0.10].map((angle, i) => {
      const joint = bone(`orbicularis0${i + 3}.${side}`);
      return { joint, bind: joint.quaternion.clone(), axis: jointAxis(joint, X), angle };
    }),
  );

  function pose(frame: PortraitPose) {
    chest.scale.y = 1 + frame.breath * 0.003;
    root.position.y = frame.breath * 0.008;
    head.quaternion.copy(combined.setFromAxisAngle(headAxes[1], frame.yaw)
      .multiply(rotation.setFromAxisAngle(headAxes[0], frame.pitch))
      .multiply(rotation.setFromAxisAngle(headAxes[2], frame.tilt))).multiply(headBind);
    brows.forEach(({ joint, bind, axis, side }) => delta(joint, bind, axis, side * frame.brow * 0.115));
    lids.forEach(({ joint, bind, axis, angle }) => delta(joint, bind, axis, frame.blink * angle));
    delta(jaw, jawBind, jawAxis, frame.jaw * 0.13);
    dominantArm(frame.dominant, frame.yaw * 0.3);
    weakArm(frame.weak, frame.yaw * 0.3);
  }

  return { root, pose, dispose };
}
