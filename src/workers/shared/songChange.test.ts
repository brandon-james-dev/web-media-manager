import { describe, expect, it } from "vitest";
import type { Song } from "@/models";
import { stampSong } from "./songChange";

const base = {
  id: "a",
  sourceId: "s",
  relativePath: "x.mp3",
  filename: "x.mp3",
  filesize: 10,
  title: "One",
} as Song;

describe("stampSong", () => {
  it("stamps new songs with both dates", () => {
    const song = { ...base };
    expect(stampSong(song, undefined, 100)).toBe(true);
    expect([song.addedAt, song.updatedAt]).toEqual([100, 100]);
  });

  it("keeps the stored dates when nothing changed", () => {
    const song = { ...base, id: "b" };
    const existing = { ...base, addedAt: 1, updatedAt: 2 };
    expect(stampSong(song, existing, 100)).toBe(false);
    expect([song.addedAt, song.updatedAt]).toEqual([1, 2]);
  });

  it("keeps addedAt but bumps updatedAt when content changed", () => {
    const song = { ...base, title: "Two" };
    const existing = { ...base, addedAt: 1, updatedAt: 2 };
    expect(stampSong(song, existing, 100)).toBe(true);
    expect([song.addedAt, song.updatedAt]).toEqual([1, 100]);
  });
});
