import type { Playlist, Song } from "@/models";
import { parseM3u, toRelativePlaylistPath } from "@/lib/playlists";
import { getPlaylistStore } from "@/core/ports";
import { uuidv7 } from "uuidv7";

/**
 * Import playlist files (`.m3u8`/`.m3u`) discovered during the music scan.
 *
 * Each file is parsed as M3U; referenced tracks are resolved to song ids by
 * matching the M3U relative path against the scanned songs' `relativePath`.
 * Entries that resolve to no known song are skipped (their audio may not
 * be part of this library).
 *
 * The resulting playlist is persisted via the playlist store (idempotent by
 * name — the same name is updated, not duplicated).
 */
export async function importPlaylists(
  handles: FileSystemFileHandle[],
  songs: Song[]
): Promise<void> {
  const store = getPlaylistStore();

  // Index songs by relative path for resolving M3U entries.
  const byPath = new Map<string, Song>();
  for (const song of songs) {
    if (song.relativePath) byPath.set(normalizePath(song.relativePath), song);
  }

  for (const handle of handles) {
    const file = await handle.getFile();
    const text = await file.text();

    const { entries } = parseM3u(text);
    const resolved: { songId: string; addedAt: number }[] = [];

    for (const entry of entries) {
      const relative = toRelativePlaylistPath(entry.path);
      const song = byPath.get(normalizePath(relative));
      if (!song) continue; // audio not in this library
      resolved.push({ songId: song.id, addedAt: Date.now() });
    }

    // Playlist name = file stem (e.g. "Road Trip" for "Road Trip.m3u8").
    const name = file.name.replace(/\.(m3u8?)$/i, "");
    const now = Date.now();

    const playlist: Playlist = {
      id: uuidv7(),
      name,
      songs: resolved,
      createdAt: now,
      updatedAt: now,
    };

    // Save by a stable id so re-importing (idempotency) reuses the row.
    const key = playlistIdByNameKey(name);
    await store.save(key, playlist);
  }
}

/** Normalize a path for matching (forward slashes, case-insensitive). */
function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").toLowerCase();
}

/**
 * A stable persisted id for a discovered playlist, so re-scanning the same
 * playlist file updates the same row instead of duplicating it. Uses the
 * m3u name as the id (names are unique per file stem within a library).
 */
function playlistIdByNameKey(name: string): string {
  return `m3u:${name.toLowerCase()}`;
}
