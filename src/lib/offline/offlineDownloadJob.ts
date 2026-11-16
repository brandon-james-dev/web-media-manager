import { uuidv7 } from "uuidv7";
import { getJobService } from "@/core/jobs";
import type { Song } from "@/models";
import {
  advanceOfflineBatch,
  completeOfflineBatch,
  startOfflineBatch,
} from "./offlineDownloads";
import { resolveThroughSource } from "./songOffline";
import { reloadOfflineSongIds } from "./offlineSongIds";
import { notification$ } from "@/events/notification-events";
import { i18n } from "@/i18n";

export interface OfflineDownloadJobResult {
  cached: number;
  failed: string[];
}

/**
 * Cache a batch of songs for offline use.
 *
 * The audio is fetched here, on the main thread, because a remote source's
 * credentials live in localStorage and a worker cannot read them — fetching
 * inside the worker silently produced nothing, which is why the context-menu
 * action appeared to do nothing while the per-row button worked. The bytes are
 * then handed to a worker job that writes them to the cache, so the writes
 * still run off the main thread and report progress per song.
 *
 * The batch advances as each song's audio arrives, so an album ring fills
 * while the download runs rather than jumping at the end.
 */
export async function runOfflineDownloadJob(
  songs: Song[],
  batchId: string
): Promise<OfflineDownloadJobResult> {
  startOfflineBatch(
    batchId,
    songs.map((song) => song.id)
  );

  let cached = 0;
  const failed: string[] = [];
  const items: {
    songId: string;
    sourceId: string;
    title: string;
    bytes: ArrayBuffer;
  }[] = [];

  // A bulk download gets a progress notification in the same shape as a bulk
  // import. One stable id per batch so each update replaces the last.
  const bulk = songs.length > 1;
  const notificationId = `offline-download:${batchId}`;

  try {
    for (const [index, song] of songs.entries()) {
      let bytes: ArrayBuffer | null = null;

      try {
        bytes = await resolveThroughSource(song);
      } catch {
        bytes = null;
      }

      if (bytes) {
        items.push({
          songId: song.id,
          sourceId: song.sourceId,
          title: song.title ?? song.filename,
          bytes,
        });
      } else {
        failed.push(song.title ?? song.filename);
      }

      advanceOfflineBatch(batchId);

      if (bulk) {
        notification$.next({
          id: notificationId,
          kind: "Offline Download",
          state: "progress",
          title: i18n.t("notification.downloadingSongs"),
          payload: {
            index: index + 1,
            total: songs.length,
            percent: (index + 1) / songs.length,
          },
        });
      }
    }

    if (items.length > 0) {
      const written = await writeItems(items, batchId);
      cached = written.cached;
      failed.push(...written.failed);
    }
  } finally {
    completeOfflineBatch(batchId);
    // The cache writes happened in a worker, so its change event never
    // reaches this thread. Reload the shared snapshot here, or the Offline
    // column keeps showing the songs as not downloaded.
    await reloadOfflineSongIds();

    if (bulk) {
      notification$.next({
        id: notificationId,
        kind: "Offline Download",
        state: "completed",
        title: i18n.t("notification.downloadingSongs"),
        payload: { cached, failed },
      });
    }
  }

  return { cached, failed };
}

/** Hand the fetched audio to a worker job and wait for its result. */
async function writeItems(
  items: {
    songId: string;
    sourceId: string;
    title: string;
    bytes: ArrayBuffer;
  }[],
  batchId: string
): Promise<{ cached: number; failed: string[] }> {
  const jobId = uuidv7();
  const service = getJobService();

  return await new Promise((resolve) => {
    const finish = (result: { cached: number; failed: string[] }) => {
      offCompleted();
      resolve(result);
    };

    const offCompleted = service.onJobCompleted((job) => {
      if (job.type !== "Offline Download") return;
      if (job.id !== jobId) return;

      const result = job.result as
        | { cached?: number; failed?: string[] }
        | undefined;

      finish({
        cached: result?.cached ?? 0,
        failed: result?.failed ?? [],
      });
    });

    service.enqueue(
      {
        type: "Offline Download",
        payload: { items, batchId },
      } as never,
      jobId
    );
  });
}
