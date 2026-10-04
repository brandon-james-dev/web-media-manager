import { applySongEdits } from "@/lib";
import type { WorkerProgress } from "@/workers/WorkerJob";

export async function runTagWrite(
  payload: any,
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
) {
  reportProgress({
    percent: 0.1,
    label: "Initializing TagLib",
  });

  const { songData, updates } = payload;

  const updatedBytes = await applySongEdits(songData, updates);

  reportProgress({
    percent: 1.0,
    label: "Finished writing song tag data",
  });

  return { ok: true, bytes: updatedBytes };
}
