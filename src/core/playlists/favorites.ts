import { getPlaylistStore } from "@/core/ports";
import { FAVORITES_PLAYLIST_ID } from "@/models";
import { addSongToPlaylist, removeSongFromPlaylist } from "./writePlaylists";

/** Create the reserved favorites playlist if it does not exist yet. */
export async function ensureFavorites(): Promise<void> {
  await getPlaylistStore().ensureFavorites?.();
}

/**
 * Add the song to favorites, or remove it when it is already there. Returns
 * whether the song is a favorite afterwards.
 */
export async function toggleFavorite(songId: string): Promise<boolean> {
  await ensureFavorites();
  const favorites = await getPlaylistStore().get(FAVORITES_PLAYLIST_ID);
  const isFavorite = favorites?.songs.some((e) => e.songId === songId);

  if (isFavorite) {
    await removeSongFromPlaylist(FAVORITES_PLAYLIST_ID, songId);
    return false;
  }
  await addSongToPlaylist(FAVORITES_PLAYLIST_ID, songId);
  return true;
}
