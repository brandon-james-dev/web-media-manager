import { applySongEdits } from "@/lib";
import { loadSongMetadata } from "@/lib/loadSongMetadata";
import type { ITagData } from "@/lib/metadata-utils";
import type { Song } from "@/models/Song";

export async function runBulkEdit(
  payload: {
    songIds: string[];
    edits: Partial<ITagData>;
  },
  reportProgress: (p: any) => void
) {
  const { songIds, edits } = payload;

  let processed = 0;
  const results: any[] = [];

  for (const id of songIds) {
    let metadata: Song | null = null;

    try {
      metadata = await loadSongMetadata(id);
      if (!metadata) return;
    } catch {
      continue;
    }

    const updated = { ...metadata, ...edits };

    results.push({ id, updated });

    processed++;

    await applySongEdits(metadata, edits);

    reportProgress({
      processed,
      total: songIds.length,
      id,
    });
  }

  return { processed, results };
}
