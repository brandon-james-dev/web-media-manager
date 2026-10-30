import { updateTags } from "@/core/metadata";
import type { WorkerProgress } from "@/workers/WorkerJob";

export async function runTagWrite(
  payload: any,
  reportProgress: (progress: WorkerProgress) => void
) {
  reportProgress({
    percent: 0.1,
    label: "Initializing TagLib",
  });

  const { songData, updates } = payload;

  const updatedBytes = await updateTags(songData, updates);

  reportProgress({
    percent: 1.0,
    label: "Finished writing song tag data",
  });

  return { ok: true, bytes: updatedBytes };
}
