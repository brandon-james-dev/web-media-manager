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

  const total = songIds.length;
  let processed = 0;

  for (const id of songIds) {
    let metadata: Song | null = null;

    try {
      metadata = await loadSongMetadata(id);
      if (!metadata) continue;
    } catch {
      continue;
    }

    await applySongEdits(metadata, edits);

    processed++;

    reportProgress({
      processed,
      total,
      id,
    });
  }

  return { processed };
}
