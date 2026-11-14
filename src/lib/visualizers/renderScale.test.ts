import { describe, expect, it } from "vitest";
import {
  adaptRenderScale,
  FRAME_RECOVERY_STABLE,
  FRAME_SAMPLE_SIZE,
  INITIAL_RENDER_SCALE,
  MIN_RENDER_SCALE,
  type RenderScaleState,
} from "./renderScale";

function run(
  state: RenderScaleState,
  frameMs: number,
  samples: number
): RenderScaleState {
  let next = state;
  for (let i = 0; i < samples; i++) {
    next = adaptRenderScale(next, frameMs);
  }
  return next;
}

describe("adaptRenderScale", () => {
  it("keeps full resolution when frames are on budget", () => {
    const next = run(INITIAL_RENDER_SCALE, 16.7, 20);
    expect(next.scale).toBe(1);
  });

  it("drops resolution when frames miss the budget", () => {
    const next = adaptRenderScale(INITIAL_RENDER_SCALE, 40);
    expect(next.scale).toBeCloseTo(0.75);
    expect(next.stableFrames).toBe(0);
  });

  it("keeps dropping while frames stay slow", () => {
    const next = run(INITIAL_RENDER_SCALE, 40, 10);
    expect(next.scale).toBe(MIN_RENDER_SCALE);
  });

  it("never goes below the floor", () => {
    const next = run(INITIAL_RENDER_SCALE, 120, 40);
    expect(next.scale).toBe(MIN_RENDER_SCALE);
  });

  it("does not raise resolution on a single fast sample", () => {
    const low: RenderScaleState = { scale: 0.5, stableFrames: 0 };
    const next = adaptRenderScale(low, 16.7);
    expect(next.scale).toBe(0.5);
    expect(next.stableFrames).toBe(FRAME_SAMPLE_SIZE);
  });

  it("raises resolution after a long stable stretch", () => {
    const low: RenderScaleState = { scale: 0.5, stableFrames: 0 };
    const samples = FRAME_RECOVERY_STABLE / FRAME_SAMPLE_SIZE;
    const next = run(low, 16.7, samples);
    expect(next.scale).toBeCloseTo(0.625);
    expect(next.stableFrames).toBe(0);
  });

  it("resets the stable count when pacing is borderline", () => {
    const low: RenderScaleState = { scale: 0.5, stableFrames: 120 };
    const next = adaptRenderScale(low, 20);
    expect(next.scale).toBe(0.5);
    expect(next.stableFrames).toBe(0);
  });

  it("caps recovery at full resolution", () => {
    const near: RenderScaleState = { scale: 0.9, stableFrames: 120 };
    const next = adaptRenderScale(near, 16.7);
    expect(next.scale).toBe(1);
  });
});
