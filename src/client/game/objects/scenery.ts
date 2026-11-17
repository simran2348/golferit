import {
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  type BufferGeometry,
} from 'three';
import type { Islet, SceneryItem } from '../../../shared/types/course';
import type { Updatable } from '../engine/types';
import type { Materials } from './materials';

/** Geometries shared by every tree/rock in the scene. */
const createSceneryGeometries = () => {
  const trunk = new CylinderGeometry(0.08, 0.12, 0.5, 5);
  trunk.translate(0, 0.25, 0);
  const foliageLow = new ConeGeometry(0.6, 1.0, 6);
  foliageLow.translate(0, 0.9, 0);
  const foliageHigh = new ConeGeometry(0.42, 0.8, 6);
  foliageHigh.translate(0, 1.4, 0);
  const rock = new DodecahedronGeometry(0.35, 0);
  rock.translate(0, 0.12, 0);
  return { trunk, foliageLow, foliageHigh, rock };
};

type SceneryGeometries = ReturnType<typeof createSceneryGeometries>;

const mesh = (geometry: BufferGeometry, material: Mesh['material']): Mesh => {
  const m = new Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

const createSceneryItem = (
  item: SceneryItem,
  baseY: number,
  geometries: SceneryGeometries,
  materials: Materials
): Group => {
  const group = new Group();
  group.position.set(item.position.x, baseY, item.position.z);
  group.scale.setScalar(item.scale);
  // Rotate by position so identical props don't look copy-pasted.
  group.rotation.y =
    (item.position.x * 7 + item.position.z * 13) % (Math.PI * 2);

  if (item.kind === 'tree') {
    group.add(
      mesh(geometries.trunk, materials.trunk),
      mesh(geometries.foliageLow, materials.foliage),
      mesh(geometries.foliageHigh, materials.foliage)
    );
  } else {
    group.add(mesh(geometries.rock, materials.rock));
  }
  return group;
};

const ISLET_THICKNESS = 0.45;

/** Small decorative floating island that bobs gently. */
const createIslet = (
  islet: Islet,
  geometries: SceneryGeometries,
  materials: Materials,
  index: number
): { group: Group; updatable: Updatable } => {
  const group = new Group();
  group.name = islet.id;
  group.position.set(islet.position.x, islet.position.y, islet.position.z);

  // CylinderGeometry groups: 0 = side, 1 = top, 2 = bottom.
  const top = mesh(
    new CylinderGeometry(islet.radius, islet.radius * 0.92, ISLET_THICKNESS, 9),
    [materials.dirt, materials.rough, materials.dirt]
  );
  top.position.y = -ISLET_THICKNESS / 2;

  const underside = mesh(
    new ConeGeometry(islet.radius * 0.9, islet.radius * 1.5, 9),
    materials.rockUnderside
  );
  underside.rotation.x = Math.PI;
  underside.position.y = -ISLET_THICKNESS - islet.radius * 0.75;

  group.add(top, underside);
  for (const item of islet.scenery) {
    group.add(createSceneryItem(item, 0, geometries, materials));
  }

  const baseY = islet.position.y;
  const phase = index * 1.7;
  return {
    group,
    updatable: {
      update: (elapsed) => {
        group.position.y = baseY + Math.sin(elapsed * 0.6 + phase) * 0.12;
      },
    },
  };
};

export const createScenery = (
  scenery: SceneryItem[],
  islets: Islet[],
  materials: Materials
): { group: Group; updatables: Updatable[] } => {
  const group = new Group();
  group.name = 'scenery';
  const geometries = createSceneryGeometries();

  for (const item of scenery) {
    // Rough grass on the island sits just below the putting surface.
    group.add(createSceneryItem(item, -0.06, geometries, materials));
  }

  const updatables = islets.map((islet, i) => {
    const created = createIslet(islet, geometries, materials, i);
    group.add(created.group);
    return created.updatable;
  });

  return { group, updatables };
};
