import { BrowserWorkerAdapter, WorkerPool } from "@/workers";

let instance: WorkerPool | null = null;

export function getWorkerPool() {
  if (!instance) {
    instance = new WorkerPool(
      () => new BrowserWorkerAdapter(),
      navigator.hardwareConcurrency
    );
  }
  return instance;
}
