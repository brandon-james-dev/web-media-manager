import { describe, expect, it, vi } from "vitest";

import type { MusicSource, Playlist, Song } from "@/models";
import { setPlaylistStoreProvider } from "@/core/ports/playlists";

const song = { id: "s1", title: "One", sourceId: "src1" } as Song;
const fresh = {
  id: "pl-new",
  name: "New",
  sourceId: "src1",
  songs: [],
} as unknown as Playlist;

let collectPlaylists: (() => Promise<Playlist[] | null>) | undefined;
let collectFavorites: (() => Promise<string[] | null>) | undefined;

vi.mock("@/lib", () => ({
  initMetadataStore: () => ({
    getAll: async () => [],
    batchDelete: async () => {},
    save: () => {},
  }),
}));
vi.mock("@/lib/persistence/songArtworkStore", () => ({
  getSongArtworkStore: () => ({
    listSongIdsWithArtwork: async () => new Set<string>(),
  }),
}));
vi.mock("@/lib/sources", () => ({
  getStrategy: () => ({
    collectSongs: async () => [song],
    get collectPlaylists() {
      return collectPlaylists;
    },
    get collectFavorites() {
      return collectFavorites;
    },
  }),
}));

const { runBulkImport } = await import("./runBulkImport");

function memoryPlaylists(seed: Playlist[]) {
  const rows = new Map(seed.map((p) => [p.id, p]));
  setPlaylistStoreProvider(
    () =>
      ({
        save: async (id: string, p: Playlist) => void rows.set(id, p),
        delete: async (id: string) => void rows.delete(id),
        getAll: async () => [...rows.values()],
        get: async (id: string) => rows.get(id),
        ensureFavorites: async () => {
          if (!rows.has("favorites"))
            rows.set("favorites", {
              id: "favorites",
              name: "Favorites",
              songs: [],
            } as unknown as Playlist);
        },
      }) as never
  );
  return rows;
}

const source = { id: "src1", name: "Home", kind: "subsonic" } as MusicSource;

describe("runBulkImport playlist phase", () => {
  it("stores the source's playlists, prunes its stale ones, keeps others", async () => {
    const rows = memoryPlaylists([
      {
        id: "stale",
        name: "Stale",
        sourceId: "src1",
        songs: [],
      } as unknown as Playlist,
      { id: "mine", name: "Mine", songs: [] } as unknown as Playlist,
      {
        id: "other",
        name: "Other",
        sourceId: "src2",
        songs: [],
      } as unknown as Playlist,
    ]);
    collectPlaylists = async () => [fresh];
    const reports: Array<{
      data?: { phase?: string; done?: boolean; removedIds?: string[] };
    }> = [];

    const result = await runBulkImport(
      { musicSource: source },
      () => false,
      (p) => reports.push(p),
      "job1"
    );

    expect(result).toMatchObject({ ok: true });
    expect([...rows.keys()].sort()).toEqual(["mine", "other", "pl-new"]);
    const done = reports.find(
      (r) => r.data?.phase === "playlists" && r.data.done
    );
    expect(done?.data?.removedIds).toEqual(["stale"]);
  });

  it("leaves existing playlists alone when the source returns none to read", async () => {
    const rows = memoryPlaylists([
      {
        id: "keep",
        name: "Keep",
        sourceId: "src1",
        songs: [],
      } as unknown as Playlist,
    ]);
    collectPlaylists = async () => null;

    await runBulkImport(
      { musicSource: source },
      () => false,
      () => {},
      "job1"
    );

    expect([...rows.keys()]).toEqual(["keep"]);
  });

  it("skips the phase for strategies without playlists", async () => {
    const rows = memoryPlaylists([]);
    collectPlaylists = undefined;
    const reports: Array<{ data?: { phase?: string } }> = [];

    const result = await runBulkImport(
      { musicSource: source },
      () => false,
      (p) => reports.push(p),
      "job1"
    );

    expect(result).toMatchObject({ ok: true, playlists: [] });
    expect(reports.some((r) => r.data?.phase === "playlists")).toBe(false);
    expect(rows.size).toBe(0);
  });

  it("merges source favorites into Favorites without dropping app favorites", async () => {
    const rows = memoryPlaylists([
      {
        id: "favorites",
        name: "Favorites",
        songs: [{ songId: "local-fav", addedAt: 1 }],
      } as unknown as Playlist,
    ]);
    collectPlaylists = undefined;
    collectFavorites = async () => ["s1", "not-imported"];

    await runBulkImport(
      { musicSource: source },
      () => false,
      () => {},
      "job1"
    );
    collectFavorites = undefined;

    const songs = (rows.get("favorites") as Playlist).songs.map(
      (e) => e.songId
    );
    expect(songs).toEqual(["local-fav", "s1"]);
  });
});
