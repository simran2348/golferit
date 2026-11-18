import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  SphereGeometry,
} from 'three';
import type {
  BumperObstacle,
  Obstacle,
  RampObstacle,
  SliderObstacle,
  SpinnerObstacle,
  TunnelObstacle,
  WallObstacle,
  WindmillObstacle,
} from '../../../shared/types/course';
import {
  rampProfile,
  sliderOffset,
  spinnerAngle,
  windmillBladeAngle,
} from '../../../shared/course/obstacles';
import {
  BUMPER_HEIGHT,
  PARTITION_THICKNESS,
  SLIDER_HEIGHT,
  SPINNER_ARM_HEIGHT,
  SPINNER_ARM_THICKNESS,
  SPINNER_POST_RADIUS,
  TUNNEL_WALL_HEIGHT,
  WALL_BASE_Y,
  WALL_HEIGHT,
  WINDMILL,
} from '../../../shared/constants/game';
import type { Updatable } from '../engine/types';
import type { Materials } from './materials';

const shadowed = (mesh: Mesh): Mesh => {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

/**
 * Windmill with a tunnel through its base. Local frame: tunnel runs along X,
 * blades sit on the -X face and sweep across the tunnel entrance.
 */
const createWindmill = (
  windmill: WindmillObstacle,
  materials: Materials
): { group: Group; updatable: Updatable } => {
  const group = new Group();
  group.name = windmill.id;
  group.position.set(windmill.position.x, 0, windmill.position.z);
  group.rotation.y = windmill.rotationY;

  const { baseDepth, baseWidth, baseHeight, tunnelWidth, tunnelHeight } =
    WINDMILL;
  const sideWidth = (baseWidth - tunnelWidth) / 2;
  const sideGeometry = new BoxGeometry(baseDepth, baseHeight, sideWidth);
  for (const side of [-1, 1]) {
    const block = shadowed(new Mesh(sideGeometry, materials.windmillBody));
    block.position.set(
      0,
      baseHeight / 2,
      (side * (tunnelWidth + sideWidth)) / 2
    );
    group.add(block);
  }
  const lintel = shadowed(
    new Mesh(
      new BoxGeometry(baseDepth, baseHeight - tunnelHeight, tunnelWidth),
      materials.windmillBody
    )
  );
  lintel.position.y = tunnelHeight + (baseHeight - tunnelHeight) / 2;

  const tower = shadowed(
    new Mesh(
      new CylinderGeometry(0.62, 0.8, WINDMILL.towerHeight, 8),
      materials.windmillBody
    )
  );
  tower.position.y = baseHeight + WINDMILL.towerHeight / 2;

  const roof = shadowed(
    new Mesh(new ConeGeometry(0.95, 1.0, 8), materials.windmillRoof)
  );
  roof.position.y = baseHeight + WINDMILL.towerHeight + 0.5;

  // Wooden trim around the tunnel mouth.
  const trim = shadowed(
    new Mesh(new BoxGeometry(0.08, 0.1, tunnelWidth + 0.2), materials.woodDark)
  );
  trim.position.set(-baseDepth / 2 - 0.04, tunnelHeight + 0.05, 0);

  const hub = shadowed(
    new Mesh(new CylinderGeometry(0.13, 0.13, 0.22, 8), materials.woodDark)
  );
  hub.rotation.z = Math.PI / 2;
  hub.position.set(WINDMILL.hubX, WINDMILL.hubHeight, 0);

  const blades = new Group();
  blades.position.set(WINDMILL.bladePivotX, WINDMILL.hubHeight, 0);
  const bladeGeometry = new BoxGeometry(
    WINDMILL.bladeThickness,
    WINDMILL.bladeLength,
    WINDMILL.bladeWidth
  );
  bladeGeometry.translate(
    0,
    WINDMILL.bladeLength / 2 + WINDMILL.bladeOffset,
    0
  );
  for (let i = 0; i < WINDMILL.bladeCount; i++) {
    const blade = shadowed(new Mesh(bladeGeometry, materials.windmillBlade));
    blade.rotation.x = (i * Math.PI * 2) / WINDMILL.bladeCount;
    blades.add(blade);
  }

  group.add(lintel, tower, roof, trim, hub, blades);

  return {
    group,
    updatable: {
      update: (elapsed) => {
        blades.rotation.x = windmillBladeAngle(windmill, elapsed);
      },
    },
  };
};

const createBumper = (bumper: BumperObstacle, materials: Materials): Group => {
  const group = new Group();
  group.name = bumper.id;
  group.position.set(bumper.position.x, 0, bumper.position.z);

  const body = shadowed(
    new Mesh(
      new CylinderGeometry(bumper.radius, bumper.radius, BUMPER_HEIGHT, 12),
      materials.bumper
    )
  );
  body.position.y = BUMPER_HEIGHT / 2;
  const cap = shadowed(
    new Mesh(
      new CylinderGeometry(bumper.radius * 0.7, bumper.radius, 0.08, 12),
      materials.white
    )
  );
  cap.position.y = BUMPER_HEIGHT + 0.04;
  group.add(body, cap);
  return group;
};

/** Striped block on a rail; pose is a pure function of time like the windmill. */
const createSlider = (
  slider: SliderObstacle,
  materials: Materials
): { group: Group; updatable: Updatable } => {
  const group = new Group();
  group.name = slider.id;
  group.position.set(slider.position.x, 0, slider.position.z);
  group.rotation.y = slider.rotationY;

  // Rail groove showing the travel range.
  const rail = new Mesh(
    new BoxGeometry(slider.travel * 2 + slider.length, 0.012, 0.12),
    materials.woodDark
  );
  rail.position.y = 0.006;
  rail.receiveShadow = true;

  const block = new Group();
  const body = shadowed(
    new Mesh(
      new BoxGeometry(slider.length, SLIDER_HEIGHT, slider.width),
      materials.bumper
    )
  );
  body.position.y = SLIDER_HEIGHT / 2;
  const stripe = shadowed(
    new Mesh(
      new BoxGeometry(
        slider.length * 0.3,
        SLIDER_HEIGHT + 0.01,
        slider.width + 0.01
      ),
      materials.white
    )
  );
  stripe.position.y = SLIDER_HEIGHT / 2;
  block.add(body, stripe);
  group.add(rail, block);

  return {
    group,
    updatable: {
      update: (elapsed) => {
        block.position.x = sliderOffset(slider, elapsed);
      },
    },
  };
};

/** Stone side walls with a flattened half-pipe roof the ball rolls under. */
const createTunnel = (tunnel: TunnelObstacle, materials: Materials): Group => {
  const group = new Group();
  group.name = tunnel.id;
  group.position.set(tunnel.position.x, 0, tunnel.position.z);
  group.rotation.y = tunnel.rotationY;

  const sideWidth = (tunnel.outerWidth - tunnel.innerWidth) / 2;
  const sideGeometry = new BoxGeometry(
    tunnel.length,
    TUNNEL_WALL_HEIGHT,
    sideWidth
  );
  for (const side of [-1, 1]) {
    const wall = shadowed(new Mesh(sideGeometry, materials.stone));
    wall.position.set(
      0,
      TUNNEL_WALL_HEIGHT / 2,
      (side * (tunnel.innerWidth + sideWidth)) / 2
    );
    group.add(wall);
  }

  // Half cylinder: axis along X, open side facing down.
  const radius = tunnel.outerWidth / 2;
  const roofGeometry = new CylinderGeometry(
    radius,
    radius,
    tunnel.length,
    14,
    1,
    true,
    0,
    Math.PI
  );
  roofGeometry.rotateZ(Math.PI / 2);
  const roof = shadowed(new Mesh(roofGeometry, materials.tunnelRoof));
  roof.position.y = TUNNEL_WALL_HEIGHT;
  roof.scale.y = 0.55;

  // Trim rings at both mouths.
  const trimGeometry = new CylinderGeometry(
    radius + 0.05,
    radius + 0.05,
    0.12,
    14,
    1,
    true,
    0,
    Math.PI
  );
  trimGeometry.rotateZ(Math.PI / 2);
  for (const end of [-1, 1]) {
    const trim = shadowed(new Mesh(trimGeometry, materials.woodDark));
    trim.position.set((end * tunnel.length) / 2, TUNNEL_WALL_HEIGHT, 0);
    trim.scale.y = 0.55;
    group.add(trim);
  }

  group.add(roof);
  return group;
};

/** Turf hump with wooden side cheeks; same profile as the physics hull. */
const createRamp = (ramp: RampObstacle, materials: Materials): Group => {
  const group = new Group();
  group.name = ramp.id;
  group.position.set(ramp.position.x, 0, ramp.position.z);
  group.rotation.y = ramp.rotationY;

  const profile = rampProfile(ramp);
  const shape = new Shape();
  profile.forEach(([along, height], i) => {
    if (i === 0) shape.moveTo(along, height);
    else shape.lineTo(along, height);
  });
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: ramp.width,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -ramp.width / 2);
  // Group 0 = the two end caps (wooden cheeks), group 1 = slopes and top.
  const mesh = shadowed(
    new Mesh(geometry, [materials.wood, materials.rampTurf])
  );
  // Sit a hair above the fairway so the base edge doesn't flicker.
  mesh.position.y = 0.002;

  // White lips where the slopes meet the top: reads clearly from above.
  const lipGeometry = new BoxGeometry(0.05, 0.012, ramp.width * 0.98);
  for (const side of [-1, 1]) {
    const lip = new Mesh(lipGeometry, materials.white);
    lip.position.set((side * ramp.topLength) / 2, ramp.height + 0.006, 0);
    group.add(lip);
  }
  group.add(mesh);
  return group;
};

