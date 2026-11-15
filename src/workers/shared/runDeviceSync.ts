import { SyncService } from "@/lib/sync/SyncService";
import type { SyncSummary } from "@/lib/sync/writers/ISyncStrategy";
import type { Playlist, Song, SyncDevice } from "@/models";
import type { WorkerProgress } from "../WorkerJob";

/** Thrown from the progress callback to stop a run that was cancelled. */
class SyncCanceled extends Error {}

/** The worker job's result, read by the provider when the job completes. */
export interface DeviceSyncResult {
  cancelled: boolean;
  /** What was written; absent for a cancelled run. */
  summary?: SyncSummary;
}

/**
 * Write a sync queue to a device inside the worker pool.
 *
 * The device's directory handle and the queue travel in the payload: both are
 * structured-cloneable, so the worker opens the device itself rather than
 * proxying every file read back to the main thread. Progress is reported per
 * song so the UI can fill the sync button.
 */
export async function runDeviceSync(
  payload: {
    device: SyncDevice;
    songs: Song[];
    playlists: Playlist[];
  },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<DeviceSyncResult> {
  const { device, songs, playlists } = payload;
  const service = new SyncService();

  try {
    const summary = await service.sync(
      device,
      songs,
      playlists,
      (completed, total, outcome) => {
        if (isCancelled()) throw new SyncCanceled();

        reportProgress({
          index: completed,
          total,
          percent: total === 0 ? 1 : completed / total,
          label: `Writing ${completed} of ${total}`,
          // Which song just finished and how, so the queue can tick it off.
          data: outcome,
        });
      }
    );

    return { cancelled: false, summary };
  } catch (error) {
    // A cancelled run is a normal stop, not a failure: report it so the
    // caller can leave the queue in place instead of clearing it.
    if (error instanceof SyncCanceled) {
      return { cancelled: true };
    }
    throw error;
  }
}
