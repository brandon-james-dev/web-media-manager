import type { WorkerJob, WorkerProgress } from "@/workers/WorkerJob";
import {
  runArtworkProcess,
  runBulkEdit,
  runHeavyMetadata,
  runBulkImport,
  runTagWrite,
} from ".";

export const workerStrategies: Record<
  WorkerJob["type"],
  (
    payload: any,
    isCancelled: () => boolean,
    reportProgress: (progress: WorkerProgress) => void
  ) => Promise<any>
> = {
  artworkProcess: runArtworkProcess,
  bulkEdit: runBulkEdit,
  heavyMetadata: runHeavyMetadata,
  bulkImport: runBulkImport,
  tagWrite: runTagWrite,
};
