import type { MusicSource, Playlist } from "@/models";
import type { IRepository } from "@/lib/persistence";

/**
 * Playlist store port: the persistence subset the core playlist functions
 * depend on. Implemented by the platform store (browser: Dexie playlists
 * table today). Kept as its own port — playlists are a separate concern
 * from the song catalog, so a server binding can supply playlist storage
 * without the song port changing.
 */
export interface PlaylistStore extends IRepository<Playlist> {
  /** Seed the reserved favorites playlist if it does not exist yet. */
  ensureFavorites?(): Promise<void>;
}

let playlistStoreProvider: (() => PlaylistStore) | null = null;

/** Register the platform's playlist store provider during bootstrap. */
export function setPlaylistStoreProvider(provider: () => PlaylistStore): void {
  playlistStoreProvider = provider;
}

/** Access the current playlist store through the portable port. */
export function getPlaylistStore(): PlaylistStore {
  if (!playlistStoreProvider) {
    throw new Error(
      "[core/ports/playlists] No playlist store provider registered — call setPlaylistStoreProvider() during bootstrap."
    );
  }
  return playlistStoreProvider();
}

/**
 * Playlist write adapter — how a *music source* persists playlists.
 *
 * Persistence is source-dependent: a local source writes a serialized
 * `.m3u` file to its root directory; a remote (subsonic/server) source
 * writes through its Open Subsonic API. The source contract (`kind` +
 * `capabilities.playlistWrite`, `baseUrl`/`handle` config) decides which
 * adapter handles a playlist.
 */
export interface PlaylistWriteAdapter {
  /** Write a playlist's full contents through this source. */
  write(
    source: MusicSource,
    playlists: Playlist,
    resolvePath: (songId: string) => string | undefined | Promise<string | undefined>
  ): Promise<void>;
  /** Delete a playlist's on-source artifact (e.g. its `.m3u` file). */
  delete(source: MusicSource, playlistId: string): Promise<void>;
}

let playlistWriteProvider: (() => PlaylistWriteAdapter) | null = null;

/** Register the platform's playlist write adapter during bootstrap. */
export function setPlaylistWriteProvider(
  provider: () => PlaylistWriteAdapter
): void {
  playlistWriteProvider = provider;
}

/** Access the write adapter through the portable port. */
export function getPlaylistWriteAdapter(): PlaylistWriteAdapter {
  if (!playlistWriteProvider) {
    throw new Error(
      "[core/ports/playlists] No playlist write provider registered — call setPlaylistWriteProvider() during bootstrap."
    );
  }
  return playlistWriteProvider();
}
