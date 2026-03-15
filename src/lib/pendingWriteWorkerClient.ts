const worker = new Worker(
  new URL("../workers/pendingWriteWorker.ts", import.meta.url),
  { type: "module" }
);

type Listener = (msg: any) => void;
const listeners = new Set<Listener>();

worker.onmessage = (event) => {
  for (const fn of listeners) fn(event.data);
};

export function startWriteLoop() {
  worker.postMessage({ type: "start-write-loop" });
}

export function subscribeToWriteEvents(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