/** Striped bar on a post, spinning flat on the ground. */
const createSpinner = (
  spinner: SpinnerObstacle,
  materials: Materials
): { group: Group; updatable: Updatable } => {
  const group = new Group();
  group.name = spinner.id;
  group.position.set(spinner.position.x, 0, spinner.position.z);

  const rotor = new Group();
  const armLength = spinner.armLength * 2;
  const arm = shadowed(
    new Mesh(
      new BoxGeometry(armLength, SPINNER_ARM_HEIGHT, SPINNER_ARM_THICKNESS),
      materials.bumper
    )
  );
  arm.position.y = 0.02 + SPINNER_ARM_HEIGHT / 2;
  // White bands near the tips make the rotation easy to read.
  const bandGeometry = new BoxGeometry(
    0.1,
    SPINNER_ARM_HEIGHT + 0.01,
    SPINNER_ARM_THICKNESS + 0.01
  );
  for (const side of [-1, 1]) {
    const band = new Mesh(bandGeometry, materials.white);
    band.position.set(side * (spinner.armLength - 0.12), arm.position.y, 0);
    rotor.add(band);
  }
  const post = shadowed(
    new Mesh(
      new CylinderGeometry(
        SPINNER_POST_RADIUS,
        SPINNER_POST_RADIUS * 1.2,
        0.42,
        10
      ),
      materials.woodDark
    )
  );
  post.position.y = 0.21;
  const knob = shadowed(
    new Mesh(
      new SphereGeometry(SPINNER_POST_RADIUS * 1.15, 10, 8),
      materials.white
    )
  );
  knob.position.y = 0.44;
  rotor.add(arm, post, knob);
  group.add(rotor);

  return {
    group,
    updatable: {
      update: (elapsed) => {
        rotor.rotation.y = spinnerAngle(spinner, elapsed);
      },
    },
  };
};

