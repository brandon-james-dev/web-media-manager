import {
  getPlaylistStore,
  getPlaylistWriteAdapter,
  getStore,
  getSourcesStore,
} from "@/core/ports";
import type { Playlist, PlaylistEntry } from "@/models";
import { uuidv7 } from "uuidv7";

/**
 * Domain: Playlists.
 *
 * Create a playlist, or save an existing one (matching by id). For a new
 * playlist the `createdAt`/`updatedAt` are stamped here; updates bump only
 * `updatedAt`.
 *
 * When the playlist belongs to a source that can persist playlists
 * (`capabilities.playlistWrite`), the full contents are also written
 * through that source (local: `.m3u` file at the source root; remote: its
 * Open Subsonic API). The Dexie playlist table remains the app's index of
 * playlists; the source write keeps the on-source artifact in sync.
 */
export async function savePlaylist(
  playlist: Partial<Playlist> & { name: string }
): Promise<Playlist> {
  const store = getPlaylistStore();
  const now = Date.now();

  let saved: Playlist;

  if (playlist.id) {
    const existing = await store.get(playlist.id);
    if (existing) {
      saved = {
        ...existing,
        ...playlist,
        updatedAt: now,
      };
      await store.save(saved.id, saved);
      await writeThroughSource(saved);
      return saved;
    }
  }

  saved = {
    id: playlist.id ?? uuidv7(),
    name: playlist.name,
    songs: playlist.songs ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await store.save(saved.id, saved);
  await writeThroughSource(saved);
  return saved;
}

/**
 * When the playlist's source can persist playlists, write the on-source
 * artifact (local `.m3u` / remote OS API) so it stays in sync with the app.
 */
async function writeThroughSource(playlist: Playlist): Promise<void> {
  const song = playlist.songs.length > 0
    ? await resolveSong(playlist.songs[0].songId)
    : null;

  // No songs → no source context; keep the app-side playlist only.
  if (!song) return;

  const sources = await getSourcesStore().getSources();
  const source = sources.find((s) => s.id === song.sourceId);
  if (!source || !source.capabilities.playlistWrite) return;

  const adapter = getPlaylistWriteAdapter();
  await adapter.write(source, playlist, resolvePath);
}

/** Resolve a song by id from the catalog store. */
async function resolveSong(songId: string) {
  return (await getStore().get(songId)) ?? null;
}

/** Resolve a song id to its on-source path for the playlist file. */
async function resolvePath(songId: string): Promise<string | undefined> {
  const song = await resolveSong(songId);
  return song?.relativePath;
}

/**
 * Domain: Playlists.
 * Open Subsonic equivalent: updatePlaylist() (song add/remove/reorder).
 *
 * Add a song to a playlist, recording its added date. Appends when the song
 * is not already present; otherwise leaves the playlist unchanged.
 */
export async function addSongToPlaylist(
  playlistId: string,
  songId: string
): Promise<Playlist | null> {
  const store = getPlaylistStore();
  const playlist = await store.get(playlistId);
  if (!playlist) return null;

  if (playlist.songs.some((e) => e.songId === songId)) {
    return playlist;
  }

  const entry: PlaylistEntry = { songId, addedAt: Date.now() };
  const updated: Playlist = {
    ...playlist,
    songs: [...playlist.songs, entry],
    updatedAt: Date.now(),
  };

  await store.save(updated.id, updated);
  return updated;
}

/** Remove a song from a playlist (all occurrences). Returns null if absent. */
export async function removeSongFromPlaylist(
  playlistId: string,
  songId: string
): Promise<Playlist | null> {
  const store = getPlaylistStore();
  const playlist = await store.get(playlistId);
  if (!playlist) return null;

  const songs = playlist.songs.filter((e) => e.songId !== songId);
  const updated: Playlist = {
    ...playlist,
    songs,
    updatedAt: Date.now(),
  };

  await store.save(updated.id, updated);
  return updated;
}

/** Delete a playlist by id. No-op when it does not exist. */
export async function deletePlaylist(playlistId: string): Promise<void> {
  const store = getPlaylistStore();
  const existing = await store.get(playlistId);
  if (!existing) return;

  // Delete the on-source artifact (e.g. its `.m3u`) when the source can
  // persist playlists.
  const song =
    existing.songs.length > 0 ? await resolveSong(existing.songs[0].songId) : null;
  if (song) {
    const sources = await getSourcesStore().getSources();
    const source = sources.find((s) => s.id === song.sourceId);
    if (source?.capabilities.playlistWrite) {
      await getPlaylistWriteAdapter().delete(source, existing.id);
    }
  }

  await store.delete(playlistId);
}
