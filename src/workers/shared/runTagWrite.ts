import { applySongEdits } from "@/lib/applySongEdits";
import type { WorkerProgress } from "@/lib/background-jobs/WorkerJob";
import { TagLibMetadataWriter } from "@/lib/taglib-metadata-utils";

export async function runTagWrite(
  payload: any,
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
) {
  reportProgress({ percent: 0.1, label: "Initializing TagLib" });
  const { songData, updates } = payload;

  const writer = new TagLibMetadataWriter();

  const updatedBytes = await applySongEdits(songData, updates, writer);

  reportProgress({ percent: 1.0, label: "Finished writing song tag data" });

  return { ok: true, bytes: updatedBytes };
}
