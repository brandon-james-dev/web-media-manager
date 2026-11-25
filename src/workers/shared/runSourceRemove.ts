import { getSourcesStore, getStore } from "@/core/ports";
import { deleteHiddenTracksForSource } from "@/lib/hidden-songs";
import type { WorkerProgress } from "../WorkerJob";

/** Thrown from the progress callback to stop a run that was cancelled. */
class SourceRemoveCanceled extends Error {}

/** The worker job's result, read by the caller when the job completes. */
export interface SourceRemoveResult {
  cancelled: boolean;
  /** Songs deleted from the library for this source. */
  removed: number;
}

/** How many songs are deleted between progress reports. */
const CHUNK_SIZE = 25;

/**
 * Delete a music source and every song imported from it inside the worker.
 *
 * The songs go first, in chunks, so the bar advances on a large library
 * instead of sitting still until one big delete returns. The source record is
 * dropped last, so a cancelled run leaves the source in place with fewer
 * songs rather than an orphaned library.
 */
export async function runSourceRemove(
  payload: { sourceId: string },
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<SourceRemoveResult> {
  const { sourceId } = payload;
  const store = getStore();

  const songs = await store.filter({
    filter: (song) => song.sourceId === sourceId,
  });

  const ids = (songs.data ?? []).map((song) => song.id);
  const total = ids.length;

  let removed = 0;

  try {
    for (let start = 0; start < total; start += CHUNK_SIZE) {
      if (isCancelled()) throw new SourceRemoveCanceled();

      const chunk = ids.slice(start, start + CHUNK_SIZE);

      await store.batchDelete(chunk);
      removed += chunk.length;

      reportProgress({
        index: removed,
        total,
        percent: total === 0 ? 1 : removed / total,
        label: `Removing ${removed} of ${total}`,
        data: { sourceId },
      });
    }

    if (isCancelled()) throw new SourceRemoveCanceled();

    // The hidden entries are keyed by song id, so they have to go with the
    // songs they point at; a re-import of the same folder mints new ids and
    // would otherwise leave the old rows behind forever.
    await deleteHiddenTracksForSource(sourceId);

    await getSourcesStore().deleteSource(sourceId);

    return { cancelled: false, removed };
  } catch (error) {
    if (error instanceof SourceRemoveCanceled) {
      return { cancelled: true, removed };
    }
    throw error;
  }
}

/** Re-exported so the caller's cancel type stays local to this module. */
export { SourceRemoveCanceled };
