import * as THREE from "three";

/** SwiftShader/slow GPUs pay heavily for bone-texture reads at every vertex.
 * Bake the same weighted deformation into dynamic buffers only after the viewer
 * detects a slow renderer. The normal hardware path remains GPU skinning.
 */
export function createSoftwareSkinning(sources: THREE.SkinnedMesh[]) {
  const materials = new Map<THREE.Material, THREE.MeshLambertMaterial>();
  const economicalMaterial = (source: THREE.Material) => {
    if (!materials.has(source)) {
      const surface = source as THREE.MeshStandardMaterial;
      materials.set(source, new THREE.MeshLambertMaterial({
        color: surface.color, emissive: surface.emissive, map: surface.map,
        vertexColors: surface.vertexColors, side: surface.side,
        transparent: surface.transparent, opacity: surface.opacity,
      }));
    }
    return materials.get(source)!;
  };
  const entries = sources.map((source) => {
    const geometry = source.geometry.clone();
    for (const name of ["position", "normal"]) {
      const attribute = geometry.getAttribute(name);
      if (attribute instanceof THREE.InterleavedBufferAttribute) attribute.data.setUsage(THREE.DynamicDrawUsage);
      else attribute.setUsage(THREE.DynamicDrawUsage);
    }
    // Retain the studio lights and colours with cheaper diffuse shading.
    const mesh = new THREE.Mesh(geometry, Array.isArray(source.material) ? source.material.map(economicalMaterial) : economicalMaterial(source.material));
    mesh.name = `${source.name}.software`;
    mesh.position.copy(source.position); mesh.quaternion.copy(source.quaternion); mesh.scale.copy(source.scale);
    mesh.frustumCulled = false;
    source.parent!.add(mesh); source.visible = false;
    return { source, mesh };
  });
  const matrix = new THREE.Matrix4();
  const palette = new Float32Array(Math.max(...sources.map((mesh) => mesh.skeleton.bones.length)) * 16);
  function update() {
    let previous: THREE.SkinnedMesh | undefined;
    for (const { source, mesh } of entries) {
      if (!previous || source.skeleton !== previous.skeleton || !source.bindMatrix.equals(previous.bindMatrix) || !source.bindMatrixInverse.equals(previous.bindMatrixInverse)) {
        source.skeleton.update();
        for (let i = 0; i < source.skeleton.bones.length; i++) {
          matrix.fromArray(source.skeleton.boneMatrices, i * 16).premultiply(source.bindMatrixInverse).multiply(source.bindMatrix);
          matrix.toArray(palette, i * 16);
        }
      }
      previous = source;
      const original = source.geometry;
      const positions = original.getAttribute("position"), normals = original.getAttribute("normal");
      const indices = original.getAttribute("skinIndex"), weights = original.getAttribute("skinWeight");
      const result = mesh.geometry.getAttribute("position"), normalResult = mesh.geometry.getAttribute("normal");
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        const nx = normals.getX(i), ny = normals.getY(i), nz = normals.getZ(i);
        let px = 0, py = 0, pz = 0, dx = 0, dy = 0, dz = 0;
        for (let j = 0; j < 4; j++) {
          const weight = weights.getComponent(i, j);
          if (!weight) continue;
          const b = indices.getComponent(i, j) * 16, m = palette;
          px += weight * (m[b] * x + m[b + 4] * y + m[b + 8] * z + m[b + 12]);
          py += weight * (m[b + 1] * x + m[b + 5] * y + m[b + 9] * z + m[b + 13]);
          pz += weight * (m[b + 2] * x + m[b + 6] * y + m[b + 10] * z + m[b + 14]);
          dx += weight * (m[b] * nx + m[b + 4] * ny + m[b + 8] * nz);
          dy += weight * (m[b + 1] * nx + m[b + 5] * ny + m[b + 9] * nz);
          dz += weight * (m[b + 2] * nx + m[b + 6] * ny + m[b + 10] * nz);
        }
        result.setXYZ(i, px, py, pz); normalResult.setXYZ(i, dx, dy, dz);
      }
      result.needsUpdate = normalResult.needsUpdate = true;
    }
  }
  return { update, meshes: entries.map(({ mesh }) => mesh), dispose() {
    entries.forEach(({ source, mesh }) => { mesh.removeFromParent(); mesh.geometry.dispose(); source.visible = true; });
    materials.forEach((material) => material.dispose());
  } };
}
