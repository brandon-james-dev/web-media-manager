import { describe, expect, it } from "vitest";

import type { Song } from "@/models";
import {
  compareDiscThenTrack,
  selectors,
  sortTieBreaker,
} from "./QueryOptions";

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: "song-1",
    sourceId: "src-1",
    relativePath: "/music/a.mp3",
    filename: "a.mp3",
    filesize: 1024,
    title: "Title",
    artist: "Artist",
    album: "Album",
    genre: "Pop",
    year: 2021,
    track: 2,
    discNumber: 1,
    duration: 180,
    ...overrides,
  };
}

describe("compareDiscThenTrack", () => {
  it("orders by track within one disc", () => {
    const songs = [
      makeSong({ id: "c", track: 3 }),
      makeSong({ id: "a", track: 1 }),
      makeSong({ id: "b", track: 2 }),
    ];

    expect(songs.sort(compareDiscThenTrack).map((s) => s.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("orders by disc before track", () => {
    const songs = [
      makeSong({ id: "d2t1", discNumber: 2, track: 1 }),
      makeSong({ id: "d1t2", discNumber: 1, track: 2 }),
      makeSong({ id: "d1t1", discNumber: 1, track: 1 }),
    ];

    expect(songs.sort(compareDiscThenTrack).map((s) => s.id)).toEqual([
      "d1t1",
      "d1t2",
      "d2t1",
    ]);
  });

  it("puts a missing disc or track last", () => {
    const songs = [
      makeSong({ id: "none", discNumber: undefined, track: undefined }),
      makeSong({ id: "track", discNumber: undefined, track: 1 }),
      makeSong({ id: "disc", discNumber: 1, track: 1 }),
    ];

    expect(songs.sort(compareDiscThenTrack).map((s) => s.id)).toEqual([
      "disc",
      "track",
      "none",
    ]);
  });

  it("compares track numbers numerically, not as text", () => {
    const songs = [
      makeSong({ id: "ten", track: 10 }),
      makeSong({ id: "two", track: 2 }),
    ];

    expect(songs.sort(compareDiscThenTrack).map((s) => s.id)).toEqual([
      "two",
      "ten",
    ]);
  });
});

describe("sortTieBreaker", () => {
  it("returns the disc-then-track comparison for an album sort", () => {
    expect(sortTieBreaker(selectors.album)).toBe(compareDiscThenTrack);
  });

  it("returns nothing for any other column", () => {
    expect(sortTieBreaker(selectors.title)).toBeUndefined();
    expect(sortTieBreaker(selectors.artist)).toBeUndefined();
    expect(sortTieBreaker("album")).toBeUndefined();
    expect(sortTieBreaker(undefined)).toBeUndefined();
  });
});
