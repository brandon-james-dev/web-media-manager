import type { IMetadataReader } from "./metadata-utils";
import type { Song } from "@/models/Song";

export async function importFile(
  file: File,
  reader: IMetadataReader
): Promise<Song | null> {
  const valid = await reader.validate(file);
  if (!valid) return null;

  const tags = await reader.readTags(file);
  const props = await reader.readProperties(file);

  return {
    id: file.name,
    path: file.name,
    fileSizeBytes: file.size,
    ...tags,
    ...props,
  } as Song;
}
