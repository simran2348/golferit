import { Box3, Group, Vector3, type Mesh } from 'three';
import type { CourseDefinition } from '../../../shared/types/course';
import type { Updatable } from '../engine/types';
import { createBall, createTee } from './ball';
import { createBridges } from './bridges';
import { createCup } from './cup';
import type { Materials } from './materials';
import { createObstacles } from './obstacles';
import { createScenery } from './scenery';
import { createTerrain } from './terrain';
import { createWalls } from './walls';

const FRAMING_MIN_Y = -1.5;
const FRAMING_MAX_Y = 2.5;

export type CourseScene = {
  root: Group;
  ball: Mesh;
  updatables: Updatable[];
  /** What the camera should keep in frame: the main island and its props. */
  framingPoints: Vector3[];
  framingCenter: Vector3;
  /** What casts/receives sun shadows: everything including the islets. */
  shadowBounds: Box3;
};

/** Build the complete renderable course from shared course data. */
export const createCourseScene = (
  course: CourseDefinition,
  materials: Materials
): CourseScene => {
  const root = new Group();
  root.name = `course-${course.id}`;

  const terrain = createTerrain(course, materials);
  const ball = createBall(materials);
  const cup = createCup(course.cup, materials);
  const obstacles = createObstacles(course.obstacles, materials);
  const scenery = createScenery(course.scenery, course.islets, materials);

  root.add(
    terrain.group,
    createWalls(course.outline, materials),
    createBridges(course.bridges, materials),
    createTee(course.tee, ball, materials),
    cup.group,
    obstacles.group,
    scenery.group
  );

  // Island outline at the height of the hanging rocks and of the tallest
  // props (windmill roof, flag) so nothing important is clipped.
  const framingPoints = terrain.islandOutline.flatMap((p) => [
    new Vector3(p.x, FRAMING_MIN_Y, p.z),
    new Vector3(p.x, FRAMING_MAX_Y, p.z),
  ]);
  const framingCenter = new Box3()
    .setFromPoints(framingPoints)
    .getCenter(new Vector3());
  const shadowBounds = new Box3().setFromObject(root);

  return {
    root,
    ball,
    updatables: [cup.updatable, ...obstacles.updatables, ...scenery.updatables],
    framingPoints,
    framingCenter,
    shadowBounds,
  };
};
