import type { WorkerProgress } from "@/workers/WorkerJob";
import type { Song } from "@/models/Song";
import { readSongFiles } from "@/lib";
import { TagLibMetadataReader } from "@/lib/taglib-metadata-utils";

export async function runBulkImport(
  payload: {
    handles: FileSystemFileHandle[];
  },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<{ ok: true; songs: Song[] } | { cancelled: true }> {
  const { handles } = payload;
  const total = handles.length;
  const songs: Song[] = [];

  let index = 0;

  const reader = new TagLibMetadataReader();

  for await (const song of readSongFiles(handles, reader)) {
    if (isCancelled()) return { cancelled: true };

    // Report progress for this file
    reportProgress({
      index,
      total,
      percent: 1.0, // each file is atomic
      overall: (index + 1) / total,
      label: `Imported ${song.path}`,
    });

    songs.push(song);
    index++;

    if (isCancelled()) return { cancelled: true };
  }

  return { ok: true, songs };
}
