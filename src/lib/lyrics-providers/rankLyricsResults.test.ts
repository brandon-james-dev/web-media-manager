import { describe, expect, it } from "vitest";
import type { ILyricsResult } from "./ILyricsService";
import { LyricsProvider } from "./LyricsProvider";
import { rankLyricsResults } from "./rankLyricsResults";

function result(overrides: Partial<ILyricsResult>): ILyricsResult {
  return {
    source: LyricsProvider.LrcLib,
    title: "Amarillo by Morning",
    artist: "George Strait",
    ...overrides,
  };
}

const query = {
  title: "Amarillo by Morning",
  artist: "George Strait",
  album: "Strait from the Heart",
  duration: 173,
};

describe("rankLyricsResults", () => {
  it("puts the closest duration first", () => {
    const ranked = rankLyricsResults(
      [
        result({ id: 1, duration: 163 }),
        result({ id: 2, duration: 173 }),
        result({ id: 3, duration: 206 }),
      ],
      query
    );

    expect(ranked.map((entry) => entry.id)).toEqual([2, 1, 3]);
    expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
  });

  it("scores an exact duration and name match as a full match", () => {
    const [best] = rankLyricsResults(
      [result({ id: 1, duration: 173, album: "Strait from the Heart" })],
      query
    );

    expect(best.matchScore).toBe(1);
  });

  it("ranks a distant duration below a close one at equal names", () => {
    const ranked = rankLyricsResults(
      [
        result({ id: 1, duration: 400 }),
        result({ id: 2, duration: 175 }),
      ],
      query
    );

    expect(ranked[0].id).toBe(2);
    expect(ranked[1].matchScore).toBeLessThan(0.6);
  });

  it("still ranks by name when the query has no duration", () => {
    const ranked = rankLyricsResults(
      [
        result({ id: 1, title: "Completely Different", artist: "Someone Else" }),
        result({ id: 2 }),
      ],
      { title: "Amarillo by Morning", artist: "George Strait" }
    );

    expect(ranked[0].id).toBe(2);
  });

  it("prefers synced lyrics when the match is otherwise equal", () => {
    const ranked = rankLyricsResults(
      [
        result({ id: 1, duration: 173 }),
        result({ id: 2, duration: 173, syncedLyrics: "[00:01.00] la" }),
      ],
      query
    );

    expect(ranked[0].id).toBe(2);
  });

  it("ignores case, accents and punctuation in names", () => {
    const ranked = rankLyricsResults(
      [
        result({ id: 1, title: "AMARILLO BY MORNING!", artist: "george strait" }),
        result({ id: 2, title: "Unrelated", artist: "Nobody" }),
      ],
      { title: "Amarillo by Morning", artist: "George Strait" }
    );

    expect(ranked[0].id).toBe(1);
  });

  it("returns an empty list unchanged", () => {
    expect(rankLyricsResults([], query)).toEqual([]);
  });
});
