import type { Song } from "@/models/Song";
import { getMetadataStore } from "../../persistence/file";
import { getPicturesForSongOfType } from "../artwork/getPicturesForSongOfType";
import { ArtworkType } from "../../contracts";
import { resizeBitmap } from "../artwork/resizeBitmap";

/** Cover updates handed to applySongEdits apart from the tag updates. */
export interface CoverUpdate {
  coverFront?: Blob;
  coverBack?: Blob;
}

/**
 * Apply tag + artwork edits to a song and persist it.
 *
 * `updates` carries only tag/metadata fields (never blobs). A new cover is
 * passed via `cover` and is resized into an embedded picture; a missing
 * cover falls back to the existing artwork of that type.
 */
export async function applySongEdits(
  song: Song,
  updates: Partial<Song>,
  cover?: CoverUpdate,
  callbacks?: {
    onSongUpdated?: (updatedSong: Song) => void;
  }
): Promise<Song> {
  const updatedSong: Song = { ...song, ...updates };

  updatedSong.pictures = updatedSong.pictures?.filter(
    (p) => p.type !== "FrontCover" && p.type !== "BackCover"
  );

  if (cover?.coverFront instanceof Blob) {
    const bitmap = await createImageBitmap(cover.coverFront);

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

  if (cover?.coverBack instanceof Blob) {
    const bitmap = await createImageBitmap(cover.coverBack);

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
