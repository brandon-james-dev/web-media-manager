import { uuidv7 } from "uuidv7";
import type { Song } from "@/models/Song";
import type { WorkerProgress } from "../WorkerJob";
import { initMetadataStore, readSongFile } from "@/lib";
import { TagLibMetadataReader } from "@/lib/taglib-metadata-utils";
import { collectFileHandles } from "@/lib/file-utils";
import type { BackgroundJob } from "@/lib/background-jobs";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";
import type { Directory } from "@/models";

/**
 * Worker bulk import job — receives a directory handle,
 * traverses it, reads each file, extracts metadata, and returns Song objects.
 */
export async function runBulkImport(
  payload: {
    directory: Directory;
  },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<{ ok: true; songs: Song[] } | { cancelled: true }> {
  const { directory } = payload;
  const { directoryHandle } = directory;
  const store = initMetadataStore() as CombinedMetadataStore;

  const directoryId = directory.id;

  const reader = new TagLibMetadataReader();
  const songs: Song[] = [];

  const entries: Array<{ handle: FileSystemFileHandle; relativePath: string }> =
    [];
  await collectFileHandles(directoryHandle, entries);

  const total = entries.length;
  const pictureCountMap = new Map<string, number>();

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

    const pictureCount = song?.pictures?.length ?? 0;

    pictureCountMap.set(song.id, pictureCount);

    const totalPictureCount = [...pictureCountMap.values()].reduce(
      (prev, current) => prev + current
    );

    songs.push(song);

    self.postMessage({
      type: "enqueueJob",
      job: {
        id: uuidv7(),
        state: "pending",
        type: "Thumbnail Generation",
        payload: {
          song,
        },
      } as BackgroundJob,
    });

    reportProgress({
      index,
      total,
      percent: (index + 1) / total,
      data: {
        song,
        totalPictureCount,
      },
      label: `Imported ${handle.name}`,
    });

    index++;

    store.save(song.id, song);
  }

  return { ok: true, songs };
}
