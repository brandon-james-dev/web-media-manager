import type { Song } from "@/models";
import { readSongFile } from "@/lib/metadata/readSongFile";
import type { IMetadataReader } from "@/lib/contracts/IMetadataReader";

/**
 * Read metadata from a source handle or buffer. Wraps `readSongFile`.
 */
export async function readTags(
  source: ArrayBuffer | FileSystemFileHandle,
  reader: IMetadataReader,
  filename?: string
): Promise<Song | null> {
  return readSongFile(source, reader, filename);
}
