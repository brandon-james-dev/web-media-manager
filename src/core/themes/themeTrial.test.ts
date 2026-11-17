import { describe, expect, it, vi } from "vitest";
import { THEME_TRIAL_SECONDS, ThemeTrial } from "./themeTrial";

function fakeTimers() {
  let callback: (() => void) | undefined;
  const timers = {
    setInterval: (next: () => void) => {
      callback = next;
      return 1;
    },
    clearInterval: () => {
      callback = undefined;
    },
  };
  const tick = (times = 1) => {
    for (let index = 0; index < times; index++) callback?.();
  };
  return { timers, tick, running: () => callback !== undefined };
}

describe("ThemeTrial", () => {
  it("counts down and reverts to the previous theme", async () => {
    const { timers, tick, running } = fakeTimers();
    const trial = new ThemeTrial(timers);
    const revert = vi.fn();
    trial.start("classic-blue", "old-theme", revert);
    expect(trial.getSnapshot()).toEqual({
      themeId: "classic-blue",
      previousId: "old-theme",
      secondsLeft: THEME_TRIAL_SECONDS,
    });
    tick(THEME_TRIAL_SECONDS - 1);
    expect(trial.getSnapshot()?.secondsLeft).toBe(1);
    expect(revert).not.toHaveBeenCalled();
    tick();
    await Promise.resolve();
    expect(revert).toHaveBeenCalledWith("old-theme");
    expect(trial.getSnapshot()).toBeUndefined();
    expect(running()).toBe(false);
  });

  it("keeps the theme without reverting", () => {
    const { timers, tick, running } = fakeTimers();
    const trial = new ThemeTrial(timers);
    const revert = vi.fn();
    trial.start("classic-blue", undefined, revert);
    trial.keep();
    tick(THEME_TRIAL_SECONDS);
    expect(revert).not.toHaveBeenCalled();
    expect(trial.getSnapshot()).toBeUndefined();
    expect(running()).toBe(false);
  });

  it("reverts on demand to the built-in theme", async () => {
    const { timers } = fakeTimers();
    const trial = new ThemeTrial(timers);
    const revert = vi.fn();
    trial.start("classic-blue", undefined, revert);
    await trial.revert();
    expect(revert).toHaveBeenCalledWith(undefined);
    expect(trial.getSnapshot()).toBeUndefined();
  });

  it("restarts cleanly and notifies subscribers", () => {
    const { timers, tick } = fakeTimers();
    const trial = new ThemeTrial(timers);
    const listener = vi.fn();
    const unsubscribe = trial.subscribe(listener);
    const first = vi.fn();
    trial.start("a-theme", undefined, first);
    tick(5);
    trial.start("b-theme", "a-theme", vi.fn());
    expect(trial.getSnapshot()?.secondsLeft).toBe(THEME_TRIAL_SECONDS);
    expect(listener).toHaveBeenCalledTimes(7);
    unsubscribe();
    tick();
    expect(listener).toHaveBeenCalledTimes(7);
    expect(first).not.toHaveBeenCalled();
  });
});
