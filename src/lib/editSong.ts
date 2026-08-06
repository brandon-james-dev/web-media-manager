import type { IMetadataWriter } from "./metadata-utils";
import type { Song } from "@/models/Song";

export async function editSong(
  file: File,
  updates: Partial<Song>,
  writer: IMetadataWriter
): Promise<boolean> {
  return writer.writeTags(file, updates);
}
