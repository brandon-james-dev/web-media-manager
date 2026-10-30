import type { Song } from "@/models/Song";
import { getMetadataStore } from "../file-utils";
import { getPicturesForSongOfType } from "./getPicturesForSongOfType";
import { ArtworkType } from "../contracts";
import { resizeBitmap } from "./resizeBitmap";

export async function applySongEdits(
  song: Song,
  updates: Partial<Song>,
  callbacks?: {
    onSongUpdated?: (updatedSong: Song) => void;
  }
): Promise<Song> {
  const updatedSong = { ...song, ...updates };

  updatedSong.pictures = updatedSong.pictures?.filter(
    (p) => p.type !== "FrontCover" && p.type !== "BackCover"
  );

  if (updates.coverFront instanceof Blob) {
    const bitmap = await createImageBitmap(updates.coverFront);

    try {
      const resized = await resizeBitmap(bitmap, 512);
      const buf = new Uint8Array(await resized.arrayBuffer());

      updatedSong.pictures ??= [];
      updatedSong.pictures.push({
        mimeType: resized.type,
        data: buf,
        type: "FrontCover",
        description: "Front Cover",
      });
    } finally {
      bitmap.close();
    }
  } else {
    const frontCover = await getPicturesForSongOfType(
      song.id,
      ArtworkType.FrontCover
    );

    if (frontCover) {
      updatedSong.pictures ??= [];
      updatedSong.pictures.push({
        mimeType: frontCover.mimeType ?? "image/webp",
        data: frontCover.data,
        type: "FrontCover",
        description: "Front Cover",
      });
    }
  }

  if (updates.coverBack instanceof Blob) {
    const bitmap = await createImageBitmap(updates.coverBack);

    try {
      const resized = await resizeBitmap(bitmap, 512);
      const buf = new Uint8Array(await resized.arrayBuffer());

      updatedSong.pictures ??= [];
      updatedSong.pictures.push({
        mimeType: resized.type,
        data: buf,
        type: "BackCover",
        description: "Back Cover",
      });
    } finally {
      bitmap.close();
    }
  } else {
    const backCover = await getPicturesForSongOfType(
      song.id,
      ArtworkType.BackCover
    );

    if (backCover) {
      updatedSong.pictures ??= [];
      updatedSong.pictures.push({
        mimeType: backCover.mimeType ?? "image/webp",
        data: backCover.data,
        type: "BackCover",
        description: "Back Cover",
      });
    }
  }

  await getMetadataStore().save(song.id, updatedSong);

  callbacks?.onSongUpdated?.(updatedSong);

  return updatedSong;
}