import { getMetadataDb } from "@/lib/dexie-utils";
import type { WorkerProgress } from "../WorkerJob";
import { resizeBitmap, ThumbnailSize } from "@/lib";
import type { Song, SongArtwork } from "@/models";
import { ArtworkType } from "@/lib/metadata-utils";

export async function runArtworkProcess(
  payload: {
    song: Song;
  },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
) {
  const db = getMetadataDb();
  const { song } = payload;
  const songId = song.id;
  const pictures = song.pictures ?? [];

  if (song.coverFront && song.coverFront.size > 0) {
    const bytes = await song.coverFront.bytes();

    pictures.push({
      data: bytes,
      mimeType: "image/jpeg",
      type: ArtworkType.FrontCover,
    });
  }

  if (song.coverBack && song.coverBack.size > 0) {
    const bytes = await song.coverBack.bytes();

    pictures.push({
      data: bytes,
      mimeType: "image/jpeg",
      type: ArtworkType.BackCover,
    });
  }

  const total = pictures.length;

  if (!total) {
    await db.songArtwork.put({
      songId,
      hasEmbedded: false,
    });
    return { ok: true };
  }

  const existingPictures = await db.songArtwork
    .filter((a) => a.songId == songId)
    .toArray();

  for (let i = 0; i < pictures.length; i++) {
    const pic = pictures[i];

    reportProgress({
      index: i,
      total,
      percent: 0.0,
      overall: i / total,
      label: `Decoding picture ${i + 1}`,
    });

    if (isCancelled()) return { cancelled: true };

    const bitmap = await createImageBitmap(new Blob([pic.data.slice().buffer]));

    reportProgress({
      index: i,
      total,
      percent: 0.25,
      overall: (i + 0.25) / total,
      label: `Generating thumbnails for picture ${i + 1}`,
    });

    if (isCancelled()) return { cancelled: true };

    // PARALLEL thumbnail generation
    const thumbnailPromises = Object.entries(ThumbnailSize).map(
      async ([key, size]) => {
        const blob = await resizeBitmap(bitmap, size);
        return [key, blob] as const;
      }
    );

    const thumbnailEntries = await Promise.all(thumbnailPromises);

    const thumbnails: Record<string, Blob> = {};
    for (const [key, blob] of thumbnailEntries) {
      thumbnails[key] = blob;
    }

    reportProgress({
      index: i,
      total,
      percent: 0.75,
      overall: (i + 0.75) / total,
      label: `Encoding full-size artwork for picture ${i + 1}`,
    });

    if (isCancelled()) return { cancelled: true };

    // Full-size (1000x1000)
    const fullCanvas = new OffscreenCanvas(1000, 1000);
    const fullCtx = fullCanvas.getContext("2d")!;
    fullCtx.drawImage(bitmap, 0, 0, 1000, 1000);
    const fullBlob = await fullCanvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.9,
    });

    reportProgress({
      index: i,
      total,
      percent: 0.9,
      overall: (i + 0.9) / total,
      label: `Saving artwork for picture ${i + 1}`,
    });

    if (isCancelled()) return { cancelled: true };

    let picture = {
      songId,
      hasEmbedded: true,

      artworkType: pic.type,

      full: fullBlob,
      ...thumbnails,
    } as SongArtwork;

    const existing = existingPictures.find((p) => p.artworkType == pic.type);

    // Save into Dexie — one row per picture
    if (existing) {
      picture.id = existing.id;
    }

    await db.songArtwork.put(picture);

    reportProgress({
      index: i,
      total,
      percent: 1.0,
      overall: (i + 1.0) / total,
      label: `Picture ${i + 1} complete`,
    });
  }

  return { ok: true };
}
