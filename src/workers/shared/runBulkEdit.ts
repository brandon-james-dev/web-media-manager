import { updateTags } from "@/core/metadata";
import { getStore } from "@/core/system";
import type { ITagData } from "@/lib/contracts";
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
      metadata = await getStore().get(id);
      if (!metadata) continue;
    } catch {
      continue;
    }

    await updateTags(metadata, edits);

    processed++;

    reportProgress({
      processed,
      total,
      id,
    });
  }

  return { processed };
}
