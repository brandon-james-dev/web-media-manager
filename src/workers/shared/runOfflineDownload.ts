import { putOfflineAudio } from "@/lib/offline/offlineAudioStore";
import type { WorkerProgress } from "../WorkerJob";

/** Thrown from the progress callback to stop a run that was cancelled. */
class DownloadCanceled extends Error {}

/** One song's audio, already fetched on the main thread. */
export interface OfflineDownloadItem {
  songId: string;
  sourceId: string;
  title: string;
  bytes: ArrayBuffer;
}

/** The worker job's result, read by the caller when the job completes. */
export interface OfflineDownloadResult {
  cancelled: boolean;
  /** Songs written to the cache by this run. */
  cached: number;
  /** Titles of songs whose audio could not be written. */
  failed: string[];
}

/**
 * Write already-fetched song audio into the offline cache inside the worker.
 *
 * The bytes are resolved on the main thread and handed over here: a remote
 * source's credentials live in localStorage, which a worker cannot read, so
 * fetching inside the worker silently produced nothing. The worker still does
 * the cache writes, and reports one progress event per song.
 */
export async function runOfflineDownload(
  payload: { items: OfflineDownloadItem[]; batchId: string },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<OfflineDownloadResult> {
  const { items, batchId } = payload;

  let cached = 0;
  const failed: string[] = [];

  try {
    for (const [index, item] of items.entries()) {
      if (isCancelled()) throw new DownloadCanceled();

      let status: "cached" | "failed" = "cached";

      try {
        await putOfflineAudio({
          songId: item.songId,
          sourceId: item.sourceId,
          bytes: item.bytes,
        });
        cached += 1;
      } catch {
        status = "failed";
        failed.push(item.title);
      }

      reportProgress({
        index: index + 1,
        total: items.length,
        percent: items.length === 0 ? 1 : (index + 1) / items.length,
        label: `Caching ${index + 1} of ${items.length}`,
        // Which song just finished, so a card can count its own tracks.
        data: { batchId, songId: item.songId, status },
      });
    }
  } catch (error) {
    // A cancelled run is a normal stop: report what was cached so far.
    if (error instanceof DownloadCanceled) {
      return { cancelled: true, cached, failed };
    }
    throw error;
  }

  return { cancelled: false, cached, failed };
}

/** Re-exported so the strategy's cancel type stays local to this module. */
export { DownloadCanceled };
