import type { Song } from "@/models/Song";
import type { WorkerProgress } from "../WorkerJob";
import { readSongFile } from "@/lib";
import { TagLibMetadataReader } from "@/lib/taglib-metadata-utils";
import { collectFileHandles } from "@/lib/file-utils";
import { getDirectoryIdForHandle } from "@/lib/dexie-utils";

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
  const directoryId = await getDirectoryIdForHandle(directoryHandle);

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
      id: directoryHandle.name + "/" + handle.name,
      filename: handle.name,
      filesize: metadata?.filesize ?? 0,
      relativePath,
      directoryId,
    };

    songs.push(song);

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
