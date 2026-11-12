import { describe, expect, it } from "vitest";

import { toggleFavorite } from "@/core/playlists/favorites";
import { deletePlaylist } from "@/core/playlists/writePlaylists";
import {
  setPlaylistStoreProvider,
  type PlaylistStore,
} from "@/core/ports/playlists";
import { FAVORITES_PLAYLIST_ID, type Playlist } from "@/models";

function makeStore(): PlaylistStore {
  const rows = new Map<string, Playlist>();
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
    ensureFavorites: async () => {
      if (rows.has(FAVORITES_PLAYLIST_ID)) return;
      rows.set(FAVORITES_PLAYLIST_ID, {
        id: FAVORITES_PLAYLIST_ID,
        name: "Favorites",
        songs: [],
        isFavorites: true,
        createdAt: 1,
        updatedAt: 1,
      });
    },
    onAdded: noop,
    onUpdated: noop,
    onDeleted: noop,
    onStoreCleared: noop,
  } as unknown as PlaylistStore;
}

describe("toggleFavorite", () => {
  it("adds a song, then removes it on the second toggle", async () => {
    const store = makeStore();
    setPlaylistStoreProvider(() => store);

    expect(await toggleFavorite("a")).toBe(true);
    expect(
      (await store.get(FAVORITES_PLAYLIST_ID))?.songs.map((e) => e.songId)
    ).toEqual(["a"]);

    expect(await toggleFavorite("a")).toBe(false);
    expect((await store.get(FAVORITES_PLAYLIST_ID))?.songs).toEqual([]);
  });

  it("cannot be deleted as a playlist", async () => {
    const store = makeStore();
    setPlaylistStoreProvider(() => store);
    await toggleFavorite("a");

    await deletePlaylist(FAVORITES_PLAYLIST_ID);

    expect(await store.get(FAVORITES_PLAYLIST_ID)).not.toBeNull();
  });
});

describe("favorite origin", () => {
  it("turns a server favorite into both, and back to server on removal", async () => {
    const store = makeStore();
    setPlaylistStoreProvider(() => store);
    await store.ensureFavorites?.();
    const base = await store.get(FAVORITES_PLAYLIST_ID);
    await store.save(FAVORITES_PLAYLIST_ID, {
      ...(base as Playlist),
      songs: [{ songId: "s", addedAt: 1, origin: "server" }],
    });

    expect(await toggleFavorite("s")).toBe(true);
    expect((await store.get(FAVORITES_PLAYLIST_ID))?.songs[0].origin).toBe(
      "both"
    );

    expect(await toggleFavorite("s")).toBe(false);
    expect((await store.get(FAVORITES_PLAYLIST_ID))?.songs[0].origin).toBe(
      "server"
    );
  });
});
