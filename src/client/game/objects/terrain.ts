import {
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Mesh,
  ConeGeometry,
  Object3D,
  Path,
  Shape,
  ShapeGeometry,
} from 'three';
import type { CourseDefinition, Vec2 } from '../../../shared/types/course';
import {
  isPointInPolygon,
  offsetPolygon,
  polygonBounds,
} from '../../../shared/course/geometry';
import { CUP_RADIUS, ISLAND_MARGIN } from '../../../shared/constants/game';
import type { Materials } from './materials';
import { createRandom } from './random';

const FAIRWAY_THICKNESS = 0.06;
const ISLAND_THICKNESS = 0.9;
export const WATER_LEVEL = -0.14;

/*
 * Shapes are drawn in 2D (x, y) then rotated flat. Rotating -90° about X maps
 * shape (x, y) to world (x, -y), so we feed -z as the shape's y coordinate.
 */
const toShapePoints = <T extends Shape | Path>(
  target: T,
  points: Vec2[]
): T => {
  points.forEach((p, i) =>
    i === 0 ? target.moveTo(p.x, -p.z) : target.lineTo(p.x, -p.z)
  );
  target.closePath();
  return target;
};

/** Outline with the cup and water hazards cut out as real holes. */
const createCutShape = (outline: Vec2[], course: CourseDefinition): Shape => {
  const shape = toShapePoints(new Shape(), outline);
  const cup = new Path();
  cup.absarc(course.cup.x, -course.cup.z, CUP_RADIUS, 0, Math.PI * 2, false);
  shape.holes.push(cup);
  for (const pond of course.water) {
    shape.holes.push(toShapePoints(new Path(), pond.outline));
  }
  return shape;
};

/** Extrude a shape downward from `topY` by `depth`. Groups: 0 = caps, 1 = sides. */
const extrudeDown = (
  shape: Shape,
  depth: number,
  topY: number,
  curveSegments: number
): ExtrudeGeometry => {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, topY - depth, 0);
  return geometry;
};

/** Inverted rock cones hanging under the island give the floating look. */
const createUnderside = (
  islandOutline: Vec2[],
  materials: Materials,
  seed: string
): InstancedMesh => {
  const random = createRandom(seed);
  const bounds = polygonBounds(islandOutline);
  const spacing = 1.6;
  const points: Vec2[] = [];
  for (let x = bounds.minX + 0.6; x <= bounds.maxX - 0.4; x += spacing) {
    for (let z = bounds.minZ + 0.6; z <= bounds.maxZ - 0.4; z += spacing) {
      const p = {
        x: x + (random() - 0.5) * 0.8,
        z: z + (random() - 0.5) * 0.8,
      };
      if (isPointInPolygon(p, islandOutline)) points.push(p);
    }
  }

  const geometry = new ConeGeometry(1, 1, 6);
  geometry.rotateX(Math.PI); // tip pointing down
  geometry.translate(0, -0.5, 0); // base at y = 0
  const mesh = new InstancedMesh(
    geometry,
    materials.rockUnderside,
    points.length
  );
  const dummy = new Object3D();
  points.forEach((p, i) => {
    const radius = 0.9 + random() * 0.7;
    dummy.position.set(p.x, -ISLAND_THICKNESS + 0.05, p.z);
    dummy.scale.set(radius, 1.2 + random() * 2.4, radius);
    dummy.rotation.y = random() * Math.PI;
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.castShadow = true;
  mesh.name = 'island-underside';
  return mesh;
};

export const createTerrain = (
  course: CourseDefinition,
  materials: Materials
): { group: Group; islandOutline: Vec2[] } => {
  const group = new Group();
  group.name = 'terrain';

  // Putting surface (striped), top at y = 0.
  const fairway = new Mesh(
    extrudeDown(
      createCutShape(course.outline, course),
      FAIRWAY_THICKNESS,
      0,
      24
    ),
    [materials.fairway, materials.dirt]
  );
  fairway.receiveShadow = true;
  fairway.name = 'fairway';

  // Island body: rough grass on top, dirt sides; sits right under the fairway.
  const islandOutline = offsetPolygon(course.outline, ISLAND_MARGIN);
  const island = new Mesh(
    extrudeDown(
      createCutShape(islandOutline, course),
      ISLAND_THICKNESS,
      -FAIRWAY_THICKNESS,
      24
    ),
    [materials.rough, materials.dirt]
  );
  island.receiveShadow = true;
  island.castShadow = true;
  island.name = 'island';

  group.add(
    fairway,
    island,
    createUnderside(islandOutline, materials, course.id)
  );

  // Water hazards: a flat surface sunk below the grass inside each cut-out.
  for (const pond of course.water) {
    const geometry = new ShapeGeometry(
      toShapePoints(new Shape(), pond.outline)
    );
    geometry.rotateX(-Math.PI / 2);
    const water = new Mesh(geometry, materials.water);
    water.position.y = WATER_LEVEL;
    water.receiveShadow = true;
    water.name = `water-${pond.id}`;
    group.add(water);
  }

  return { group, islandOutline };
};
