import type { WorkerJob } from "@/workers";
import { workerStrategies } from "./shared";
import { registerBrowserMetadataReader } from "@/lib/metadata/reader/browserMetadataReader";
import { registerBrowserStoreProvider } from "@/lib/persistence/browser/storeProvider";

// Workers run in their own thread and do not execute App.tsx bootstrap, so
// the core ports must be registered here before any job dispatches.
registerBrowserMetadataReader();
registerBrowserStoreProvider();

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
        },
        job.id,
        job.parentJobId
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
