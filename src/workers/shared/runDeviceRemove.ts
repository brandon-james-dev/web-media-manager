import { SyncService } from "@/lib/sync/SyncService";
import type { SyncDevice } from "@/models";
import type { WorkerProgress } from "../WorkerJob";

/** Thrown from the progress callback to stop a run that was cancelled. */
class RemoveCanceled extends Error {}

/** The worker job's result, read by the provider when the job completes. */
export interface DeviceRemoveResult {
  cancelled: boolean;
  /** Tracks the strategy actually deleted. */
  removed: number;
}

/**
 * Delete tracks from a device inside the worker pool.
 *
 * The device travels in the payload — its directory handle and USB ids are
 * structured-cloneable — so the worker opens the device itself. Progress is
 * reported per track, which is what lets the removal notification fill a bar
 * instead of jumping from zero to done.
 */
export async function runDeviceRemove(
  payload: { device: SyncDevice; trackIds: number[] },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<DeviceRemoveResult> {
  const { device, trackIds } = payload;
  const service = new SyncService();

  let removed = 0;

  try {
    await service.removeTracks(device, trackIds, (completed, total) => {
      if (isCancelled()) throw new RemoveCanceled();

      removed = completed;

      reportProgress({
        index: completed,
        total,
        percent: total === 0 ? 1 : completed / total,
        label: `Removing ${completed} of ${total}`,
        data: { deviceId: device.id },
      });
    });

    return { cancelled: false, removed };
  } catch (error) {
    // A cancelled run is a normal stop: report what was already deleted.
    if (error instanceof RemoveCanceled) {
      return { cancelled: true, removed };
    }
    throw error;
  }
}

/** Re-exported so the strategy's cancel type stays local to this module. */
export { RemoveCanceled };
