import type { MusicSource, Playlist } from "@/models";
import type { PlaylistWriteAdapter } from "@/core/ports/playlists";
import { serializePlaylist } from "@/lib/playlists";
import { isLocalSource } from "@/core/contracts/sources";

/**
 * Browser-FS playlist writer: serializes a playlist to M3U8 and writes the
 * file to the source's root directory (the picked folder's root), so the
 * playlist appears as a portable `.m3u` next to the music it references.
 *
 * Only valid for `local` sources (those with a `FileSystemDirectoryHandle`).
 * Remote sources (subsonic/server) use their Open Subsonic API adapter.
 */
export class LocalPlaylistWriteAdapter implements PlaylistWriteAdapter {
  async write(
    source: MusicSource,
    playlist: Playlist,
    resolvePath: (songId: string) => string | undefined
  ): Promise<void> {
    if (!isLocalSource(source)) {
      throw new Error(
        "[LocalPlaylistWriteAdapter] Cannot write a remote source's playlists."
      );
    }

    const text = serializePlaylist(playlist, { songPaths: resolvePath });

    // Write `<name>.m3u` at the source root.
    const filename = `${sanitize(playlist.name)}.m3u`;
    const root = source.handle;
    const writable = await root
      .getFileHandle(filename, { create: true })
      .then((h) => h.createWritable());
    await writable.write(text);
    await writable.close();
  }

  async delete(source: MusicSource, playlistId: string): Promise<void> {
    if (!isLocalSource(source)) {
      throw new Error(
        "[LocalPlaylistWriteAdapter] Cannot delete a remote source's playlists."
      );
    }

    const filename = `${sanitize(playlistId)}.m3u`;
    try {
      await source.handle.removeEntry(filename);
    } catch {
      // File may not exist — that's fine (nothing to delete).
    }
  }
}

/** Filesystem-safe playlist name → filename stem. */
function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, "_").trim();
}
