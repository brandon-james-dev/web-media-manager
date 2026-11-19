import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FULLSCREEN_FADE_MS,
  FULLSCREEN_HIDE_DELAY_MS,
  createFullscreenHideTimer,
} from "./useFullscreenHidden";
import type { FullscreenHiddenState } from "./useFullscreenHidden";

function createHarness(): {
  states: FullscreenHiddenState[];
  current: () => FullscreenHiddenState;
  timer: ReturnType<typeof createFullscreenHideTimer>;
} {
  const states: FullscreenHiddenState[] = [];
  return {
    states,
    current: () => states[states.length - 1] ?? "shown",
    timer: createFullscreenHideTimer((state) => states.push(state)),
  };
}

describe("createFullscreenHideTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays shown for the delay, fades, then hides", () => {
    const { current, timer } = createHarness();
    timer.update(true, true);
    expect(current()).toBe("shown");

    vi.advanceTimersByTime(FULLSCREEN_HIDE_DELAY_MS - 1);
    expect(current()).toBe("shown");

    vi.advanceTimersByTime(1);
    expect(current()).toBe("fading");

    vi.advanceTimersByTime(FULLSCREEN_FADE_MS - 1);
    expect(current()).toBe("fading");

    vi.advanceTimersByTime(1);
    expect(current()).toBe("hidden");
  });

  it("shows again at once when full screen ends", () => {
    const { current, timer } = createHarness();
    timer.update(true, true);
    vi.advanceTimersByTime(FULLSCREEN_HIDE_DELAY_MS + FULLSCREEN_FADE_MS);
    expect(current()).toBe("hidden");

    timer.update(true, false);
    expect(current()).toBe("shown");

    vi.advanceTimersByTime(FULLSCREEN_HIDE_DELAY_MS);
    expect(current()).toBe("shown");
  });

  it("restarts the delay when full screen begins again", () => {
    const { current, timer } = createHarness();
    timer.update(true, true);
    vi.advanceTimersByTime(FULLSCREEN_HIDE_DELAY_MS);
    expect(current()).toBe("fading");

    timer.update(true, false);
    timer.update(true, true);
    expect(current()).toBe("shown");

    vi.advanceTimersByTime(FULLSCREEN_HIDE_DELAY_MS - 1);
    expect(current()).toBe("shown");
    vi.advanceTimersByTime(1);
    expect(current()).toBe("fading");
  });

  it("shows again on activity and hides once more after the delay", () => {
    const { current, timer } = createHarness();
    timer.update(true, true);
    vi.advanceTimersByTime(FULLSCREEN_HIDE_DELAY_MS + FULLSCREEN_FADE_MS);
    expect(current()).toBe("hidden");

    timer.update(true, true);
    expect(current()).toBe("shown");

    vi.advanceTimersByTime(FULLSCREEN_HIDE_DELAY_MS - 1);
    expect(current()).toBe("shown");
    vi.advanceTimersByTime(1);
    expect(current()).toBe("fading");
    vi.advanceTimersByTime(FULLSCREEN_FADE_MS);
    expect(current()).toBe("hidden");
  });

  it("never hides when the element is not marked", () => {
    const { current, timer } = createHarness();
    timer.update(false, true);
    vi.advanceTimersByTime(FULLSCREEN_HIDE_DELAY_MS + FULLSCREEN_FADE_MS);
    expect(current()).toBe("shown");
  });

  it("drops pending timers on dispose", () => {
    const { states, timer } = createHarness();
    timer.update(true, true);
    timer.dispose();
    vi.advanceTimersByTime(FULLSCREEN_HIDE_DELAY_MS + FULLSCREEN_FADE_MS);
    expect(states).toEqual(["shown"]);
  });
});
