import type { Song } from "@/models";
import { runOfflineDownloadJob } from "./offlineDownloadJob";
import {
  advanceOfflineBatch,
  completeOfflineBatch,
  startOfflineBatch,
} from "./offlineDownloads";
import {
  deleteOfflineAudio,
  getOfflineAudioBytes,
  putOfflineAudio,
} from "./offlineAudioStore";

/** Reads a song's audio from wherever it lives (source stream, file handle). */
export type SongBytesResolver = (song: Song) => Promise<ArrayBuffer | null>;

/**
 * Resolve a song's audio, preferring the offline cache.
 *
 * The cache comes first for two reasons: a cached song plays without the
 * network, and a sync job runs in a worker where a remote source's
 * credentials are unreachable — so a cached song is the only kind a worker
 * can read from a remote source at all.
 */
export async function resolveSongBytesWithCache(
  song: Song,
  resolveFromSource: SongBytesResolver,
  readCache: (songId: string) => Promise<ArrayBuffer | null> = getOfflineAudioBytes
): Promise<ArrayBuffer | null> {
  const cached = await readCache(song.id);
  if (cached) return cached;

  return await resolveFromSource(song);
}

/**
 * Resolve a song's bytes through its own source strategy — the same dispatch
 * playback uses. Kept here so the sync writer and the cache share one path.
 */
export const resolveThroughSource: SongBytesResolver = async (song) => {
  const { getSourcesStore } = await import("@/core/ports");
  const sources = await getSourcesStore().getSources();
  const source = sources.find((s) => s.id === song.sourceId);
  if (!source) return null;

  // Imported lazily: the source strategies pull in the Subsonic client, which
  // a worker should not load until a job actually needs it.
  const { allMusicSourceStrategies } = await import("@/lib/sources");
  const strategy = allMusicSourceStrategies.find((s) => s.kind === source.kind);

  return strategy ? strategy.resolveSongBytes(song) : null;
};

/** Cache one song's audio for offline use. Returns the cached byte length. */
export async function cacheSongOffline(song: Song): Promise<number> {
  const bytes = await resolveThroughSource(song);

  if (!bytes) {
    throw new Error(
      `Could not read "${song.title}" from its source, so it was not cached.`
    );
  }

  const record = await putOfflineAudio({
    songId: song.id,
    sourceId: song.sourceId,
    bytes,
  });

  return record.size;
}

/** Drop a song's cached audio. No-op when it was not cached. */
export async function removeSongOffline(songId: string): Promise<void> {
  await deleteOfflineAudio(songId);
}

/**
 * The batch id for an album's downloads. Album cards watch this so a card can
 * show how many of its tracks are cached without knowing who started the work.
 */
export function albumOfflineBatchId(album: {
  title: string;
  artist: string;
}): string {
  return `album:${album.title}:${album.artist}`;
}

export interface CacheSongsResult {
  cached: number;
  failed: string[];
}

/**
 * Cache several songs, reporting progress under `batchId`.
 *
 * The work runs as an "Offline Download" worker job so the main thread stays
 * free; the batch store is advanced from the job's progress events. When no
 * job service is registered (tests, a non-browser platform) the same loop
 * runs inline so the cache still fills.
 *
 * One song failing does not stop the batch: a source that cannot read a track
 * should not strand the rest, and the caller reports the failures. The batch
 * is always completed, so a card's ring never sticks at a partial count.
 */
export async function cacheSongsOffline(
  songs: Song[],
  batchId: string
): Promise<CacheSongsResult> {
  try {
    return await runOfflineDownloadJob(songs, batchId);
  } catch {
    return await cacheSongsInline(songs, batchId);
  }
}

/** The inline fallback: cache each song on the calling thread. */
async function cacheSongsInline(
  songs: Song[],
  batchId: string
): Promise<CacheSongsResult> {
  startOfflineBatch(
    batchId,
    songs.map((song) => song.id)
  );

  let cached = 0;
  const failed: string[] = [];

  try {
    for (const song of songs) {
      try {
        await cacheSongOffline(song);
        cached += 1;
      } catch {
        failed.push(song.title ?? song.filename);
      } finally {
        advanceOfflineBatch(batchId);
      }
    }
  } finally {
    completeOfflineBatch(batchId);
  }

  return { cached, failed };
}
