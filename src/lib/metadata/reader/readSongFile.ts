import type { Song } from "@/models/Song";
import type { IMetadataReader } from "../../contracts";
import { applyTagDataToSong } from "@/core/contracts/mappers";
import { uuidv7 } from "uuidv7";

/**
 * Reads metadata from either:
 *  - a FileSystemFileHandle (preferred)
 *  - an ArrayBuffer + filename fallback
 *
 * TagLib requires a real File, so this function always constructs one.
 */
export async function readSongFile(
  source: ArrayBuffer | FileSystemFileHandle,
  reader: IMetadataReader,
  filename?: string
): Promise<Song | null> {
  let file: File;
  let filesize = 0;

  if (source instanceof FileSystemFileHandle) {
    file = await source.getFile();
    filename = file.name;
    filesize = (await source.getFile()).size;
  } else {
    if (!filename) return null;
    file = new File([source], filename);
    filesize = source.byteLength;
  }

  const tags = await reader.readTags(file);
  const props = await reader.readProperties(file);

  if (!tags && !props) return null;

  const base: Song = {
    id: uuidv7(),
    filename,
    relativePath: filename,
    filesize,
    sourceId: uuidv7(),
  };

  return applyTagDataToSong(base, tags, props);
}
