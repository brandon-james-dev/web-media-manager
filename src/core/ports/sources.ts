import type { MusicSource } from "@/core/contracts";

/**
 * Persistence port for configured music sources. A binding stores and
 * returns MusicSource records (browser: Dexie-backed today, server: SQLite
 * later — each binding persists source records however it likes).
 */
export interface MusicSourceRepository {
  /** All configured sources, in merge order (ascending priority). */
  list(): Promise<MusicSource[]>;
}

let sourcesProvider: (() => MusicSourceRepository) | null = null;

/** Register the platform's source repository before first use. */
export function setSourcesProvider(provider: () => MusicSourceRepository): void {
  sourcesProvider = provider;
}

/** Access the source repository through the portable port. */
export function getSourcesStore(): MusicSourceRepository {
  if (!sourcesProvider) {
    throw new Error(
      "[core/ports/sources] No sources provider registered — call setSourcesProvider() during bootstrap."
    );
  }
  return sourcesProvider();
}
