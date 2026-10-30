import type { Song } from "@/models";
import { readSongFiles } from "@/lib/metadata/readSongFiles";
import type { IMetadataReader } from "@/lib/contracts/IMetadataReader";

/**
 * Read metadata from many handles, yielding songs. Wraps `readSongFiles`.
 */
export async function* readManyTags(
  handles: FileSystemFileHandle[],
  reader: IMetadataReader
): AsyncGenerator<Song> {
  yield* readSongFiles(handles, reader);
}
