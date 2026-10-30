import { uuidv7 } from "uuidv7";
import type { Song } from "@/models/Song";
import type { WorkerProgress } from "../WorkerJob";
import { initMetadataStore } from "@/lib";
import { readTags } from "@/core/metadata";
import { getMetadataReader } from "@/core/ports";
import { collectFileHandles } from "@/lib/persistence/file";
import type { BackgroundJob } from "@/core/events/background-job-events";
import type { CombinedMetadataStore } from "@/lib/persistence/browser/CombinedMetadataStore";
import type { MusicSource } from "@/models";
import { isLocalSource } from "@/core/contracts/sources";

/**
 * Worker bulk import job — receives a directory handle,
 * traverses it, reads each file, extracts metadata, and returns Song objects.
 */
export async function runBulkImport(
  payload: {
    directory: MusicSource;
  },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void,
  id?: string
): Promise<{ ok: true; songs: Song[] } | { cancelled: true }> {
  const { directory } = payload;
  if (!isLocalSource(directory)) return { cancelled: true };
  const { handle: sourceHandle } = directory;
  if (!id) return { cancelled: true };

  const store = initMetadataStore() as CombinedMetadataStore;

  const sourceId = directory.id;

  const reader = getMetadataReader();
  const songs: Song[] = [];

  const entries: Array<{ handle: FileSystemFileHandle; relativePath: string }> =
    [];
  await collectFileHandles(sourceHandle, entries);

  const total = entries.length;
  const pictureCountMap = new Map<string, number>();

  let index = 0;

  for (const { handle, relativePath } of entries) {
    if (isCancelled()) return { cancelled: true };

    const metadata = await readTags(handle, reader);

    const song: Song = {
      ...metadata,
      id: uuidv7(),
      filename: handle.name,
      filesize: metadata?.filesize ?? 0,
      relativePath,
      sourceId,
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
        parentJobId: id,
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
