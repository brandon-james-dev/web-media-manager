/**
 * Progress for batches of songs being cached for offline use.
 *
 * A batch is keyed by whatever the caller is watching — an album's songs, for
 * instance — so a card can show "3 / 12" while its tracks download without
 * knowing which component started the work. Kept outside React so the cache
 * loop can report progress without a render per song.
 */

export interface OfflineDownloadBatch {
  /** What the batch belongs to (e.g. an album key). */
  id: string;
  /** Songs in the batch. */
  songIds: string[];
  /** Songs finished so far, whether they cached or failed. */
  completed: number;
  /** Songs in the batch. */
  total: number;
  /** The songs that have finished, so a row can tell it is still in flight. */
  doneIds: string[];
  state: "running" | "completed";
  /** Epoch ms the batch finished, so a card can show its tick briefly. */
  finishedAt?: number;
}

type Listener = () => void;

const batches = new Map<string, OfflineDownloadBatch>();
const listeners = new Set<Listener>();

/** Snapshot handed to `useSyncExternalStore`; replaced on every change. */
let snapshot: ReadonlyMap<string, OfflineDownloadBatch> = new Map();

function emit(): void {
  snapshot = new Map(batches);
  for (const listener of listeners) {
    listener();
  }
}

/** Subscribe to batch changes. Returns the unsubscribe function. */
export function onOfflineDownloadsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current batches, as one stable snapshot. */
export function getOfflineDownloadSnapshot(): ReadonlyMap<
  string,
  OfflineDownloadBatch
> {
  return snapshot;
}

/** Begin a batch. Replaces any earlier batch under the same id. */
export function startOfflineBatch(id: string, songIds: string[]): void {
  batches.set(id, {
    id,
    songIds: [...songIds],
    completed: 0,
    total: songIds.length,
    doneIds: [],
    state: "running",
  });
  emit();
}

/** Count one song of a batch as finished. No-op for an unknown batch. */
export function advanceOfflineBatch(id: string, songId?: string): void {
  const batch = batches.get(id);
  if (!batch || batch.state !== "running") return;

  batch.completed = Math.min(batch.completed + 1, batch.total);
  if (songId && !batch.doneIds.includes(songId)) {
    batch.doneIds.push(songId);
  }
  emit();
}

/**
 * Whether a song is part of a batch that is still running. A row uses this to
 * show its spinner, so a download started from the context menu animates the
 * same rows the per-row button would.
 */
export function isSongDownloading(songId: string): boolean {
  for (const batch of batches.values()) {
    if (batch.state !== "running") continue;
    if (!batch.songIds.includes(songId)) continue;
    if (!batch.doneIds.includes(songId)) return true;
  }
  return false;
}

/** Mark a batch finished, recording when so a card can time its tick. */
export function completeOfflineBatch(id: string): void {
  const batch = batches.get(id);
  if (!batch) return;

  batch.state = "completed";
  batch.completed = batch.total;
  batch.finishedAt = Date.now();
  emit();
}

/** Forget a batch, e.g. once its tick has been shown long enough. */
export function clearOfflineBatch(id: string): void {
  if (!batches.delete(id)) return;
  emit();
}

/** Test seam: drop every batch. */
export function resetOfflineBatches(): void {
  batches.clear();
  emit();
}
