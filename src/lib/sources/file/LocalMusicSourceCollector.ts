/**
 * File-based music source collector (worker-safe).
 *
 * Collects a local folder's songs via the file-system walk + TagLib, with
 * NO UI imports — safe to evaluate inside the web worker bundle.
 */
import type { Song } from "@/models/Song";
import { readTags } from "@/core/metadata";
import { getMetadataReader } from "@/core/ports";
import { collectFileHandles } from "@/lib/persistence/file";
import { uuidv7 } from "uuidv7";
import type { IMusicSourceCollector } from "../IMusicSourceCollector";

/**
 * Collect a local folder's songs via the file-system walk + TagLib.
 */
export const localMusicSourceCollector: IMusicSourceCollector = {
  kind: "local",
  async collectSongs({ source, isCancelled }) {
    const reader = getMetadataReader();
    const handle = (source as { handle: FileSystemDirectoryHandle }).handle;
    const entries: Array<{
      handle: FileSystemFileHandle;
      relativePath: string;
    }> = [];
    await collectFileHandles(handle, entries);

    const songs: Song[] = [];
    for (let index = 0; index < entries.length; index++) {
      if (isCancelled?.()) return songs;

      const { handle: fileHandle, relativePath } = entries[index];
      const metadata = await readTags(fileHandle, reader);
      const song: Song = {
        ...metadata,
        id: uuidv7(),
        filename: fileHandle.name,
        filesize: metadata?.filesize ?? 0,
        relativePath,
        sourceId: source.id,
      };
      songs.push(song);
    }

    return songs;
  },

  /**
   * Resolve picture bytes for a local song: embedded `data` is used
   * directly (local files carry their artwork inline); a URL without
   * data is not resolvable from the file system.
   */
  async resolvePictureBytes(pic: {
    data?: Uint8Array;
    url?: string;
  }, _song: Song): Promise<Uint8Array | null> {
    if (pic.data && pic.data.length > 0) return pic.data;
    return null;
  },
};
