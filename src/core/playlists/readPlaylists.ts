import { getPlaylistStore } from "@/core/ports";
import type { Playlist } from "@/models";

/**
 * Domain: Playlists.
 * Open Subsonic equivalent: getPlaylists().
 *
 * Returns all user playlists (ordered by createdAt, oldest first). The
 * reserved "favorites" playlist is included with its `isFavorites` flag.
 */
export async function getPlaylists(): Promise<Playlist[]> {
  const all = await getPlaylistStore().getAll();

  return all.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Domain: Playlists.
 * Open Subsonic equivalent: getPlaylist(id).
 *
 * Returns a single playlist by id, or null when it does not exist.
 */
export async function getPlaylist(id: string): Promise<Playlist | null> {
  return getPlaylistStore().get(id);
}
