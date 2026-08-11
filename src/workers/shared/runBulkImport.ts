import type { Song } from "@/models/Song";
import { initMetadataStore as initDirectoryMetadataStore } from "@/lib/file-utils";
import type { WorkerProgress } from "@/workers";

export async function runBulkImport(
  payload: {
    directoryHandle: FileSystemDirectoryHandle;
  },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<{ ok: true; songs: Song[] } | { cancelled: true }> {
  const { directoryHandle } = payload;

  const store = await initDirectoryMetadataStore(directoryHandle, (p) => {
    reportProgress({
      index: p.index,
      total: p.total,
      percent: p.percent,
      overall: p.overall,
      data: p.song,
      label: `Imported ${p.song.fileHandle?.name}`,
    });
  });

  const songs = await store.getAllSongs();

  return { ok: true, songs };
}
