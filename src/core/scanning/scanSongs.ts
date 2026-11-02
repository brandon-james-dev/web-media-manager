import type { Song } from "@/models";
import { readSongFiles } from "@/lib/metadata/reader/readSongFiles";
import { importSongs } from "@/lib/metadata/reader/importSongs";
import { isPlaylistFile } from "@/lib/playlists";
import type { IMetadataReader } from "@/lib/contracts/IMetadataReader";
import { ensureStore } from "./ensureStore";
import { importPlaylists } from "./importPlaylists";

/**
 * Scan a set of file handles, reading metadata via the given reader and
 * persisting each song. Playlist files (`.m3u8`/`.m3u`) in the batch are
 * detected by extension and imported as playlists instead of songs.
 * Reports progress via an optional callback.
 *
 * Open Subsonic equivalent: startScan (local variant — sync file handles
 * rather than a server-side job).
 */
export async function scanSongs(
  handles: FileSystemFileHandle[],
  reader: IMetadataReader,
  onProgress?: (index: number) => void
): Promise<Song[]> {
  const store = ensureStore();

  const songHandles: FileSystemFileHandle[] = [];
  const playlistHandles: FileSystemFileHandle[] = [];

  for (const handle of handles) {
    if (isPlaylistFile(handle.name)) {
      playlistHandles.push(handle);
    } else {
      songHandles.push(handle);
    }
  }

  // Import playlist files (`.m3u*`) discovered during the scan.
  if (playlistHandles.length > 0) {
    const songs = await store.getAll();
    await importPlaylists(playlistHandles, songs);
  }

  const songStream = readSongFiles(songHandles, reader);
  return importSongs(songStream, store, onProgress);
}
