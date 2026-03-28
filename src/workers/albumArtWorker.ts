/// <reference lib="webworker" />

import { db } from "@/data/MediaDb";
import { extractAlbumArtAndThumbnails } from "@/lib/albumArt";

let running = false;

self.onmessage = async (event) => {
  const msg = event.data;

  switch (msg.type) {
    case "extract-art":
      await handleExtract(msg.songId, msg.fileHandle);
      break;

    case "start-pending-art-loop":
      if (!running) {
        running = true;
        await processPendingArtLoop();
        running = false;
      }
      break;
  }
};

async function processPendingArtLoop() {
  while (true) {
    const job = await db.pendingArt.orderBy("createdAt").first();
    if (!job?.id) return;

    try {
      await handleExtract(job.songId, job.fileHandle);
      await db.pendingArt.delete(job.id);
      const song = await db.songs.get(job.songId);

      if (!song) break;
    } catch (err) {
      self.postMessage({
        type: "pending-art-error",
        job,
        error: String(err),
      });
      break;
    }
  }
}

async function handleExtract(songId: string, fileHandle: FileSystemFileHandle) {
  const file = await fileHandle.getFile();

  const { original, thumb512, thumb256, thumb128, thumb64 } =
    await extractAlbumArtAndThumbnails(file);

  const originalBuf = original ? await original.arrayBuffer() : null;
  const t512Buf = thumb512 ? await thumb512.arrayBuffer() : null;
  const t256Buf = thumb256 ? await thumb256.arrayBuffer() : null;
  const t128Buf = thumb128 ? await thumb128.arrayBuffer() : null;
  const t64Buf = thumb64 ? await thumb64.arrayBuffer() : null;

  const transfer = [];
  if (originalBuf) transfer.push(originalBuf);
  if (t512Buf) transfer.push(t512Buf);
  if (t256Buf) transfer.push(t256Buf);
  if (t128Buf) transfer.push(t128Buf);
  if (t64Buf) transfer.push(t64Buf);

  self.postMessage(
    {
      type: "art-ready",
      songId,
      original: originalBuf,
      thumbXLarge: t512Buf,
      thumbLarge: t256Buf,
      thumbMedium: t128Buf,
      thumbSmall: t64Buf,
    },
    transfer,
  );
}
