import type { Song } from "@/models";
import { isSongOffline } from "@/lib/offline";

export type QueryOptions<T> = {
  filter?: (item: T) => boolean;

  sort?: {
    selector: (item: T) => any;
    desc: boolean;
  };

  skip?: number;
  take?: number;
  page?: number;

  /**
   * List songs the user hid from the library. Off by default: the store drops
   * them from the result, so no caller can list them by accident. Only the
   * Songs page's "show hidden" switch turns it on.
   */
  includeHidden?: boolean;
};

export const selectors = {
  title: (s: Song) => s.title,
  artist: (s: Song) => s.artist,
  album: (s: Song) => s.album,
  track: (s: Song) => s.track,
  genre: (s: Song) => s.genre,
  year: (s: Song) => s.year,
  duration: (s: Song) => s.duration,
  bitrate: (s: Song) => s.bitrate,
  /**
   * Offline sorts below online: a cached song yields `false`, an uncached one
   * `true`, so ascending order lists the songs that are already available
   * offline first.
   */
  offline: (s: Song) => !isSongOffline(s.id),
} as const;

export type SortableColumn = keyof typeof selectors;

/**
 * Orders two songs by disc, then track, with a missing number last, so one
 * album's songs stay in the order the album lists them.
 *
 * @example
 * ```ts
 * songs.sort(compareDiscThenTrack);
 * ```
 */
export function compareDiscThenTrack(a: Song, b: Song): number {
  const byDisc = compareNumbersLast(a.discNumber, b.discNumber);
  if (byDisc !== 0) return byDisc;
  return compareNumbersLast(a.track, b.track);
}

/**
 * The tie-breaker a sort applies when its primary comparison is equal: disc
 * then track for an album sort, and none for any other column.
 *
 * @example
 * ```ts
 * sortTieBreaker(selectors.album); // compareDiscThenTrack
 * sortTieBreaker(selectors.title); // undefined
 * ```
 */
export function sortTieBreaker(
  selector: unknown
): ((a: Song, b: Song) => number) | undefined {
  return selector === selectors.album ? compareDiscThenTrack : undefined;
}

/** Orders two numbers, with a missing one last. */
function compareNumbersLast(
  left: number | undefined,
  right: number | undefined
): number {
  if (left === right) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return left - right;
}
