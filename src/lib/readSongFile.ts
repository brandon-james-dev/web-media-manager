import type { Song } from "@/models/Song";
import type { IMetadataReader } from "./metadata-utils";
import { uuidv7 } from "uuidv7";

export async function readSongFile(
  fileHandle: FileSystemFileHandle,
  reader: IMetadataReader
): Promise<Song | null> {
  const file = await fileHandle.getFile();
  const valid = await reader.validate(file);
  if (!valid) return null;

  const tags = await reader.readTags(file);
  const props = await reader.readProperties(file);

  const pictures = tags?.pictures ?? [];

  let coverFront: Blob | undefined;
  let coverBack: Blob | undefined;

  for (const pic of pictures) {
    const blob = new Blob([pic.data.slice().buffer], { type: pic.mimeType });

    if (pic.type === "FrontCover") {
      coverFront = blob;
    } else if (pic.type === "BackCover") {
      coverBack = blob;
    }
  }

  return {
    id: uuidv7(),
    path: file.name,
    fileSizeBytes: file.size,
    fileHandle,
    coverBack,
    coverFront,
    ...tags,
    ...props,
  } as Song;
}
