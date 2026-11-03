import { uuidv7 } from "uuidv7";
import type { Song } from "@/models/Song";
import type { WorkerProgress } from "../WorkerJob";
import { initMetadataStore } from "@/lib";
import type { BackgroundJob } from "@/events/background-job-events";
import type { CombinedMetadataStore } from "@/lib/persistence/browser/CombinedMetadataStore";
import type { MusicSource } from "@/models";
import { getStrategy } from "@/lib/sources";
import type { MusicSourceImportConfig } from "@/lib/sources/config";

/**
 * Worker bulk import job — collects a MusicSource's songs via its
 * worker-safe collector (`collectSongs`: local file walk, or Open Subsonic
 * library walk), enqueues thumbnail generation, and returns the imported
 * songs. The collector layer is deliberately UI-free so the worker never
 * pulls React/toast/lucide into its bundle.
 */
export async function runBulkImport(
  payload: {
    musicSource: MusicSource;
    /** Generic source config (incl. any main-thread-resolved secret);
     *  resolved by the enqueueing strategy via getMusicSourceImportConfig. */
    musicSourceConfig?: MusicSourceImportConfig;
  },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void,
  id?: string
): Promise<{ ok: true; songs: Song[] } | { cancelled: true }> {
  const { musicSource: source } = payload;
  if (!id) return { cancelled: true };

  const collector = getStrategy(source.kind);
  if (!collector) return { cancelled: true };

  const songCollection = await collector.collectSongs({
    source,
    isCancelled,
    musicSourceConfig: payload.musicSourceConfig,
    reportProgress,
  });

  const store = initMetadataStore() as CombinedMetadataStore;

  // Set logic: diff this source's currently-stored songs against what the
  // collector just found. Songs that exist in the store for this source but
  // are NOT in the freshly-collected set have been removed from the source
  // (deleted from the folder / removed from the server) — drop them.
  const collectedIds = new Set(songCollection.map((s) => s.id));
  const allSongs = await store.getAll();
  const removedIds = allSongs
    .filter((s) => s.sourceId === source.id && !collectedIds.has(s.id))
    .map((s) => s.id);
  if (removedIds.length > 0) {
    await store.batchDelete(removedIds);
    reportProgress({
      percent: 0.5,
      label: `Removed ${removedIds.length} song(s) no longer on "${source.name}"`,
    });
  }

  const total = songCollection.length;

  // Emit progress immediately so the "Bulk Import started" notification
  // shows as soon as the job begins — not after the first save.
  reportProgress({
    index: 0,
    total,
    percent: 0,
    label: `Importing from "${source.name}"`,
  });

  for (let index = 0; index < total; index++) {
    if (isCancelled()) return { cancelled: true };

    const song = songCollection[index];

    // Enqueue thumbnail generation for any cover art.
    if (song.pictures?.some((p) => p.data || p.url)) {
      self.postMessage({
        type: "enqueueJob",
        job: {
          id: uuidv7(),
          parentJobId: id,
          state: "pending",
          type: "Thumbnail Generation",
          payload: { song, musicSourceConfig: payload.musicSourceConfig },
        } as BackgroundJob,
      });
    }

    // Persist, then report progress AFTER the save so the UI's
    // progress-triggered refresh (SongProvider.onJobProgress) sees the
    // song already in the store — no missed refresh.
    store.save(song.id, song);

    reportProgress({
      index,
      total,
      percent: (index + 1) / total,
      label: `Imported ${song.filename || song.title}`,
      data: { song, totalPictureCount: song.pictures?.length ?? 0 },
    });
  }

  return { ok: true, songs: songCollection };
}
