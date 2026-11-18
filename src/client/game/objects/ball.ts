import { BoxGeometry, Group, Mesh, SphereGeometry } from 'three';
import type { Vec2 } from '../../../shared/types/course';
import { BALL_RADIUS } from '../../../shared/constants/game';
import type { Materials } from './materials';

const TEE_MAT_SIZE = 1.1;
/** Thin so the physics ball (resting on y = 0) doesn't visibly sink into it. */
const TEE_MAT_HEIGHT = 0.008;

export const createBall = (materials: Materials): Mesh => {
  const ball = new Mesh(
    new SphereGeometry(BALL_RADIUS, 32, 24),
    materials.ball
  );
  ball.name = 'ball';
  ball.castShadow = true;
  return ball;
};

/** Rubber tee mat with the ball resting on it. */
export const createTee = (
  position: Vec2,
  ball: Mesh,
  materials: Materials
): Group => {
  const group = new Group();
  group.name = 'tee';

  const mat = new Mesh(
    new BoxGeometry(TEE_MAT_SIZE, TEE_MAT_HEIGHT, TEE_MAT_SIZE),
    materials.teeMat
  );
  mat.position.set(position.x, TEE_MAT_HEIGHT / 2, position.z);
  mat.receiveShadow = true;

  ball.position.set(position.x, TEE_MAT_HEIGHT + BALL_RADIUS, position.z);
  group.add(mat, ball);
  return group;
};
