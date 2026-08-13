import type { Song } from "@/models/Song";
import type { IMetadataReader } from "./metadata-utils";

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

  const pictures = tags?.pictures ?? [];

  let coverFront: Blob | undefined;
  let coverBack: Blob | undefined;

  for (const pic of pictures) {
    const blob = new Blob([pic.data.slice()], { type: pic.mimeType });

    if (pic.type === "3" || pic.type === "FrontCover") {
      coverFront = blob;
    } else if (pic.type === "4" || pic.type === "BackCover") {
      coverBack = blob;
    }
  }

  return {
    id: filename,
    filename,
    relativePath: filename,
    fileSizeBytes: file.size,
    coverFront,
    coverBack,
    filesize,
    directoryId: 0,
    ...tags,
    ...props,
  } as Song;
}
