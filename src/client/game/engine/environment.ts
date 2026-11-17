import {
  BufferAttribute,
  Color,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  type Scene,
} from 'three';
import type { Updatable } from './types';

const OCEAN_COLOR = '#2fa6d9';
const OCEAN_LEVEL = -6;

/**
 * Low-poly ocean far below the floating islands. Because the camera looks
 * down, the ocean fills the whole background. Gentle CPU waves on a coarse
 * grid (~1k vertices) are cheap even on mobile.
 */
export const createEnvironment = (
  scene: Scene
): { ocean: Mesh; updatable: Updatable } => {
  scene.background = new Color(OCEAN_COLOR);

  const geometry = new PlaneGeometry(90, 90, 30, 30);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  if (!(position instanceof BufferAttribute)) {
    throw new Error('Ocean geometry is missing a position attribute');
  }
  const baseY = Float32Array.from({ length: position.count }, (_, i) =>
    position.getY(i)
  );

  const ocean = new Mesh(
    geometry,
    new MeshLambertMaterial({ color: OCEAN_COLOR, flatShading: true })
  );
  ocean.name = 'ocean';
  ocean.position.y = OCEAN_LEVEL;
  ocean.receiveShadow = true;

  const updatable: Updatable = {
    update: (elapsed) => {
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        position.setY(
          i,
          baseY[i]! +
            Math.sin(x * 0.45 + elapsed * 0.9) * 0.18 +
            Math.cos(z * 0.38 + elapsed * 0.7) * 0.18
        );
      }
      position.needsUpdate = true;
    },
  };

  return { ocean, updatable };
};
