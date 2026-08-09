import { runTagWrite } from "./runTagWrite";
import { runArtworkProcess } from "./runArtworkProcess";
import { runHeavyMetadata } from "./runHeavyMetadata";
import type {
  WorkerJob,
  WorkerProgress,
} from "@/lib/background-jobs/WorkerJob";
import { runBulkImport } from "./runBulkImport";

export const workerStrategies: Record<
  WorkerJob["type"],
  (
    payload: any,
    isCancelled: () => boolean,
    eportProgress: (progress: WorkerProgress) => void
  ) => Promise<any>
> = {
  tagWrite: runTagWrite,
  artworkProcess: runArtworkProcess,
  heavyMetadata: runHeavyMetadata,
  bulkImport: runBulkImport,
};
