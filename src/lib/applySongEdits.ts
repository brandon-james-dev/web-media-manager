import type { Song } from "@/models/Song";
import { createFileWriteStrategy } from "./file-utils/createFileWriteStrategy";
import { getMetadataStore as getDirectoryMetadataStore } from "./file-utils/initMetadataStore";
import { createCombinedWriteStrategy } from "./createCombinedWriteStrategy";

export async function applySongEdits(
  song: Song,
  updates: Partial<Song>,
  callbacks?: {
    onSongUpdated?: (updatedSong: Song) => void;
  }
): Promise<Song> {
  if (!song.fileHandle) {
    throw new Error("The song's file handle was null");
  }

  const updatedSong = { ...song, ...updates };

  if (updates.coverFront instanceof Blob) {
    const buf = new Uint8Array(await updates.coverFront.arrayBuffer());
    updatedSong.pictures ??= [];
    updatedSong.pictures.push({
      mimeType: updates.coverFront.type || "image/jpeg",
      data: buf,
      type: "FrontCover",
      description: "Front Cover",
    });
  }

  if (updates.coverBack instanceof Blob) {
    const buf = new Uint8Array(await updates.coverBack.arrayBuffer());
    updatedSong.pictures ??= [];
    updatedSong.pictures.push({
      mimeType: updates.coverBack.type || "image/jpeg",
      data: buf,
      type: "BackCover",
      description: "Back Cover",
    });
  }

  const store = getDirectoryMetadataStore();
  const fileWriteStrategy = createFileWriteStrategy(store);

  const writeStrategy = createCombinedWriteStrategy(fileWriteStrategy);

  writeStrategy.write(song.id, updatedSong);

  callbacks?.onSongUpdated?.(updatedSong);

  return updatedSong;
}
