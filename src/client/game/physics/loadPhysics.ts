import type { PhysicsWorld } from './PhysicsWorld';

type PhysicsWorldConstructor = typeof PhysicsWorld;

let loading: Promise<PhysicsWorldConstructor> | null = null;

/**
 * Load Rapier and the physics world in a separate chunk. The compat build
 * inlines its WASM as base64 (~1.8 MB gzipped), so keeping it out of the main
 * bundle lets the course render immediately while physics streams in.
 * A failed load is not cached, so a later mount can retry.
 */
export const loadPhysics = (): Promise<PhysicsWorldConstructor> => {
  loading ??= Promise.all([
    import('@dimforge/rapier3d-compat'),
    import('./PhysicsWorld'),
  ])
    .then(async ([rapier, physicsModule]) => {
      await rapier.init();
      return physicsModule.PhysicsWorld;
    })
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
};
