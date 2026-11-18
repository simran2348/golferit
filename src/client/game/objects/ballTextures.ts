import { CanvasTexture, SRGBColorSpace } from 'three';

const WIDTH = 512;
const HEIGHT = 256;
/** Angular spacing between dimple rows (radians). ~330 dimples in total. */
const ROW_STEP = Math.PI / 18;
const DIMPLE_RADIUS = ROW_STEP * 0.46;
const MAX_LATITUDE = (80 * Math.PI) / 180;

const createCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  return canvas;
};

/** One dimple as a shallow bowl, stretched to undo the sphere's UV squash. */
const drawDimple = (
  ctx: CanvasRenderingContext2D,
  u: number,
  v: number,
  latitude: number
) => {
  const ry = (DIMPLE_RADIUS / Math.PI) * HEIGHT;
  const rx =
    (DIMPLE_RADIUS / (2 * Math.PI * Math.max(Math.cos(latitude), 0.2))) * WIDTH;
  for (const shift of [-WIDTH, 0, WIDTH]) {
    const x = u * WIDTH + shift;
    if (x + rx < 0 || x - rx > WIDTH) continue;
    ctx.save();
    ctx.translate(x, v * HEIGHT);
    ctx.scale(rx / ry, 1);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    gradient.addColorStop(0, '#6a6a6a');
    gradient.addColorStop(0.75, '#b8b8b8');
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, ry, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

/**
 * Height map of evenly spread dimples (rows of latitude, staggered), used as
 * a bump map. Generated once at startup: no image download.
 */
export const createDimpleTexture = (): CanvasTexture => {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    let row = 0;
    for (
      let latitude = -MAX_LATITUDE;
      latitude <= MAX_LATITUDE + 1e-6;
      latitude += ROW_STEP
    ) {
      const count = Math.max(
        1,
        Math.round((2 * Math.PI * Math.cos(latitude)) / ROW_STEP)
      );
      const stagger = row % 2 === 0 ? 0 : 0.5;
      const v = 0.5 - latitude / Math.PI;
      for (let i = 0; i < count; i++) {
        drawDimple(ctx, (i + stagger) / count, v, latitude);
      }
      row++;
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
};

/**
 * Colour map: off-white cover with two short alignment lines on opposite
 * sides, so you can see the ball roll and spin.
 */
export const createBallColorTexture = (): CanvasTexture => {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fbfbf6';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#e8412c';
    const lineHeight = HEIGHT * 0.045;
    for (const center of [0.25, 0.75]) {
      ctx.fillRect(
        (center - 0.11) * WIDTH,
        HEIGHT / 2 - lineHeight / 2,
        0.22 * WIDTH,
        lineHeight
      );
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};
