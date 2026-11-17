import {
  BoxGeometry,
  Color,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  type Vector3,
} from 'three';
import { BALL_RADIUS } from '../../../shared/constants/game';
import type { Aim } from '../controls/ShotControls';

const LOW_POWER = new Color('#4ade80');
const MID_POWER = new Color('#facc15');
const HIGH_POWER = new Color('#ef4444');
const MIN_LENGTH = 0.5;
const MAX_LENGTH = 3.2;
const HEAD_LENGTH = 0.32;

export type AimIndicator = {
  group: Group;
  /** Called every frame by the engine with the ball's current position. */
  update: (
    ballPosition: Vector3,
    ready: boolean,
    aim: Aim | null,
    elapsed: number
  ) => void;
};

/**
 * Unlit ring under the ball (shows it's your turn) and an arrow whose length
 * and colour show shot power. Unlit materials keep it readable in shadow.
 */
export const createAimIndicator = (): AimIndicator => {
  const group = new Group();
  group.name = 'aim-indicator';

  const ringMaterial = new MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const ring = new Mesh(
    new RingGeometry(BALL_RADIUS * 1.5, BALL_RADIUS * 1.9, 32),
    ringMaterial
  );
  ring.rotation.x = -Math.PI / 2;

  const arrowMaterial = new MeshBasicMaterial({ color: LOW_POWER });
  const arrow = new Group();
  // Unit-length shaft along +X, scaled per frame.
  const shaftGeometry = new BoxGeometry(1, 0.04, 0.12);
  shaftGeometry.translate(0.5, 0, 0);
  const shaft = new Mesh(shaftGeometry, arrowMaterial);
  const headGeometry = new ConeGeometry(0.2, HEAD_LENGTH, 12);
  headGeometry.rotateZ(-Math.PI / 2); // point along +X
  headGeometry.translate(HEAD_LENGTH / 2, 0, 0);
  const head = new Mesh(headGeometry, arrowMaterial);
  arrow.add(shaft, head);

  group.add(ring, arrow);
  group.visible = false;

  return {
    group,
    update: (ballPosition, ready, aim, elapsed) => {
      group.visible = ready;
      if (!ready) return;
      group.position.set(ballPosition.x, 0.02, ballPosition.z);

      const pulse = 1 + Math.sin(elapsed * 4) * 0.08;
      ring.scale.setScalar(aim ? 1 : pulse);

      arrow.visible = aim !== null;
      if (!aim) return;
      const length = MIN_LENGTH + (MAX_LENGTH - MIN_LENGTH) * aim.power;
      shaft.scale.x = length;
      shaft.position.x = BALL_RADIUS * 1.5;
      head.position.x = BALL_RADIUS * 1.5 + length;
      arrow.rotation.y = Math.atan2(-aim.direction.z, aim.direction.x);
      arrowMaterial.color.lerpColors(
        aim.power < 0.5 ? LOW_POWER : MID_POWER,
        aim.power < 0.5 ? MID_POWER : HIGH_POWER,
        aim.power < 0.5 ? aim.power * 2 : (aim.power - 0.5) * 2
      );
    },
  };
};
