import { getPlaylistStore, getStore } from "@/core/ports";
import { FAVORITES_PLAYLIST_ID, type FavoriteOrigin } from "@/models";
import { hasLocalFavorite } from "./favoriteOrigin";
import { addSongToPlaylist, removeSongFromPlaylist } from "./writePlaylists";

/** Create the reserved favorites playlist if it does not exist yet. */
export async function ensureFavorites(): Promise<void> {
  await getPlaylistStore().ensureFavorites?.();
}

/**
 * Toggle the song's local favorite. A server-only favorite becomes "both",
 * and removing a "both" favorite leaves the server one. Returns whether the
 * song is a local favorite afterwards.
 */
export async function toggleFavorite(songId: string): Promise<boolean> {
  await ensureFavorites();
  const favorites = await getPlaylistStore().get(FAVORITES_PLAYLIST_ID);
  const entry = favorites?.songs.find((e) => e.songId === songId);
  const wasLocal = entry ? hasLocalFavorite(entry.origin) : false;

  if (favorites && entry && entry.origin && entry.origin !== "local") {
    const origin: FavoriteOrigin = wasLocal ? "server" : "both";
    await getPlaylistStore().save(FAVORITES_PLAYLIST_ID, {
      ...favorites,
      songs: favorites.songs.map((e) =>
        e.songId === songId ? { ...e, origin } : e
      ),
      updatedAt: Date.now(),
    });
  } else if (entry) {
    await removeSongFromPlaylist(FAVORITES_PLAYLIST_ID, songId);
  } else {
    await addSongToPlaylist(FAVORITES_PLAYLIST_ID, songId);
  }
  await mirrorToSource(songId, !wasLocal);
  return !wasLocal;
}

async function mirrorToSource(songId: string, favorite: boolean) {
  try {
    await getStore().setFavoriteRating?.(songId, favorite);
  } catch (error) {
    console.warn("Could not save the favorite to the song's source:", error);
  }
}
