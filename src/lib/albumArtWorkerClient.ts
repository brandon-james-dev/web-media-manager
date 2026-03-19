import { mediaDb } from "@/data";

let worker: Worker | null = null;

function ensureWorker() {
  if (!worker) {
    worker = new Worker(new URL("@/workers/albumArtWorker.ts", import.meta.url), {
      type: "module",
    });
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
        thumbLarge: msg.thumbLarge ? new Blob([msg.thumbLarge]) : null,
        thumbSmall: msg.thumbSmall ? new Blob([msg.thumbSmall]) : null,
        mtime: Date.now(),
      });

      document.dispatchEvent(
        new CustomEvent("album-art-ready", {
          detail: { songId: msg.songId },
        }),
      );
      break;

    case "write-complete":
      document.dispatchEvent(
        new CustomEvent("album-art-write-complete", {
          detail: { songId: msg.songId },
        }),
      );
      break;

    case "pending-art-complete":
      document.dispatchEvent(
        new CustomEvent("pending-art-complete", {
          detail: { songId: msg.songId },
        }),
      );
      break;

    case "pending-art-error":
      document.dispatchEvent(
        new CustomEvent("pending-art-error", {
          detail: msg,
        }),
      );
      break;
  }
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
