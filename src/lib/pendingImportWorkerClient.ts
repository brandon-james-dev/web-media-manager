const worker = new Worker(
  new URL("@/workers/pendingImportWorker.ts", import.meta.url),
  { type: "module" }
);

type Listener = (msg: any) => void;
const listeners = new Set<Listener>();

worker.onmessage = (event) => {
  for (const fn of listeners) fn(event.data);
};

export function enqueueImportJob(jobId: number) {
  worker.postMessage({
    type: "start-job",
    jobId
  });
}

export function subscribeToImportEvents(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}