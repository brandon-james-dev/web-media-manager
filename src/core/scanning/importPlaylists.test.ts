import { describe, expect, it, beforeEach } from "vitest";

import { setPlaylistStoreProvider } from "@/core/ports/playlists";
import { MemoryStore } from "@/lib/persistence/MemoryStore";
import type { Playlist } from "@/models";
import { importPlaylists } from "./importPlaylists";

describe("importPlaylists (M3U discovery in the scan)", () => {
  let store: MemoryStore<Playlist>;

  beforeEach(() => {
    store = new MemoryStore<Playlist>();
    setPlaylistStoreProvider(() => store);
  });

  function makeSong(id: string, relativePath: string) {
    return {
      id,
      relativePath,
      filename: relativePath.split("/").pop() ?? relativePath,
      sourceId: "src",
      filesize: 0,
      title: "",
      artist: "",
      album: "",
      genre: "",
      comment: "",
      year: 0,
      track: 0,
    } as const;
  }

  it("parses an m3u file, resolves song ids, and persists the playlist", async () => {
    const handle = {
      name: "Road Trip.m3u",
      getFile: async () =>
        new File(
          ["#EXTM3U\n#EXTINF:230,Artist - Title\nrelative/a.mp3\nrelative/b.mp3"],
          "Road Trip.m3u",
          { type: "audio/x-mpegurl" }
        ),
    } as unknown as FileSystemFileHandle;

    const songs = [
      makeSong("song-a", "relative/a.mp3"),
      makeSong("song-b", "relative/b.mp3"),
    ];

    await importPlaylists([handle], songs);

    const all = await store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Road Trip");
    expect(all[0].songs.map((e) => e.songId)).toEqual(["song-a", "song-b"]);
    expect(all[0].songs.every((e) => e.addedAt > 0)).toBe(true);
  });

  it("skips entries whose audio is not in the library", async () => {
    const handle = {
      name: "partial.m3u",
      getFile: async () =>
        new File(
          ["#EXTM3U\nknown.mp3\nunknown.mp3"],
          "partial.m3u",
          { type: "audio/x-mpegurl" }
        ),
    } as unknown as FileSystemFileHandle;

    await importPlaylists([handle], [makeSong("s1", "known.mp3")]);

    const all = await store.getAll();
    expect(all[0].songs.map((e) => e.songId)).toEqual(["s1"]);
  });

  it("re-importing the same playlist updates the same row (idempotent)", async () => {
    const handle = {
      name: "same.m3u",
      getFile: async () =>
        new File(["#EXTM3U\none.mp3"], "same.m3u", { type: "audio/x-mpegurl" }),
    } as unknown as FileSystemFileHandle;

    const songs = [makeSong("s1", "one.mp3")];

    await importPlaylists([handle], songs);
    await importPlaylists([handle], songs);

    const all = await store.getAll();
    expect(all).toHaveLength(1);
  });
});
