import { getMetadataDb } from "@/lib/persistence/dexie";
import type { WorkerProgress } from "../WorkerJob";
import { resizeBitmap, ThumbnailSize } from "@/lib";
import { getSourcesStore } from "@/core/ports";
import { getCollector } from "@/lib/sources/collectors";
import type { MusicSourceImportConfig } from "@/lib/sources/config";
import type { Song, SongArtwork } from "@/models";

/**
 * Resolve the raw image bytes for a picture by dispatching to the song's
 * source-kind collector (worker-safe): `data` is used directly (embedded
 * tag art, search results with bytes); a `subsonic://coverart/<id>` URL is
 * resolved by the subsonic collector through the server at the largest
 * available size.
 */
async function resolvePictureBytes(
  pic: { data?: Uint8Array; url?: string },
  song: Song,
  musicSourceConfig?: MusicSourceImportConfig
): Promise<Uint8Array | null> {
  if (pic.data && pic.data.length > 0) return pic.data;

  const sources = await getSourcesStore().getSources();
  const source = sources.find((s) => s.id === song.sourceId);
  if (!source) return null;

  const collector = getCollector(source.kind);
  if (!collector) return null;
  return collector.resolvePictureBytes(pic, song, musicSourceConfig);
}

export async function runArtworkProcess(
  payload: {
    song: Song;
    musicSourceConfig?: MusicSourceImportConfig;
  },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void,
  parentJobId?: string
): Promise<{ ok: true; songId: string } | { cancelled: true }> {
  const db = getMetadataDb();
  const { song } = payload;
  const songId = song.id;
  const pictures = song.pictures ?? [];

  if (!parentJobId) return { cancelled: true };

  const total = pictures.length;

  if (!total) {
    await db.songArtwork.put({
      songId,
      hasEmbedded: false,
    });

    return { ok: true, songId };
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

    // Resolve raw bytes (embedded data, or the largest available remote
    // image for subsonic cover art), then resample locally into the
    // thumbnail sizes.
    const picBytes = await resolvePictureBytes(pic, song, payload.musicSourceConfig);
    if (!picBytes) continue;

    const bitmap = await createImageBitmap(new Blob([picBytes.slice().buffer]));

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
    payload: {
      songId,
    },
  });

  return {
    ok: true,
    songId,
  };
}
