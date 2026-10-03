import type { WorkerJobType, WorkerProgress } from "@/workers/WorkerJob";
import {
  runArtworkProcess,
  runBulkEdit,
  runHeavyMetadata,
  runBulkImport,
  runTagWrite,
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
  "Heavy Metadata": runHeavyMetadata,
  "Bulk Import": runBulkImport,
  "Online Tag Write": runTagWrite,
};
