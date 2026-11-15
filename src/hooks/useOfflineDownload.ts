import { useEffect, useSyncExternalStore } from "react";
import {
  clearOfflineBatch,
  getOfflineDownloadSnapshot,
  onOfflineDownloadsChanged,
  type OfflineDownloadBatch,
} from "@/lib/offline";

/** How long a finished batch's tick stays on screen. */
const COMPLETED_VISIBLE_MS = 5000;

/**
 * The offline-download batch for one id, kept current as songs cache.
 *
 * A finished batch lingers for a few seconds so its tick can be seen, then
 * clears itself — the card returns to its normal state without the caller
 * having to time anything.
 */
export function useOfflineDownload(
  batchId: string
): OfflineDownloadBatch | undefined {
  const snapshot = useOfflineDownloads();

  const batch = snapshot.get(batchId);

  useEffect(() => {
    if (batch?.state !== "completed") return;

    const timer = setTimeout(
      () => clearOfflineBatch(batchId),
      COMPLETED_VISIBLE_MS
    );

    return () => clearTimeout(timer);
  }, [batch?.state, batchId]);

  return batch;
}

/**
 * Every offline-download batch, kept current. A row reads this to tell whether
 * its own song is still in flight, whichever surface started the download.
 */
export function useOfflineDownloads(): ReadonlyMap<
  string,
  OfflineDownloadBatch
> {
  return useSyncExternalStore(
    onOfflineDownloadsChanged,
    getOfflineDownloadSnapshot,
    getOfflineDownloadSnapshot
  );
}
