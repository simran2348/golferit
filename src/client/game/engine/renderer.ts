import { NeutralToneMapping, PCFShadowMap, WebGLRenderer } from 'three';

/** Cap the pixel ratio: 3x phone screens would otherwise render 9x the pixels. */
const MAX_PIXEL_RATIO = 2;

export const isCoarsePointer = (): boolean =>
  window.matchMedia('(pointer: coarse)').matches;

export const createRenderer = (): WebGLRenderer => {
  const renderer = new WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  // Neutral tone mapping keeps the bright, saturated palette intact.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  return renderer;
};
