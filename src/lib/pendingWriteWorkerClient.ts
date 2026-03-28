const worker = new Worker(
  new URL("@/workers/pendingWriteWorker.ts", import.meta.url),
  { type: "module" },
);

type Listener = (msg: any) => void;
const listeners = new Set<Listener>();

worker.onmessage = (event) => {
  const msg = event.data;

  switch (msg.type) {
    case "write-complete":
      dispatchEvent(
        new CustomEvent(`art-write-completed:${msg.payload.id}`, {
          detail: { tags: msg.payload.tags },
        }),
      );
      dispatchEvent(
        new CustomEvent(`art-thumbnail-complete:${msg.payload.id}`, {
          detail: { songId: msg.payload.id },
        }),
      );
      dispatchEvent(
        new CustomEvent(`art-thumbnail-complete:album:${msg.payload.tags.album}`, {
          detail: { songId: msg.payload.id },
        }),
      );
      break;
  
    default:
      break;
  }
  for (const fn of listeners) fn(event.data);
};

export function startWriteLoop() {
  worker.postMessage({ type: "start-write-loop" });
}

export function subscribeToWriteEvents(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
