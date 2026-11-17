import {
  BufferGeometry,
  InstancedMesh,
  Material,
  Mesh,
  Object3D,
  Texture,
  type WebGLRenderer,
} from 'three';

/**
 * Release every GPU resource reachable from `root`. Geometries and materials
 * are shared between meshes, so collect unique instances first.
 */
export const disposeObject3D = (root: Object3D): void => {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();

  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (object.geometry instanceof BufferGeometry) {
      geometries.add(object.geometry);
    }
    const objectMaterials: unknown[] = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of objectMaterials) {
      if (!(material instanceof Material)) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof Texture) textures.add(value);
      }
    }
    // InstancedMesh owns its instance-matrix buffers.
    if (object instanceof InstancedMesh) object.dispose();
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
};

export const disposeRenderer = (renderer: WebGLRenderer): void => {
  renderer.setAnimationLoop(null);
  renderer.dispose();
  // Free the WebGL context immediately rather than waiting for GC. Browsers cap
  // live contexts (~16) and React StrictMode/remounts would otherwise leak them.
  renderer.forceContextLoss();
  renderer.domElement.remove();
};
