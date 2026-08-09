import { BrowserWorkerAdapter } from "@/workers/BrowserWorkerAdapter";
import { WorkerPool } from "@/workers/WorkerPool";

export const workerPool = new WorkerPool(
  () => new BrowserWorkerAdapter(),
  4 // pool size
);
