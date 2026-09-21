import { getMetadataDb } from "@/lib/dexie-utils";
import type { WorkerProgress } from "../WorkerJob";
import { resizeBitmap, ThumbnailSize } from "@/lib";
import type { Song, SongArtwork } from "@/models";

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

  const existingPictures = await db.songArtwork
    .filter((a) => a.songId == songId)
    .toArray();

  for (let i = 0; i < pictures.length; i++) {
    const pic = pictures[i];

    reportProgress({
      index: i,
      total,
      label: `Decoding picture ${i + 1}`,
    });

    if (isCancelled()) return { cancelled: true };

    const bitmap = await createImageBitmap(new Blob([pic.data.slice().buffer]));

    reportProgress({
      index: i,
      total,
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
    if (existing && existing.id) {
      picture.id = existing.id;
      await db.songArtwork.update(existing.id, picture);
    } else {
      await db.songArtwork.put(picture);
    }

    reportProgress({
      index: i,
      total,
      label: `Picture ${i + 1} complete`,
      data: {
        songId,
        artworkId: picture.id,
      },
    });
  }

  self.postMessage({
    type: `custom:artwork-complete:${songId}`,
    songId,
  });

  return {
    ok: true,
    songId,
  };
}
