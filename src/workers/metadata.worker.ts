import type { WorkerJob } from "@/workers";
import { workerStrategies } from "./shared";
import { registerBrowserMetadataReader } from "@/lib/metadata/reader/browserMetadataReader";
import { registerBrowserStoreProvider } from "@/lib/persistence/browser/storeProvider";
import { registerBrowserSourceProvider } from "@/lib/persistence/browser/sourcesProvider";

// Workers run in their own thread and do not execute App.tsx bootstrap, so
// the core ports must be registered here before any job dispatches.
registerBrowserMetadataReader();
registerBrowserStoreProvider();
registerBrowserSourceProvider();

// Cancellation is tracked per job. A single flag was never reset, so one
// cancelled job left this worker cancelling every job it ran afterwards.
const cancelledJobs = new Set<string>();

self.onmessage = async (event: MessageEvent<any>) => {
  const msg = event.data;

  if (msg as WorkerJob) {
    // job message
    const job: WorkerJob = msg;

    // cancellation message
    if (job.state === "canceled") {
      cancelledJobs.add(job.id);
      return;
    }

    const handler = workerStrategies[job.type];

    if (Object.hasOwn(workerStrategies, job.type)) {
      // A throwing handler must answer with an `error` message. Without this
      // the rejection escaped the async listener as an unhandled rejection,
      // the adapter never saw `complete` or `error`, and its promise never
      // settled — the job hung with no checkpoint and no notification.
      try {
        const result = await handler(
          job.payload,
          () => cancelledJobs.has(job.id),
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
      } catch (error) {
        self.postMessage({
          id: job.id,
          type: "error",
          jobType: job.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
};
