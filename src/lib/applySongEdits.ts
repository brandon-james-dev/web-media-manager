import type { Song } from "@/models/Song";
import { createFileWriteStrategy } from "./file-utils";
import { createCombinedWriteStrategy, getPicturesForSongOfType } from ".";
import { createDexieWriteStrategy } from "./dexie-utils";
import { ArtworkType } from "./metadata-utils";

export async function applySongEdits(
  song: Song,
  updates: Partial<Song>,
  callbacks?: {
    onSongUpdated?: (updatedSong: Song) => void;
  }
): Promise<Song> {
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
  } else {
    const frontCover = (
      await getPicturesForSongOfType(song.id, ArtworkType.FrontCover)
    ).at(0);

    if (frontCover) {
      updatedSong.pictures ??= [];
      updatedSong.pictures.push({
        mimeType: "image/jpeg",
        data: frontCover.data,
        type: "FrontCover",
        description: "Front Cover",
      });
    }
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
  } else {
    const backCover = (
      await getPicturesForSongOfType(song.id, ArtworkType.BackCover)
    ).at(0);

    if (backCover) {
      updatedSong.pictures ??= [];
      updatedSong.pictures.push({
        mimeType: "image/jpeg",
        data: backCover.data,
        type: "BackCover",
        description: "Back Cover",
      });
    }
  }

  const writeStrategy = createCombinedWriteStrategy(
    createFileWriteStrategy(),
    createDexieWriteStrategy()
  );

  writeStrategy.write(song.id, updatedSong);

  callbacks?.onSongUpdated?.(updatedSong);

  return updatedSong;
}
