/** Discrete zoom steps. 1 = whole course in view. */
const ZOOM_LEVELS = [1, 1.5, 2.1, 2.8] as const;

export type ZoomSnapshot = {
  zoom: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
};

type Listener = () => void;

/**
 * View zoom state shared by the HUD buttons (React) and the camera (engine).
 * Buttons instead of pinch-to-zoom so a zoom gesture can never be mistaken
 * for a putt.
 */
export class ZoomController {
  private index = 0;
  private snapshot: ZoomSnapshot = this.build();
  private readonly listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): ZoomSnapshot => this.snapshot;

  readonly zoomIn = (): void => this.setIndex(this.index + 1);
  readonly zoomOut = (): void => this.setIndex(this.index - 1);
  readonly reset = (): void => this.setIndex(0);

  private setIndex(index: number): void {
    const clamped = Math.min(Math.max(index, 0), ZOOM_LEVELS.length - 1);
    if (clamped === this.index) return;
    this.index = clamped;
    this.snapshot = this.build();
    this.listeners.forEach((listener) => listener());
  }

  private build(): ZoomSnapshot {
    return {
      zoom: ZOOM_LEVELS[this.index] ?? 1,
      canZoomIn: this.index < ZOOM_LEVELS.length - 1,
      canZoomOut: this.index > 0,
    };
  }
}
