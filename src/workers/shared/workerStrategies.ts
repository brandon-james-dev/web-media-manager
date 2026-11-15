import type { WorkerJobType, WorkerProgress } from "@/workers/WorkerJob";
import {
  runArtworkProcess,
  runBulkEdit,
  runBulkImport,
  runDeviceSync,
  runOfflineDownload,
} from ".";

export const workerStrategies: Record<
  WorkerJobType,
  (
    payload: any,
    isCancelled: () => boolean,
    reportProgress: (progress: WorkerProgress) => void,
    id?: string,
    parentJobId?: string
  ) => Promise<any>
> = {
  "Thumbnail Generation": runArtworkProcess,
  "Bulk Edit": runBulkEdit,
  "Bulk Import": runBulkImport,
  "Device Sync": runDeviceSync,
  "Offline Download": runOfflineDownload,
};
