import { getMetadataDb } from "@/lib/dexie-utils";
import type { WorkerProgress } from "../WorkerJob";
import { resizeBitmap, ThumbnailSize } from "@/lib";
import type { Song } from "@/models";

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
  const total = pictures.length;

  if (!total) {
    await db.songArtwork.put({
      songId,
      hasEmbedded: false,
    });
    return { ok: true };
  }

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

    // Full-size (2160x2160)
    const fullCanvas = new OffscreenCanvas(2160, 2160);
    const fullCtx = fullCanvas.getContext("2d")!;
    fullCtx.drawImage(bitmap, 0, 0, 2160, 2160);
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

    // Save into Dexie — one row per picture
    await db.songArtwork.put({
      songId,
      hasEmbedded: true,

      artworkType: pic.type,

      full: fullBlob,
      ...thumbnails,
    });

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
