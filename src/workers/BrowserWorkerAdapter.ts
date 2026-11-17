import { backgroundService } from "@/lib/background-jobs";
import type { WorkerJob, IWorkerAdapter } from ".";
import WorkerFile from "./metadata.worker.ts?worker";

export class BrowserWorkerAdapter implements IWorkerAdapter {
  private worker: Worker;
  private loadError: Error | null = null;

  constructor() {
    this.worker = new WorkerFile();
    this.worker.onerror = (event) => {
      this.loadError = new Error(
        event.message || "The background worker failed to start"
      );
    };
  }

  runJob(job: WorkerJob, onProgress: (msg: any) => void): Promise<any> {
    if (this.loadError) return Promise.reject(this.loadError);

    this.worker.postMessage(job);

    return new Promise((resolve, reject) => {
      this.worker.onerror = (event) => {
        this.loadError = new Error(
          event.message || "The background worker failed to start"
        );
        reject(this.loadError);
      };

      this.worker.onmessage = (event) => {
        const msg = event.data;

        // Forward enqueueJob
        if (msg.type === "enqueueJob") {
          backgroundService.enqueue(msg.job);
          return;
        }

        // Workers send: { type: "custom:artwork-complete:<songId>", payload: {...} }
        if (msg.type?.startsWith("custom:")) {
          const eventName = msg.type.substring("custom:".length);
          backgroundService.emitCustom(eventName, msg.payload);
          return;
        }

        // Normal progress event
        if (msg.type === "progress") {
          onProgress(msg);
          return;
        }

        // Job completed inside worker
        if (msg.type === "complete") {
          resolve(msg.result);
          return;
        }

        // Worker error
        if (msg.type === "error") {
          reject(msg.error);
          return;
        }
      };
    });
  }

  cancel(jobId: string) {
    // The worker's message handler looks for `state === "canceled"`; a
    // `{ type: "cancel" }` message falls through to the strategy lookup and
    // is ignored, so cancellation never reached the running job.
    this.worker.postMessage({ state: "canceled", id: jobId });
  }
}
