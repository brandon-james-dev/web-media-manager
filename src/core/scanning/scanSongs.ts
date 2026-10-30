import type { Song } from "@/models";
import { readSongFiles } from "@/lib/metadata/readSongFiles";
import { importSongs } from "@/lib/metadata/importSongs";
import type { IMetadataReader } from "@/lib/contracts/IMetadataReader";
import { ensureStore } from "./ensureStore";

/**
 * Scan a set of file handles, reading metadata via the given reader and
 * persisting each song. Reports progress via an optional callback.
 *
 * Close analog to Open Subsonic `scan()`, minus the long-running job aspect
 * which arrives with the background-job phase.
 */
export async function scanSongs(
  handles: FileSystemFileHandle[],
  reader: IMetadataReader,
  onProgress?: (index: number) => void
): Promise<Song[]> {
  const store = ensureStore();
  const songStream = readSongFiles(handles, reader);
  return importSongs(songStream, store, onProgress);
}
