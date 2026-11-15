import { getWmmMusicDb } from "@/lib/persistence/dexie/WmmMusicDb";

/**
 * One cached song's audio, keyed by the app's song id.
 *
 * Stored in Dexie rather than the file system so it survives a reload and is
 * readable from a web worker: a sync job runs off the main thread, where the
 * source's credentials (localStorage-backed) are out of reach, but IndexedDB
 * is not.
 */
export interface OfflineAudioRecord {
  /** The app song id — one cached copy per song. */
  songId: string;
  /** The source the bytes came from, so a source's cache can be dropped. */
  sourceId: string;
  /** The audio bytes. */
  bytes: ArrayBuffer;
  /** Byte length, kept alongside so listings need not read `bytes`. */
  size: number;
  /** MIME type reported by the source, when it gave one. */
  mimeType?: string;
  /** When the bytes were cached (epoch ms). */
  cachedAt: number;
}

type OfflineChangeListener = () => void;

const listeners = new Set<OfflineChangeListener>();

/** Notify subscribers that the cache changed (add, remove, clear). */
function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Subscribe to cache changes. Returns the unsubscribe function, so a
 * component can hand it straight to `useEffect`.
 */
export function onOfflineAudioChanged(
  listener: OfflineChangeListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Cache one song's audio, replacing any earlier copy. */
export async function putOfflineAudio(input: {
  songId: string;
  sourceId: string;
  bytes: ArrayBuffer;
  mimeType?: string;
}): Promise<OfflineAudioRecord> {
  const record: OfflineAudioRecord = {
    songId: input.songId,
    sourceId: input.sourceId,
    bytes: input.bytes,
    size: input.bytes.byteLength,
    mimeType: input.mimeType,
    cachedAt: Date.now(),
  };

  await getWmmMusicDb().offlineAudio.put(record);
  emitChange();

  return record;
}

/**
 * Run a cache read, treating an unavailable IndexedDB as an empty cache.
 * The cache is an optimisation: a browser without IndexedDB (or a worker
 * that cannot open it) must still play and sync from the source.
 */
async function readOr<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.warn("[offline] cache read failed:", error);
    return fallback;
  }
}

/** The cached record for a song, or undefined when it is not cached. */
export async function getOfflineAudio(
  songId: string
): Promise<OfflineAudioRecord | undefined> {
  return await readOr(
    async () => await getWmmMusicDb().offlineAudio.get(songId),
    undefined
  );
}

/** A song's cached bytes, or null when it is not cached. */
export async function getOfflineAudioBytes(
  songId: string
): Promise<ArrayBuffer | null> {
  const record = await getOfflineAudio(songId);
  return record?.bytes ?? null;
}

/** Whether a song's audio is cached. */
export async function hasOfflineAudio(songId: string): Promise<boolean> {
  return await readOr(
    async () => (await getWmmMusicDb().offlineAudio.where({ songId }).count()) > 0,
    false
  );
}

/** Drop one song's cached audio. No-op when it was not cached. */
export async function deleteOfflineAudio(songId: string): Promise<void> {
  await getWmmMusicDb().offlineAudio.delete(songId);
  emitChange();
}

/** Drop every cached song belonging to one source. */
export async function deleteOfflineAudioForSource(
  sourceId: string
): Promise<number> {
  const count = await getWmmMusicDb()
    .offlineAudio.where({ sourceId })
    .delete();
  if (count > 0) emitChange();
  return count;
}

/** Every cached song id. */
export async function listOfflineSongIds(): Promise<string[]> {
  return await readOr(
    async () => await getWmmMusicDb().offlineAudio.toCollection().primaryKeys(),
    []
  );
}

/** Total bytes held by the cache. */
export async function getOfflineAudioTotalSize(): Promise<number> {
  const records = await readOr(
    async () => await getWmmMusicDb().offlineAudio.toArray(),
    []
  );
  return sumOfflineSizes(records);
}

/** Drop the whole cache. */
export async function clearOfflineAudio(): Promise<void> {
  await getWmmMusicDb().offlineAudio.clear();
  emitChange();
}

/**
 * Sum the cached sizes. Split out from the store so the arithmetic is
 * testable without IndexedDB.
 */
export function sumOfflineSizes(
  records: Pick<OfflineAudioRecord, "size">[]
): number {
  return records.reduce((total, record) => total + record.size, 0);
}
