import type { WorkerJob } from "@/workers";
import { workerStrategies } from "./shared";

let cancelled = false;

self.onmessage = async (event: MessageEvent<any>) => {
  const msg = event.data;

  if (msg as WorkerJob) {
    // job message
    const job: WorkerJob = msg;

    // cancellation message
    if (job.state === "canceled") {
      cancelled = true;
      return;
    }

    const handler = workerStrategies[job.type];

    if (Object.hasOwn(workerStrategies, job.type)) {
      const result = await handler(
        job.payload,
        () => cancelled,
        (progress) => {
          self.postMessage({
            id: job.id,
            type: "progress",
            jobType: job.type,
            ...progress,
          });
        }
      );

      self.postMessage({
        id: job.id,
        type: "complete",
        jobType: job.type,
        result,
      });
    }
  }
};
