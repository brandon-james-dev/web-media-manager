import { mediaDb } from "@/data";

let worker: Worker | null = null;

type Listener = (msg: any) => void;
const listeners = new Set<Listener>();

function ensureWorker() {
  if (!worker) {
    worker = new Worker(
      new URL("@/workers/albumArtWorker.ts", import.meta.url), { type: "module" },
    );
    worker.onmessage = handleMessage;
  }
  return worker;
}

async function handleMessage(event: MessageEvent) {
  const msg = event.data;

  switch (msg.type) {
    case "art-ready":
      await mediaDb.thumbnails.put({
        songId: msg.songId,
        original: msg.original ? new Blob([msg.original]) : null,
        thumbXLarge: msg.thumbXLarge ? new Blob([msg.thumbXLarge]) : null,
        thumbLarge: msg.thumbLarge ? new Blob([msg.thumbLarge]) : null,
        thumbMedium: msg.thumbMedium ? new Blob([msg.thumbMedium]) : null,
        thumbSmall: msg.thumbSmall ? new Blob([msg.thumbSmall]) : null,
        mtime: Date.now(),
      });
      break;

    case "write-complete":
    case "pending-art-complete":
    case "pending-art-error":
      break;
  }

  // Broadcast to all listeners
  for (const fn of listeners) fn(msg);
}

export function subscribeToAlbumArtEvents(fn: Listener) {
  listeners.add(fn);

  return () => {
    listeners.delete(fn);
  };
}

export function requestAlbumArtExtraction(
  songId: string,
  fileHandle: FileSystemFileHandle,
) {
  ensureWorker().postMessage({
    type: "extract-art",
    songId,
    fileHandle,
  });
}

export function requestAlbumArtWrite(
  songId: string,
  fileHandle: FileSystemFileHandle,
  imageBytes: Uint8Array,
) {
  ensureWorker().postMessage({
    type: "write-art",
    songId,
    fileHandle,
    imageBytes,
  });
}

export function startPendingArtLoop() {
  ensureWorker().postMessage({ type: "start-pending-art-loop" });
}
