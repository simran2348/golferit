/**
 * Deterministic PRNG (mulberry32) seeded from a string, so procedural details
 * such as island rocks look identical every time a course loads.
 */
export const createRandom = (seed: string): (() => number) => {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = Math.imul(state ^ seed.charCodeAt(i), 2654435761);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
