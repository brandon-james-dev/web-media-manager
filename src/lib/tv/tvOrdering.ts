import type { PlayHistoryEntry } from "@/models";

/** songId -> epoch ms of its most recent recorded play. */
export type RecencyMap = Map<string, number>;

/**
 * Collapse play history into one timestamp per song.
 *
 * History holds one row per play, so a song played five times appears five
 * times; only the latest matters for ordering.
 */
export function buildRecencyMap(entries: readonly PlayHistoryEntry[]): RecencyMap {
  const map: RecencyMap = new Map();
  for (const entry of entries) {
    const current = map.get(entry.songId) ?? 0;
    if (entry.playedAt > current) {
      map.set(entry.songId, entry.playedAt);
    }
  }
  return map;
}

/** Latest play among a collection's songs; 0 when none has been played. */
export function mostRecentPlay(
  songIds: readonly string[],
  recency: RecencyMap
): number {
  let latest = 0;
  for (const id of songIds) {
    const playedAt = recency.get(id);
    if (playedAt !== undefined && playedAt > latest) {
      latest = playedAt;
    }
  }
  return latest;
}

/**
 * Order collections for the television home.
 *
 * With no play history the order is alphabetical, which is stable and
 * predictable on a first run. Once anything has been played, collections are
 * ordered by their most recently played song, and collections with nothing
 * played yet fall to the end in alphabetical order.
 */
export function orderCollections<T>(
  items: readonly T[],
  songIdsOf: (item: T) => readonly string[],
  nameOf: (item: T) => string,
  recency: RecencyMap
): T[] {
  const byName = (a: T, b: T) => nameOf(a).localeCompare(nameOf(b));
  if (recency.size === 0) {
    return [...items].sort(byName);
  }
  return [...items].sort((a, b) => {
    const difference =
      mostRecentPlay(songIdsOf(b), recency) - mostRecentPlay(songIdsOf(a), recency);
    return difference !== 0 ? difference : byName(a, b);
  });
}
