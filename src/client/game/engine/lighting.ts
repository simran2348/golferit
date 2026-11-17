import {
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  Sphere,
  Vector3,
} from 'three';

/** Sun from the front-right of the camera so shadows fall behind objects. */
const SUN_DIRECTION = new Vector3(0.55, 1, 0.35).normalize();

export const createLighting = (
  shadowBounds: Box3,
  shadowMapSize: number
): Group => {
  const group = new Group();
  group.name = 'lighting';

  // Sky/ground fill gives low-poly faces distinct but soft shading.
  const hemi = new HemisphereLight('#dff4ff', '#5b7a3a', 1.6);
  group.add(hemi);

  const sphere = shadowBounds.getBoundingSphere(new Sphere());
  const sun = new DirectionalLight('#fff4dc', 2.4);
  sun.position
    .copy(sphere.center)
    .addScaledVector(SUN_DIRECTION, sphere.radius * 2);
  sun.target.position.copy(sphere.center);
  sun.castShadow = true;

  // Tight shadow frustum around the scene = crisp shadows at a small map size.
  const shadowCam = sun.shadow.camera;
  shadowCam.left = -sphere.radius;
  shadowCam.right = sphere.radius;
  shadowCam.top = sphere.radius;
  shadowCam.bottom = -sphere.radius;
  shadowCam.near = 0.5;
  shadowCam.far = sphere.radius * 4;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;

  group.add(sun, sun.target);
  return group;
};
