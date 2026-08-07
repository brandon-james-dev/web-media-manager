import type { IMetadataReader } from "./metadata-utils";
import type { Song } from "@/models/Song";

export async function readSongFile(
  fileHandle: FileSystemFileHandle,
  reader: IMetadataReader
): Promise<Song | null> {
  const file = await fileHandle.getFile();
  const valid = await reader.validate(file);
  if (!valid) return null;

  const tags = await reader.readTags(file);
  const props = await reader.readProperties(file);

  return {
    id: file.name,
    path: file.name,
    fileSizeBytes: file.size,
    fileHandle,
    ...tags,
    ...props,
  } as Song;
}