/** Wooden partition matching the outer walls, with a post at each end. */
const createPartition = (wall: WallObstacle, materials: Materials): Group => {
  const group = new Group();
  group.name = wall.id;
  const dx = wall.to.x - wall.from.x;
  const dz = wall.to.z - wall.from.z;
  const length = Math.hypot(dx, dz);
  const height = WALL_HEIGHT - WALL_BASE_Y;
  group.position.set(
    (wall.from.x + wall.to.x) / 2,
    0,
    (wall.from.z + wall.to.z) / 2
  );
  group.rotation.y = Math.atan2(-dz, dx);

  const board = shadowed(
    new Mesh(
      new BoxGeometry(length, height, PARTITION_THICKNESS),
      materials.wood
    )
  );
  board.position.y = WALL_BASE_Y + height / 2;
  const capGeometry = new BoxGeometry(length, 0.04, PARTITION_THICKNESS + 0.04);
  const cap = shadowed(new Mesh(capGeometry, materials.woodDark));
  cap.position.y = WALL_HEIGHT + 0.02;
  group.add(board, cap);
  return group;
};

export const createObstacles = (
  obstacles: Obstacle[],
  materials: Materials
): { group: Group; updatables: Updatable[] } => {
  const group = new Group();
  group.name = 'obstacles';
  const updatables: Updatable[] = [];

  for (const obstacle of obstacles) {
    switch (obstacle.kind) {
      case 'windmill': {
        const windmill = createWindmill(obstacle, materials);
        group.add(windmill.group);
        updatables.push(windmill.updatable);
        break;
      }
      case 'bumper':
        group.add(createBumper(obstacle, materials));
        break;
      case 'slider': {
        const slider = createSlider(obstacle, materials);
        group.add(slider.group);
        updatables.push(slider.updatable);
        break;
      }
      case 'tunnel':
        group.add(createTunnel(obstacle, materials));
        break;
      case 'ramp':
        group.add(createRamp(obstacle, materials));
        break;
      case 'spinner': {
        const spinner = createSpinner(obstacle, materials);
        group.add(spinner.group);
        updatables.push(spinner.updatable);
        break;
      }
      case 'wall':
        group.add(createPartition(obstacle, materials));
        break;
    }
  }

  return { group, updatables };
};
