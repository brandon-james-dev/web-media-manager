/** Reserved id for the pinned, non-deletable favorites playlist. */
export const FAVORITES_PLAYLIST_ID = "favorites";

/**
 * A single ordered playlist entry. The array order IS the play order within
 * the playlist. `addedAt` captures when the song was added to the playlist
 * (useful for e.g. "newest favorites first" views).
 */
export interface PlaylistEntry {
  songId: string;
  /** Epoch ms when the song was added to the playlist. */
  addedAt: number;
}

/**
 * User-facing playlist. Playlists are ordered lists of songs the user can
 * create, name, and play through. "Favorites" is intended to be a reserved
 * playlist (a fixed id like "favorites") that behaves like any other
 * playlist but is pinned and non-deletable.
 */
export interface Playlist {
  /** Unique playlist id. Reserved id "favorites" for the liked-songs list. */
  id: string;

  /** Display name. */
  name: string;

  /** Ordered playlist entries (order = play order). */
  songs: PlaylistEntry[];

  /**
   * The music source this playlist was imported from (e.g. a Subsonic
   * server). Absent for playlists created in the app. Whether it can be
   * edited follows that source's `capabilities.playlistWrite`.
   */
  sourceId?: string;

  /** Whether this is the reserved, non-deletable favorites playlist. */
  isFavorites?: boolean;

  createdAt: number;
  updatedAt: number;
}
