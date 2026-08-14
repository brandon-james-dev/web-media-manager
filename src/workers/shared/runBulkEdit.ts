import {
  applySongEdits,
  initMetadataStore,
  persistStoreRootDirectory,
} from "@/lib";
import { loadSongMetadata } from "@/lib/loadSongMetadata";
import type { ITagData } from "@/lib/metadata-utils";
import type { Song } from "@/models/Song";

export async function runBulkEdit(
  payload: {
    directoryHandle: FileSystemDirectoryHandle;
    songIds: string[];
    edits: Partial<ITagData>;
  },
  reportProgress: (p: any) => void
) {
  const { directoryHandle, songIds, edits } = payload;
  initMetadataStore();
  persistStoreRootDirectory(directoryHandle);

  const total = songIds.length;
  let processed = 0;
  const results: Song[] = [];

  for (const id of songIds) {
    let metadata: Song | null = null;

    try {
      metadata = await loadSongMetadata(id);
      if (!metadata) return;
    } catch {
      continue;
    }

    const updated = { ...metadata, ...edits } as Song;

    results.push(updated);

    processed++;

    await applySongEdits(metadata, edits);

    reportProgress({
      processed,
      total,
      id,
    });
  }

  return { processed, results };
}
