/// <reference lib="webworker" />

import { db } from "@/data/MediaDb";
import { extractAlbumArtAndThumbnails } from "@/lib/albumArt";
import { arrayBufferToBase64, writeUpdatedTagsToFile } from "@/lib/utils";

let running = false;

self.onmessage = async (event) => {
  const msg = event.data;

  switch (msg.type) {
    case "extract-art":
      await handleExtract(msg.songId, msg.fileHandle);
      break;

    case "write-art":
      await handleWrite(msg.songId, msg.imageBytes);
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

      self.postMessage({
        type: "pending-art-complete",
        songId: job.songId,
      });
    } catch (err) {
      self.postMessage({
        type: "pending-art-error",
        job,
        error: String(err),
      });
      return;
    }
  }
}

async function handleExtract(
  songId: string,
  fileHandle: FileSystemFileHandle,
) {
  const file = await fileHandle.getFile();

  const { original, thumb128, thumb64 } =
    await extractAlbumArtAndThumbnails(file);

  const originalBuf = original ? await original.arrayBuffer() : null;
  const t128Buf = thumb128 ? await thumb128.arrayBuffer() : null;
  const t64Buf = thumb64 ? await thumb64.arrayBuffer() : null;

  const transfer = [];
  if (originalBuf) transfer.push(originalBuf);
  if (t128Buf) transfer.push(t128Buf);
  if (t64Buf) transfer.push(t64Buf);

  self.postMessage(
    {
      type: "art-ready",
      songId,
      original: originalBuf,
      thumbLarge: t128Buf,
      thumbSmall: t64Buf,
    },
    transfer,
  );
}

async function handleWrite(songId: string, imageBytes: ArrayBuffer) {
  const song = await db.songs.get(songId);
  if (!song?.tags) return;

  song.tags.picture = [arrayBufferToBase64(imageBytes)]

  if (!song?.tags) return;

  await writeUpdatedTagsToFile(song, song?.tags);
  await handleExtract(songId, song.fileHandle);

  self.postMessage({
    type: "write-complete",
    songId,
  });
}
