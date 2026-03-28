/// <reference lib="webworker" />

import { mediaDb } from "@/data";
import type { PendingWriteJob } from "@/models";
import { writeUpdatedTagsToFile } from "@/lib/utils";
import type { SongTags } from "@/models/SongTags";
import { extractAlbumArtAndThumbnails } from "@/lib/albumArt";

let isProcessing = false;

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg.type === "start-write-loop") {
    processQueue();
  }
};

async function processQueue() {
  if (isProcessing) return;

  const job = await mediaDb.pendingWrites.orderBy("createdAt").first();
  if (!job?.id) return;

  isProcessing = true;

  try {
    await processWriteJob(job);
    self.postMessage({
      type: "write-complete",
      payload: { id: job.songId, tags: job.tags },
    });
  } catch (err) {
    await mediaDb.pendingWrites.delete(job.id);

    self.postMessage({ type: "write-error", error: String(err), job });
  }

  isProcessing = false;

  processQueue();
}

async function processWriteJob(job: PendingWriteJob) {
  const song = await mediaDb.songs.get(job.songId);

  if (!song) throw new Error("The song was not found");

  const updatedTags = job.tags;

  if (!updatedTags) return;

  const { id, fileHandle } = song;

  try {
    //#region Update backing file
    await writeUpdatedTagsToFile(song, updatedTags);
    //#endregion
    //#region Update database
    delete updatedTags.picture;
    await mediaDb.songs.update(id, { tags: updatedTags as SongTags });

    const file = await fileHandle.getFile();

    const { original, thumb512, thumb256, thumb128, thumb64 } =
      await extractAlbumArtAndThumbnails(file);

    await mediaDb.thumbnails.put({
      songId: id,
      original: original,
      thumbXLarge: thumb512,
      thumbLarge: thumb256,
      thumbMedium: thumb128,
      thumbSmall: thumb64,
      mtime: Date.now(),
    });
    //#endregion
  } catch (err) {
    console.error("Failed to write tags:", err);
  }

  await mediaDb.pendingWrites.delete(job.id!);
}
