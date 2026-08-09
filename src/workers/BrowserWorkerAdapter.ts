import type { WorkerJob } from "@/lib/background-jobs/WorkerJob";
import type { WorkerAdapter } from "./IWorkerAdapter";
import WorkerFile from "./metadata.worker.ts?worker";

export class BrowserWorkerAdapter implements WorkerAdapter {
  private worker: Worker;

  constructor() {
    this.worker = new WorkerFile();
  }

  runJob(job: WorkerJob, onProgress: (msg: any) => void): Promise<any> {
    this.worker.postMessage(job);
    console.log("[WorkerAdapter] runJob called", job);

    return new Promise((resolve, reject) => {
      this.worker.onmessage = (event) => {
        const msg = event.data;

        if (msg.type === "progress") {
          onProgress(msg);
          return;
        }

        if (msg.type === "complete") {
          resolve(msg.result);
          return;
        }

        if (msg.type === "error") {
          reject(msg.error);
          return;
        }
      };
    });
  }

  cancel(jobId: string) {
    this.worker.postMessage({ type: "cancel", jobId });
  }
}
