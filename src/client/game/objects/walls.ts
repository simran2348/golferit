import { BoxGeometry, Group, Mesh } from 'three';
import type { Vec2 } from '../../../shared/types/course';
import {
  buildCornerPosts,
  buildWallSegments,
} from '../../../shared/course/geometry';
import {
  WALL_BASE_Y,
  WALL_HEIGHT,
  WALL_POST_SIZE,
  WALL_THICKNESS,
} from '../../../shared/constants/game';
import type { Materials } from './materials';

const POST_HEIGHT = WALL_HEIGHT + 0.1;

/**
 * Wooden boundary: one box per outline edge plus a darker post at each corner
 * that hides the joints. Same shared geometry as the physics colliders.
 */
export const createWalls = (outline: Vec2[], materials: Materials): Group => {
  const group = new Group();
  group.name = 'walls';
  const height = WALL_HEIGHT - WALL_BASE_Y;
  const postHeight = POST_HEIGHT - WALL_BASE_Y;

  // One unit box scaled per wall keeps a single shared geometry.
  const unitBox = new BoxGeometry(1, 1, 1);
  const segments = buildWallSegments(outline, WALL_THICKNESS);

  for (const segment of segments) {
    const wall = new Mesh(unitBox, materials.wood);
    wall.scale.set(segment.length, height, WALL_THICKNESS);
    wall.position.set(
      segment.center.x,
      WALL_BASE_Y + height / 2,
      segment.center.z
    );
    wall.rotation.y = segment.rotationY;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  }

  for (const corner of buildCornerPosts(segments, WALL_THICKNESS)) {
    const post = new Mesh(unitBox, materials.woodDark);
    post.scale.set(WALL_POST_SIZE, postHeight, WALL_POST_SIZE);
    post.position.set(
      corner.center.x,
      WALL_BASE_Y + postHeight / 2,
      corner.center.z
    );
    post.rotation.y = corner.rotationY;
    post.castShadow = true;
    group.add(post);
  }

  return group;
};
