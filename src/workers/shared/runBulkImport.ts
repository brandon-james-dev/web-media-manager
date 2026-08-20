import type { Song } from "@/models/Song";
import type { WorkerProgress } from "../WorkerJob";
import { initMetadataStore, readSongFile } from "@/lib";
import { TagLibMetadataReader } from "@/lib/taglib-metadata-utils";
import { collectFileHandles } from "@/lib/file-utils";
import { uuidv7 } from "uuidv7";
import type { BackgroundJob } from "@/lib/background-jobs";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";

/**
 * Worker bulk import job — receives a directory handle,
 * traverses it, reads each file, extracts metadata, and returns Song objects.
 */
export async function runBulkImport(
  payload: {
    directoryHandle: FileSystemDirectoryHandle;
  },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<{ ok: true; songs: Song[] } | { cancelled: true }> {
  const { directoryHandle } = payload;
  const store = initMetadataStore() as CombinedMetadataStore;
  const directories = await store.getDirectories();
  const directory = directories
    .reverse()
    .find((d) => d.directoryName == directoryHandle.name);

  if (!directory) {
    throw new Error("The directory was not found");
  }

  const directoryId = directory.id;

  const reader = new TagLibMetadataReader();
  const songs: Song[] = [];

  const entries: Array<{ handle: FileSystemFileHandle; relativePath: string }> =
    [];
  await collectFileHandles(directoryHandle, entries);

  const total = entries.length;
  let index = 0;

  for (const { handle, relativePath } of entries) {
    if (isCancelled()) return { cancelled: true };

    const metadata = await readSongFile(handle, reader);

    const song: Song = {
      ...metadata,
      id: uuidv7(),
      filename: handle.name,
      filesize: metadata?.filesize ?? 0,
      relativePath,
      directoryId,
    };

    songs.push(song);

    reportProgress({
      label: `Queueing artwork for ${song.id}`,
    });

    self.postMessage({
      type: "enqueueJob",
      job: {
        id: uuidv7(),
        state: "pending",
        type: "artworkProcess",
        payload: {
          song,
        },
      } as BackgroundJob,
    });

    reportProgress({
      index,
      total,
      percent: 1,
      overall: (index + 1) / total,
      data: song,
      label: `Imported ${handle.name}`,
    });

    index++;
  }

  return { ok: true, songs };
}
