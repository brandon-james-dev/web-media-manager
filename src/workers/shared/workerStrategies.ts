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
  "Thumbnail Generation": runArtworkProcess,
  "Bulk Edit": runBulkEdit,
  "Heavy Metadata": runHeavyMetadata,
  "Bulk Import": runBulkImport,
  "Online Tag Write": runTagWrite,
};
