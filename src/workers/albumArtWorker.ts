/// <reference lib="webworker" />

import { db } from "@/data/MediaDb";
import { extractAlbumArtAndThumbnails } from "@/lib/albumArt";
import { arrayBufferToBase64, writeUpdatedTagsToFile } from "@/lib/utils";
import type { Id3FormValues } from "@/models";

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

  const { original, thumb128, thumb64, thumb256, thumb512 } =
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

async function handleWrite(songId: string, imageBytes: ArrayBuffer) {
  const song = await db.songs.get(songId);
  if (!song?.tags) return;

  const id3Tags: Id3FormValues = {
    ...song.tags,
    picture: [arrayBufferToBase64(imageBytes)],
  };

  await writeUpdatedTagsToFile(song, id3Tags);
  await handleExtract(songId, song.fileHandle);
}
