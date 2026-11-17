/** Anything that animates per frame. Called from the engine loop, never React. */
export type Updatable = {
  update: (elapsedSeconds: number, deltaSeconds: number) => void;
};
