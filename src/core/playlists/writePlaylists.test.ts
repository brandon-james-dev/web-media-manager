import { afterEach, describe, expect, it } from "vitest";

import {
  addSongsToPlaylist,
  deletePlaylist,
  moveSongInPlaylist,
  removeSongFromPlaylist,
  savePlaylist,
} from "@/core/playlists/writePlaylists";
import {
  setPlaylistStoreProvider,
  type PlaylistStore,
} from "@/core/ports/playlists";
import { setStoreProvider } from "@/core/ports/store";
import type { CatalogStore } from "@/core/ports/catalog";
import type { Playlist } from "@/models";
import { wmmBus } from "@/events";

/** Minimal in-memory playlist store for the write paths under test. */
function makeStore(seed: Playlist[] = []): PlaylistStore {
  const rows = new Map(seed.map((p) => [p.id, p]));
  const noop = () => () => {};
  return {
    get: async (id: string) => rows.get(id) ?? null,
    save: async (id: string, updated: Playlist) => {
      rows.set(id, updated);
      return updated;
    },
    delete: async (id: string) => {
      rows.delete(id);
    },
    getAll: async () => [...rows.values()],
    filter: async () => ({ items: [...rows.values()], total: rows.size }),
    batchDelete: async (ids: string[]) => {
      for (const id of ids) rows.delete(id);
    },
    batchUpdate: async (items: { id: string; updated: Playlist }[]) => {
      for (const item of items) rows.set(item.id, item.updated);
    },
    clearStore: async () => rows.clear(),
    onAdded: noop,
    onUpdated: noop,
    onDeleted: noop,
    onStoreCleared: noop,
  } as unknown as PlaylistStore;
}

afterEach(() => {
  setPlaylistStoreProvider(() => makeStore());
});

/** savePlaylist resolves songs through the catalog store to decide whether a
 *  source can persist the playlist; an empty catalog means "app-side only". */
function useEmptyCatalog() {
  setStoreProvider(
    () =>
      ({
        get: async () => null,
        save: async (_id: string, updated: unknown) => updated,
        delete: async () => {},
        getAll: async () => [],
        filter: async () => ({ items: [], total: 0 }),
        batchDelete: async () => {},
        batchUpdate: async () => {},
        clearStore: async () => {},
        onAdded: () => () => {},
        onUpdated: () => () => {},
        onDeleted: () => () => {},
        onStoreCleared: () => () => {},
      }) as unknown as CatalogStore
  );
}

describe("addSongsToPlaylist", () => {
  it("appends every selected song in order", async () => {
    const store = makeStore([
      {
        id: "p1",
        name: "Road trip",
        songs: [{ songId: "a", addedAt: 1 }],
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    setPlaylistStoreProvider(() => store);

    const updated = await addSongsToPlaylist("p1", ["b", "c"]);

    expect(updated?.songs.map((e) => e.songId)).toEqual(["a", "b", "c"]);
  });

  it("skips songs already in the playlist", async () => {
    const store = makeStore([
      {
        id: "p1",
        name: "Road trip",
        songs: [{ songId: "a", addedAt: 1 }],
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    setPlaylistStoreProvider(() => store);

    const updated = await addSongsToPlaylist("p1", ["a", "b"]);

    expect(updated?.songs.map((e) => e.songId)).toEqual(["a", "b"]);
  });

  it("returns null when the playlist is gone", async () => {
    setPlaylistStoreProvider(() => makeStore());

    expect(await addSongsToPlaylist("missing", ["a"])).toBeNull();
  });
});

describe("savePlaylist", () => {
  it("creates a playlist with the selected songs", async () => {
    const store = makeStore();
    setPlaylistStoreProvider(() => store);
    useEmptyCatalog();

    const created = await savePlaylist({
      name: "New mix",
      songs: [
        { songId: "a", addedAt: 1 },
        { songId: "b", addedAt: 1 },
      ],
    });

    expect(created.name).toBe("New mix");
    expect(created.songs.map((e) => e.songId)).toEqual(["a", "b"]);
    expect(await store.get(created.id)).not.toBeNull();
  });
});

describe("moveSongInPlaylist", () => {
  const seed = (): Playlist => ({
    id: "p1",
    name: "Mix",
    songs: ["a", "b", "c"].map((songId) => ({ songId, addedAt: 1 })),
    createdAt: 1,
    updatedAt: 1,
  });

  it("moves a song down to the target's position", async () => {
    setPlaylistStoreProvider(() => makeStore([seed()]));
    const updated = await moveSongInPlaylist("p1", "a", "c");
    expect(updated?.songs.map((e) => e.songId)).toEqual(["b", "c", "a"]);
  });

  it("moves a song up to the target's position", async () => {
    setPlaylistStoreProvider(() => makeStore([seed()]));
    const updated = await moveSongInPlaylist("p1", "c", "a");
    expect(updated?.songs.map((e) => e.songId)).toEqual(["c", "a", "b"]);
  });

  it("returns null for an unknown song", async () => {
    setPlaylistStoreProvider(() => makeStore([seed()]));
    expect(await moveSongInPlaylist("p1", "x", "a")).toBeNull();
  });
});

describe("playlist events", () => {
  it("publishes each playlist change on the bus", async () => {
    const store = makeStore();
    setPlaylistStoreProvider(() => store);
    useEmptyCatalog();
    const seen: string[] = [];
    const subs = [
      "wmm.playlists.created",
      "wmm.playlists.updated",
      "wmm.playlists.songsAdded",
      "wmm.playlists.songMoved",
      "wmm.playlists.songRemoved",
      "wmm.playlists.deleted",
    ].map((name) =>
      wmmBus.on(name as "wmm.playlists.created", () => seen.push(name))
    );

    const { id } = await savePlaylist({ name: "Mix" });
    await savePlaylist({ id, name: "Mix 2" });
    await addSongsToPlaylist(id, ["a", "b"]);
    await moveSongInPlaylist(id, "a", "b");
    await removeSongFromPlaylist(id, "a");
    await deletePlaylist(id);
    subs.forEach((off) => off());

    expect(seen).toEqual([
      "wmm.playlists.created",
      "wmm.playlists.updated",
      "wmm.playlists.songsAdded",
      "wmm.playlists.songMoved",
      "wmm.playlists.songRemoved",
      "wmm.playlists.deleted",
    ]);
  });
});
