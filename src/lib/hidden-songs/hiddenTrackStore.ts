import { getWmmMusicDb } from "@/lib/persistence/dexie/WmmMusicDb";

/**
 * One hidden song, keyed by the app's song id.
 *
 * Kept in Dexie rather than on the song record so hiding never rewrites the
 * library: a re-import or a tag edit leaves the entry alone, and a source's
 * entries can be dropped in one indexed delete. The source id is stored
 * alongside so that delete needs no song lookup.
 */
export interface HiddenTrackRecord {
  /** The app song id — a song is hidden at most once. */
  songId: string;
  /** The source the song came from, so a source's entries can be dropped. */
  sourceId: string;
  /** When the song was hidden (epoch ms). */
  hiddenAt: number;
}

type HiddenChangeListener = () => void;

const listeners = new Set<HiddenChangeListener>();

/** Notify subscribers that the hidden set changed (hide, unhide, clear). */
function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Subscribe to hidden-set changes. Returns the unsubscribe function, so a
 * component can hand it straight to `useEffect`.
 */
export function onHiddenTracksChanged(
  listener: HiddenChangeListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Run a read, treating an unavailable IndexedDB as an empty hidden set.
 * Hiding is a view filter: a browser that cannot open the database must still
 * list its library.
 */
async function readOr<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.warn("[hidden] read failed:", error);
    return fallback;
  }
}

/** Hide one or more songs, replacing any earlier entry for the same song. */
export async function hideTracks(
  songs: Pick<HiddenTrackRecord, "songId" | "sourceId">[]
): Promise<number> {
  if (songs.length === 0) return 0;

  const hiddenAt = Date.now();
  const records: HiddenTrackRecord[] = songs.map((song) => ({
    songId: song.songId,
    sourceId: song.sourceId,
    hiddenAt,
  }));

  await getWmmMusicDb().hiddenTracks.bulkPut(records);
  emitChange();

  return records.length;
}

/** Unhide one or more songs. No-op for ids that were not hidden. */
export async function unhideTracks(songIds: string[]): Promise<number> {
  if (songIds.length === 0) return 0;

  const count = await getWmmMusicDb()
    .hiddenTracks.where("songId")
    .anyOf(songIds)
    .delete();
  if (count > 0) emitChange();

  return count;
}

/** Drop every hidden song belonging to one source. */
export async function deleteHiddenTracksForSource(
  sourceId: string
): Promise<number> {
  const count = await getWmmMusicDb().hiddenTracks.where({ sourceId }).delete();
  if (count > 0) emitChange();
  return count;
}

/** Every hidden song id. */
export async function listHiddenSongIds(): Promise<string[]> {
  return await readOr(
    async () => await getWmmMusicDb().hiddenTracks.toCollection().primaryKeys(),
    []
  );
}

/** Drop the whole hidden set. */
export async function clearHiddenTracks(): Promise<void> {
  await getWmmMusicDb().hiddenTracks.clear();
  emitChange();
}
