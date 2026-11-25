/**
 * One shared snapshot of the song ids hidden from the library.
 *
 * The song table renders a row per song and the context menu needs the same
 * answer synchronously, so the ids are loaded once and shared rather than
 * queried per row. The provider also composes them into its query filter, so
 * a change has to reach every subscriber at once.
 */
let snapshot: ReadonlySet<string> = new Set();
const subscribers = new Set<() => void>();
let started = false;

function emit(): void {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

/** The hidden song ids as of the last load. Synchronous, for menu labels. */
export function getHiddenSongIdsSnapshot(): ReadonlySet<string> {
  return snapshot;
}

/** Whether a song is hidden, per the snapshot. */
export function isSongHidden(songId: string): boolean {
  return snapshot.has(songId);
}

/** Reload the snapshot from the store and notify subscribers. */
export async function reloadHiddenSongIds(): Promise<void> {
  // Imported lazily so this module stays dependency-free: the provider reads
  // the snapshot while filtering, and it should not pull Dexie into its graph.
  try {
    const { listHiddenSongIds } = await import("./hiddenTrackStore");
    snapshot = new Set(await listHiddenSongIds());
  } catch (error) {
    // Keep the last known set: an unreadable store must not unhide everything.
    console.warn("[hidden] snapshot reload failed:", error);
    return;
  }

  emit();
}

/** Subscribe to snapshot changes. Returns the unsubscribe function. */
export function onHiddenSongIdsChanged(listener: () => void): () => void {
  subscribers.add(listener);

  if (!started) {
    started = true;
    void reloadHiddenSongIds();
  }

  let unsubscribeStore: (() => void) | undefined;
  const unsubscribeSources: (() => void)[] = [];
  let cancelled = false;

  void import("./hiddenTrackStore").then(({ onHiddenTracksChanged }) => {
    if (cancelled) return;
    unsubscribeStore = onHiddenTracksChanged(() => {
      void reloadHiddenSongIds();
    });
  });

  // A removed source drops its hidden entries inside the worker, where the
  // store's change listeners do not reach this thread. The source deletion
  // event does, so the snapshot is rebuilt from it.
  void import("@/core/ports").then(({ getSourcesStore }) => {
    if (cancelled) return;

    try {
      const store = getSourcesStore();
      const refresh = () => void reloadHiddenSongIds();

      unsubscribeSources.push(store.onSourceDeleted(refresh));
      unsubscribeSources.push(store.onSourcesCleared(refresh));
    } catch {
      // No provider registered yet: the store subscription still covers writes.
    }
  });

  return () => {
    cancelled = true;
    subscribers.delete(listener);
    unsubscribeStore?.();
    for (const unsubscribe of unsubscribeSources) unsubscribe();
  };
}

/** Test seam: drop the snapshot and its store subscription. */
export function resetHiddenSongIds(): void {
  snapshot = new Set();
  started = false;
  emit();
}
