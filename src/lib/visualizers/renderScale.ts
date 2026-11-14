/**
 * Adaptive render resolution for visualizers.
 *
 * A weak GPU — a television, an old laptop, a large 4K canvas — cannot fill a
 * full-resolution backing store at 60fps. Rather than dropping frames, the
 * canvas is rendered smaller and stretched by the browser: the CSS size and
 * the plugin's coordinate space stay the same, only the pixel count changes.
 *
 * The decision is pure so it can be tested without a canvas.
 */

/** Slowest frame pacing accepted before dropping resolution. */
export const FRAME_BUDGET_MS = 22;
/** Frame pacing that counts as "the GPU has headroom again". */
export const FRAME_RECOVERY_MS = 17.5;
/** Frames averaged before the pacing is judged. */
export const FRAME_SAMPLE_SIZE = 30;
/** Consecutive fast frames required before resolution is raised again. */
export const FRAME_RECOVERY_STABLE = 150;
/** Never render below this fraction of the display resolution. */
export const MIN_RENDER_SCALE = 0.35;
/**
 * A television GPU is far weaker than a desktop one, so a TV starts at half
 * resolution and may fall further before the picture is stretched.
 */
export const TV_MIN_RENDER_SCALE = 0.25;
/** Frame interval on a TV: 30fps is smooth enough and halves the GPU work. */
export const TV_FRAME_INTERVAL_MS = 1000 / 30;

export interface RenderScaleState {
  /** Fraction of the display resolution currently rendered. */
  scale: number;
  /** Fast frames accumulated since the last change. */
  stableFrames: number;
}

export const INITIAL_RENDER_SCALE: RenderScaleState = {
  scale: 1,
  stableFrames: 0,
};

/** A TV starts below full resolution instead of discovering it is too slow. */
export const TV_INITIAL_RENDER_SCALE: RenderScaleState = {
  scale: 0.5,
  stableFrames: 0,
};

/**
 * Next state after a sample of `FRAME_SAMPLE_SIZE` frames averaged
 * `averageFrameMs`. Steps down immediately when over budget, and back up only
 * after a long stable stretch, so a borderline GPU does not oscillate.
 */
export function adaptRenderScale(
  state: RenderScaleState,
  averageFrameMs: number,
  minScale: number = MIN_RENDER_SCALE
): RenderScaleState {
  if (averageFrameMs > FRAME_BUDGET_MS && state.scale > minScale) {
    return {
      scale: Math.max(minScale, state.scale * 0.75),
      stableFrames: 0,
    };
  }

  if (averageFrameMs < FRAME_RECOVERY_MS && state.scale < 1) {
    const stableFrames = state.stableFrames + FRAME_SAMPLE_SIZE;
    if (stableFrames >= FRAME_RECOVERY_STABLE) {
      return { scale: Math.min(1, state.scale * 1.25), stableFrames: 0 };
    }
    return { scale: state.scale, stableFrames };
  }

  return { scale: state.scale, stableFrames: 0 };
}
