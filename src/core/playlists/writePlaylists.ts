import {
  getPlaylistStore,
  getPlaylistWriteAdapter,
  getStore,
  getSourcesStore,
} from "@/core/ports";
import type { Playlist, PlaylistEntry } from "@/models";
import { uuidv7 } from "uuidv7";
import { wmmBus } from "@/events";
import { isPlaylistReadOnly } from "./readOnly";

/**
 * Refuse edits to a playlist owned by a source that cannot persist playlists
 * (see `isPlaylistReadOnly`). Callers should already hide the controls; this
 * keeps every other entry point from silently diverging from the source.
 */
async function assertEditable(playlist: Playlist): Promise<void> {
  if (!playlist.sourceId) return;
  const sources = await getSourcesStore().getSources();
  if (isPlaylistReadOnly(playlist, sources)) {
    throw new Error(`Playlist "${playlist.name}" is read-only on its source.`);
  }
}

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
      await assertEditable(existing);
      saved = {
        ...existing,
        ...playlist,
        updatedAt: now,
      };
      await store.save(saved.id, saved);
      await writeThroughSource(saved);
      wmmBus.publish("wmm.playlists.updated", { playlistId: saved.id });
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
  wmmBus.publish("wmm.playlists.created", { playlistId: saved.id });
  return saved;
}

/**
 * When the playlist's source can persist playlists, write the on-source
 * artifact (local `.m3u` / remote OS API) so it stays in sync with the app.
 */
async function writeThroughSource(playlist: Playlist): Promise<void> {
  if (playlist.isFavorites) return;

  const song =
    playlist.songs.length > 0
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
  await assertEditable(playlist);

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
  wmmBus.publish("wmm.playlists.songsAdded", {
    playlistId: updated.id,
    songIds: [songId],
  });
  return updated;
}

/**
 * Add several songs to a playlist in one write, preserving the given order.
 * Songs already present are skipped. Returns null when the playlist is gone.
 */
export async function addSongsToPlaylist(
  playlistId: string,
  songIds: string[]
): Promise<Playlist | null> {
  const store = getPlaylistStore();
  const playlist = await store.get(playlistId);
  if (!playlist) return null;
  await assertEditable(playlist);

  const present = new Set(playlist.songs.map((e) => e.songId));
  const now = Date.now();
  const added: PlaylistEntry[] = songIds
    .filter((songId) => !present.has(songId))
    .map((songId) => ({ songId, addedAt: now }));

  if (added.length === 0) return playlist;

  const updated: Playlist = {
    ...playlist,
    songs: [...playlist.songs, ...added],
    updatedAt: now,
  };

  await store.save(updated.id, updated);
  wmmBus.publish("wmm.playlists.songsAdded", {
    playlistId: updated.id,
    songIds: added.map((e) => e.songId),
  });
  return updated;
}

/**
 * Move a song to the position currently held by another song in the
 * playlist (drag-and-drop reorder). Returns null when the playlist or either
 * song is absent.
 */
export async function moveSongInPlaylist(
  playlistId: string,
  songId: string,
  overSongId: string
): Promise<Playlist | null> {
  const store = getPlaylistStore();
  const playlist = await store.get(playlistId);
  if (!playlist) return null;
  await assertEditable(playlist);

  const from = playlist.songs.findIndex((e) => e.songId === songId);
  const to = playlist.songs.findIndex((e) => e.songId === overSongId);
  if (from < 0 || to < 0) return null;
  if (from === to) return playlist;

  const songs = [...playlist.songs];
  const [moved] = songs.splice(from, 1);
  songs.splice(to, 0, moved);

  const updated: Playlist = { ...playlist, songs, updatedAt: Date.now() };
  await store.save(updated.id, updated);
  wmmBus.publish("wmm.playlists.songMoved", {
    playlistId: updated.id,
    songId,
    toIndex: to,
  });
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
  await assertEditable(playlist);

  const songs = playlist.songs.filter((e) => e.songId !== songId);
  const updated: Playlist = {
    ...playlist,
    songs,
    updatedAt: Date.now(),
  };

  await store.save(updated.id, updated);
  wmmBus.publish("wmm.playlists.songRemoved", {
    playlistId: updated.id,
    songId,
  });
  return updated;
}

/** Delete a playlist by id. No-op when it does not exist. */
export async function deletePlaylist(playlistId: string): Promise<void> {
  const store = getPlaylistStore();
  const existing = await store.get(playlistId);
  if (!existing || existing.isFavorites) return;
  await assertEditable(existing);

  // Delete the on-source artifact (e.g. its `.m3u`) when the source can
  // persist playlists.
  const song =
    existing.songs.length > 0
      ? await resolveSong(existing.songs[0].songId)
      : null;
  if (song) {
    const sources = await getSourcesStore().getSources();
    const source = sources.find((s) => s.id === song.sourceId);
    if (source?.capabilities.playlistWrite) {
      await getPlaylistWriteAdapter().delete(source, existing.id);
    }
  }

  await store.delete(playlistId);
  wmmBus.publish("wmm.playlists.deleted", { playlistId });
}
