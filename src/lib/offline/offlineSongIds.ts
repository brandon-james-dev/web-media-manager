/**
 * One shared snapshot of the cached song ids.
 *
 * The song table renders a cell per row and the Offline column's sort selector
 * needs the same answer synchronously, so the ids are loaded once and shared
 * rather than queried per row or per comparison.
 */
let snapshot: ReadonlySet<string> = new Set();
const subscribers = new Set<() => void>();
let started = false;

function emit(): void {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

/** The cached song ids as of the last load. Synchronous, for sort selectors. */
export function getOfflineSongIdsSnapshot(): ReadonlySet<string> {
  return snapshot;
}

/** Whether a song's audio is cached, per the current snapshot. */
export function isSongOffline(songId: string): boolean {
  return snapshot.has(songId);
}

/** Reload the snapshot from the cache and notify subscribers. */
export async function reloadOfflineSongIds(): Promise<void> {
  // Imported lazily so this module stays dependency-free: the persistence
  // layer reads the snapshot from a sort selector, and it should not pull the
  // Dexie cache into its module graph.
  const { listOfflineSongIds } = await import("./offlineAudioStore");
  const ids = await listOfflineSongIds();
  snapshot = new Set(ids);
  emit();
}

/** Subscribe to snapshot changes. Returns the unsubscribe function. */
export function onOfflineSongIdsChanged(listener: () => void): () => void {
  subscribers.add(listener);

  if (!started) {
    started = true;
    void reloadOfflineSongIds();
  }

  let unsubscribeCache: (() => void) | undefined;
  let cancelled = false;

  void import("./offlineAudioStore").then(({ onOfflineAudioChanged }) => {
    if (cancelled) return;
    unsubscribeCache = onOfflineAudioChanged(() => {
      void reloadOfflineSongIds();
    });
  });

  return () => {
    cancelled = true;
    subscribers.delete(listener);
    unsubscribeCache?.();
  };
}

/** Test seam: drop the snapshot and its cache subscription. */
export function resetOfflineSongIds(): void {
  snapshot = new Set();
  started = false;
  emit();
}
