import { updateTags } from "@/core/metadata";
import { getStore } from "@/core/system";
import type { ITagData } from "@/lib/contracts";
import type { Song } from "@/models/Song";
import type { WorkerProgress } from "../WorkerJob";

export async function runBulkEdit(
  payload: {
    songIds: string[];
    edits: Partial<ITagData>;
    resume?: { done?: number };
  },
  _isCancelled: () => boolean,
  reportProgress: (p: WorkerProgress) => void
) {
  const { songIds, edits } = payload;

  const total = songIds.length;
  const start = Math.min(payload.resume?.done ?? 0, total);
  let processed = 0;

  for (let i = start; i < total; i++) {
    const id = songIds[i];
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
      index: i,
      total,
      percent: (i + 1) / total,
      label: `Updated ${processed + start} of ${total}`,
      checkpoint: { done: i + 1 },
    });
  }

  return { processed };
}
