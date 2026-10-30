import { getStore } from "@/core/system";
import type { Genre } from "@/core/contracts";

/**
 * Domain: Browsing.
 * Open Subsonic equivalent: getGenres().
 */
export async function getGenres(): Promise<Genre[]> {
  const store = getStore();
  const songs = await store.getAll();

  const counts = new Map<string, number>();
  for (const s of songs) {
    if (s.genre) {
      counts.set(s.genre, (counts.get(s.genre) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([name, songCount]) => ({ name, songCount }));
}
