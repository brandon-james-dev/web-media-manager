import { describe, expect, it } from "vitest";

import { ScrobbleTracker, scrobbleThreshold } from "./scrobble";

describe("scrobbleThreshold", () => {
  it("is half the length for short tracks", () => {
    expect(scrobbleThreshold(180)).toBe(90);
    expect(scrobbleThreshold(60)).toBe(30);
  });

  it("caps at four minutes for long tracks", () => {
    expect(scrobbleThreshold(600)).toBe(240);
    expect(scrobbleThreshold(480)).toBe(240);
  });

  it("falls back to four minutes without a length", () => {
    expect(scrobbleThreshold(undefined)).toBe(240);
    expect(scrobbleThreshold(0)).toBe(240);
  });
});

describe("ScrobbleTracker", () => {
  function play(tracker: ScrobbleTracker, seconds: number, step = 1) {
    let entry;
    for (let position = step; position <= seconds; position += step) {
      entry = tracker.advance(position) ?? entry;
    }
    return entry;
  }

  it("records once half a short track has played", () => {
    const tracker = new ScrobbleTracker();
    tracker.start("s1", 100, 1_000);

    expect(play(tracker, 49)).toBeUndefined();

    const entry = play(tracker, 50);
    expect(entry).toMatchObject({
      songId: "s1",
      playedAt: 1_000,
      listenedSeconds: 50,
      durationSeconds: 100,
    });
  });

  it("records only once per play", () => {
    const tracker = new ScrobbleTracker();
    tracker.start("s1", 100, 1_000);
    play(tracker, 60);

    expect(tracker.advance(70)).toBeUndefined();
  });

  it("does not count a seek as listening", () => {
    const tracker = new ScrobbleTracker();
    tracker.start("s1", 100, 1_000);

    expect(tracker.advance(90)).toBeUndefined();
    expect(play(tracker, 50)).toBeUndefined();
  });

  it("records nothing after a reset", () => {
    const tracker = new ScrobbleTracker();
    tracker.start("s1", 100, 1_000);
    tracker.reset();

    expect(play(tracker, 100)).toBeUndefined();
  });
});
