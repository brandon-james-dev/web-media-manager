import type { WorkerJob } from "@/lib/background-jobs/WorkerJob";
import { workerStrategies } from "./shared/workerStrategies";

let cancelled = false;

self.onmessage = async (event: MessageEvent<any>) => {
  const msg = event.data;

  // cancellation message
  if (msg.type === "cancel") {
    cancelled = true;
    return;
  }

  // job message
  const job: WorkerJob = msg;

  const handler = workerStrategies[job.type];

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
};
