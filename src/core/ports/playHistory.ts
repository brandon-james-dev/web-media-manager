import type { PlayHistoryEntry } from "@/models";

/**
 * Play history store port: the persistence subset the playback layer needs
 * to record plays. Implemented by the platform store (browser: Dexie
 * `playHistory` table today).
 */
export interface PlayHistoryStore {
  record(entry: PlayHistoryEntry): Promise<void>;
  getAll(): Promise<PlayHistoryEntry[]>;
  /** Most recent plays first. */
  recent(limit: number): Promise<PlayHistoryEntry[]>;
  clearStore(): Promise<void>;
}

let playHistoryStoreProvider: (() => PlayHistoryStore) | null = null;

/** Register the platform's play history store provider during bootstrap. */
export function setPlayHistoryStoreProvider(
  provider: () => PlayHistoryStore
): void {
  playHistoryStoreProvider = provider;
}

/** Access the play history store through the portable port. */
export function getPlayHistoryStore(): PlayHistoryStore {
  if (!playHistoryStoreProvider) {
    throw new Error(
      "[core/ports/playHistory] No play history store provider registered — call setPlayHistoryStoreProvider() during bootstrap."
    );
  }
  return playHistoryStoreProvider();
}
