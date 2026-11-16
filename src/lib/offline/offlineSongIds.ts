/**
 * One shared snapshot of the song ids whose audio is available on this device.
 *
 * "Available" covers two cases: a song cached in the offline store, and a song
 * whose source already holds its own audio (a local folder, or a sync device).
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

/**
 * Whether a source kind always holds its own audio, so its songs need no
 * download and can be synced without one.
 */
export function isAlwaysOfflineKind(kind: string | undefined): boolean {
  return kind === "local" || kind === "sync";
}

/** The available song ids as of the last load. Synchronous, for sort selectors. */
export function getOfflineSongIdsSnapshot(): ReadonlySet<string> {
  return snapshot;
}

/** Whether a song's audio is available on this device, per the snapshot. */
export function isSongOffline(songId: string): boolean {
  return snapshot.has(songId);
}

/** Reload the snapshot from the cache and notify subscribers. */
export async function reloadOfflineSongIds(): Promise<void> {
  // Imported lazily so this module stays dependency-free: the persistence
  // layer reads the snapshot from a sort selector, and it should not pull the
  // Dexie cache into its module graph.
  const { listOfflineSongIds } = await import("./offlineAudioStore");
  const ids = new Set(await listOfflineSongIds());

  // A local folder and a sync device already hold their own audio, so their
  // songs count as available without being cached. Without this a drag from a
  // local source was refused as "not offline" and could never be queued.
  try {
    const { getStore, getSourcesStore } = await import("@/core/ports");
    const [sources, songs] = await Promise.all([
      getSourcesStore().getSources(),
      getStore().getAll(),
    ]);

    const alwaysOffline = new Set(
      sources.filter((s) => isAlwaysOfflineKind(s.kind)).map((s) => s.id)
    );

    for (const song of songs) {
      if (alwaysOffline.has(song.sourceId)) ids.add(song.id);
    }
  } catch {
    // A store that is not wired yet leaves the cached ids as the answer.
  }

  snapshot = ids;
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

  // A source added mid-session brings songs that are already on disk, so the
  // snapshot has to be rebuilt or those songs read as unavailable.
  void import("@/core/ports").then(({ getSourcesStore }) => {
    if (cancelled) return;

    try {
      const store = getSourcesStore();
      const refresh = () => void reloadOfflineSongIds();

      store.onSourceAdded(refresh);
      store.onSourceDeleted(refresh);
      store.onSourcesCleared(refresh);
    } catch {
      // No provider registered yet: the cache subscription still covers writes.
    }
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
