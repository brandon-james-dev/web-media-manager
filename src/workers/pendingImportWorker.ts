/// <reference lib="webworker" />

import { mediaDb } from "@/data";
import { startPendingArtLoop } from "@/lib/albumArtWorkerClient";
import { mapCommonTagsToSongTags } from "@/lib/utils";
import type { Song, PendingImportJob } from "@/models";
import { parseBlob } from "music-metadata";

let isProcessing = false;

self.onmessage = (event) => {
  const msg = event.data;

  if (msg.type === "start-job") {
    processQueue(msg.jobId);
  }
};

/**
 * Producer–consumer queue:
 * Only one job is processed at a time.
 */
async function processQueue(jobId: number) {
  if (isProcessing) return;
  isProcessing = true;

  try {
    await processJob(jobId);
  } catch (err) {
    self.postMessage({
      type: "error",
      error: String(err),
      jobId,
    });
  }

  isProcessing = false;
}

/**
 * Process a single import job.
 * Resumable: only processes files with status = "pending".
 */
async function processJob(jobId: number) {
  const job = (await mediaDb.pendingImports.get(jobId)) as PendingImportJob;
  if (!job) {
    self.postMessage({ type: "error", error: "Job not found", jobId });
    return;
  }

  const total = job.files.length;

  for (const fileEntry of job.files) {
    if (fileEntry.status !== "pending") continue;

    fileEntry.status = "processing";
    job.updatedAt = Date.now();
    await mediaDb.pendingImports.put(job);

    try {
      const fileHandle = await job.directoryHandle.getFileHandle(
        fileEntry.name,
      );
      const file = await fileHandle.getFile();
      const { format, common } = await parseBlob(file);

      const tags = mapCommonTagsToSongTags(common);

      const song = {
        id: fileEntry.name,
        duration: format.duration ?? 0,
        bitrate: format.bitrate ?? 0,
        fileHandle,
        tags,
      } as Song;

      await mediaDb.songs.put(song);

      await mediaDb.pendingArt.add({
        songId: song.id,
        createdAt: Date.now(),
        fileHandle,
      });

      startPendingArtLoop();

      self.postMessage({
        type: "song-imported",
        payload: song,
      });

      fileEntry.status = "done";
    } catch (err) {
      fileEntry.status = "error";
      self.postMessage({
        type: "file-error",
        file: fileEntry.name,
        error: String(err),
      });
    }

    job.updatedAt = Date.now();
    await mediaDb.pendingImports.put(job);

    const processed = job.files.filter((f) => f.status === "done").length;
    self.postMessage({
      type: "progress",
      processed,
      total,
    });
  }

  const processed = job.files.filter((f) => f.status === "done").length;

  if (processed === total) {
    self.postMessage({
      type: "done",
      jobId,
      processed,
    });

    const thumbnails = await mediaDb.thumbnails.where("songId").anyOf(job.files.map(f => f.name)).toArray();

    // Send a refresh signal to every album art in case it missed it
    for (const thumbnail of thumbnails) {
      dispatchEvent(
        new CustomEvent(`pending-art-complete:${thumbnail.songId}`, {
          detail: { songId: thumbnail.songId },
        }),
      );
    }
  }
}
