import type { Song } from "@/models";
import { songAddedToPlaylist$ } from "@/events/player-events";

/**
 * Domain: Play Queue.
 * Low-level: emit a `songAddedToPlaylist` signal.
 */
export function enqueue(song: Song): void {
  songAddedToPlaylist$.next(song);
}
