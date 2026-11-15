import { describe, expect, it, vi } from "vitest";
import type { Song } from "@/models";
import { resolveSongBytesWithCache } from "./songOffline";
import { sumOfflineSizes } from "./offlineAudioStore";

function song(id: string): Song {
  return {
    id,
    sourceId: "subsonic-1",
    relativePath: `${id}.flac`,
    filename: `${id}.flac`,
    filesize: 1000,
  } as Song;
}

describe("resolveSongBytesWithCache", () => {
  it("returns the cached bytes without touching the source", async () => {
    const cached = new ArrayBuffer(4);
    const resolveFromSource = vi.fn(async () => new ArrayBuffer(8));

    const bytes = await resolveSongBytesWithCache(
      song("s1"),
      resolveFromSource,
      async () => cached
    );

    expect(bytes).toBe(cached);
    expect(resolveFromSource).not.toHaveBeenCalled();
  });

  it("falls back to the source when the song is not cached", async () => {
    const streamed = new ArrayBuffer(8);
    const resolveFromSource = vi.fn(async () => streamed);

    const bytes = await resolveSongBytesWithCache(
      song("s1"),
      resolveFromSource,
      async () => null
    );

    expect(bytes).toBe(streamed);
    expect(resolveFromSource).toHaveBeenCalledWith(song("s1"));
  });

  it("returns null when neither the cache nor the source has bytes", async () => {
    const bytes = await resolveSongBytesWithCache(
      song("s1"),
      async () => null,
      async () => null
    );

    expect(bytes).toBeNull();
  });
});

describe("sumOfflineSizes", () => {
  it("adds the cached sizes", () => {
    expect(sumOfflineSizes([{ size: 10 }, { size: 32 }, { size: 8 }])).toBe(50);
  });

  it("is zero for an empty cache", () => {
    expect(sumOfflineSizes([])).toBe(0);
  });
});
