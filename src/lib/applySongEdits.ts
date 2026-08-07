import type { Song } from "@/models/Song";
import type { IMetadataWriter } from "./metadata-utils";

export async function applySongEdits(
  song: Song,
  updates: Partial<Song>,
  writer: IMetadataWriter,
  callbacks?: {
    onSongUpdated?: (updatedSong: Song) => void;
  }
): Promise<Song | null> {
  if (!song.fileHandle) return null;

  const file = await song.fileHandle.getFile();

  // Metadata utils produce updated bytes
  const updatedBytes = await writer.writeTags(file, updates);
  if (!updatedBytes) return null;

  // Write patched bytes directly to the song file
  const writable = await song.fileHandle.createWritable();
  await writable.write(updatedBytes.slice().buffer);
  await writable.close();

  // Update in-memory model
  const updatedSong = { ...song, ...updates };

  // Emit callback
  callbacks?.onSongUpdated?.(updatedSong);

  return updatedSong;
}
