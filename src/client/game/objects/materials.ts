import {
  CanvasTexture,
  DoubleSide,
  MeshLambertMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

export const PALETTE = {
  fairwayLight: '#7ed957',
  fairwayDark: '#6cc94a',
  rough: '#4fa83a',
  dirt: '#9a6a3e',
  rockUnderside: '#7d6a5a',
  wood: '#c98a4b',
  woodDark: '#8b5a2b',
  water: '#3cb7f0',
  cup: '#1d2b1a',
  teeMat: '#3f8f35',
  white: '#ffffff',
  flag: '#ff4d4d',
  windmillBody: '#f4ead5',
  windmillRoof: '#e2553f',
  windmillBlade: '#fff8ea',
  bumper: '#ff6b5a',
  trunk: '#7a4b2a',
  foliage: '#3ea852',
  rock: '#a7a9ac',
  stone: '#c9c2b4',
  plank: '#b07a45',
} as const;

/** Mown-stripe grass texture generated at runtime: no image download needed. */
const createStripeTexture = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = PALETTE.fairwayLight;
    ctx.fillRect(0, 0, 32, 4);
    ctx.fillStyle = PALETTE.fairwayDark;
    ctx.fillRect(32, 0, 32, 4);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  // Shape UVs are world units: one stripe pair every 3 units.
  texture.repeat.set(1 / 3, 1 / 3);
  return texture;
};

/** Lambert (cheap per-pixel cost) with flat shading for the low-poly look. */
const flat = (color: string): MeshLambertMaterial =>
  new MeshLambertMaterial({ color, flatShading: true });

export const createMaterials = () => ({
  fairway: new MeshLambertMaterial({ map: createStripeTexture() }),
  rough: flat(PALETTE.rough),
  dirt: flat(PALETTE.dirt),
  rockUnderside: flat(PALETTE.rockUnderside),
  wood: flat(PALETTE.wood),
  woodDark: flat(PALETTE.woodDark),
  water: new MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.15,
    metalness: 0.1,
  }),
  cup: new MeshLambertMaterial({ color: PALETTE.cup, side: DoubleSide }),
  teeMat: flat(PALETTE.teeMat),
  white: flat(PALETTE.white),
  flag: new MeshLambertMaterial({
    color: PALETTE.flag,
    side: DoubleSide,
    flatShading: true,
  }),
  ball: new MeshStandardMaterial({ color: PALETTE.white, roughness: 0.35 }),
  windmillBody: flat(PALETTE.windmillBody),
  windmillRoof: flat(PALETTE.windmillRoof),
  windmillBlade: flat(PALETTE.windmillBlade),
  bumper: flat(PALETTE.bumper),
  trunk: flat(PALETTE.trunk),
  foliage: flat(PALETTE.foliage),
  rock: flat(PALETTE.rock),
  stone: flat(PALETTE.stone),
  plank: flat(PALETTE.plank),
  tunnelRoof: new MeshLambertMaterial({
    color: PALETTE.windmillRoof,
    side: DoubleSide,
    flatShading: true,
  }),
});

export type Materials = ReturnType<typeof createMaterials>;
