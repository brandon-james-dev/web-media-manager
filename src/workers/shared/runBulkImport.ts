import { uuidv7 } from "uuidv7";
import type { Song } from "@/models/Song";
import type { Playlist } from "@/models";
import { getPlaylistStore } from "@/core/ports";
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
 * library walk), enqueues thumbnail generation, then imports the source's
 * playlists (when its strategy provides them) and returns what was imported. The collector layer is deliberately UI-free so the worker never
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
): Promise<
  { ok: true; songs: Song[]; playlists: Playlist[] } | { cancelled: true }
> {
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
      data: {
        phase: "songs",
        song,
        totalPictureCount: song.pictures?.length ?? 0,
      },
    });
  }

  const playlists = await importPlaylists(
    source,
    collector,
    payload.musicSourceConfig,
    isCancelled,
    reportProgress
  );
  if (!playlists) return { cancelled: true };

  return { ok: true, songs: songCollection, playlists };
}

/**
 * Playlist phase of a bulk import: collect the source's playlists, upsert
 * them, and drop ones the source no longer has (same set logic as songs).
 * Skipped when the strategy has no playlists or could not read them — the
 * existing playlists stay as they are. Returns the imported playlists, or
 * null when cancelled.
 *
 * The final progress report (`data.done`) names what changed so the main
 * thread can refresh and publish `wmm.playlists.imported` — the worker's
 * own store writes don't reach main-thread listeners.
 */
async function importPlaylists(
  source: MusicSource,
  collector: NonNullable<ReturnType<typeof getStrategy>>,
  musicSourceConfig: MusicSourceImportConfig | undefined,
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<Playlist[] | null> {
  if (!collector.collectPlaylists) return [];

  reportProgress({
    index: 0,
    total: 0,
    percent: 0,
    label: `Fetching playlists from "${source.name}"`,
    data: { phase: "playlists", sourceId: source.id },
  });

  const collected = await collector.collectPlaylists({
    source,
    isCancelled,
    musicSourceConfig,
    reportProgress: (progress) =>
      reportProgress({
        ...progress,
        data: { phase: "playlists", sourceId: source.id },
      }),
  });
  if (!collected) return [];
  if (isCancelled()) return null;

  const store = getPlaylistStore();
  const keep = new Set(collected.map((p) => p.id));

  for (let index = 0; index < collected.length; index++) {
    if (isCancelled()) return null;
    await store.save(collected[index].id, collected[index]);
  }

  const removedIds: string[] = [];
  for (const existing of await store.getAll()) {
    if (existing.sourceId === source.id && !keep.has(existing.id)) {
      await store.delete(existing.id);
      removedIds.push(existing.id);
    }
  }

  reportProgress({
    index: collected.length,
    total: collected.length,
    percent: 1,
    label: `Imported ${collected.length} playlist(s) from "${source.name}"`,
    data: {
      phase: "playlists",
      done: true,
      sourceId: source.id,
      playlistIds: collected.map((p) => p.id),
      removedIds,
    },
  });

  return collected;
}
