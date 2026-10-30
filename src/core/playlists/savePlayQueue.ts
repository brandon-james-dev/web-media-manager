import type { Song } from "@/models";
import { playlistSet$ } from "@/events/player-events";

/**
 * Domain: Play Queue.
 * Open Subsonic equivalent: savePlayQueue().
 *
 * Publishes a new queue to the existing event bus.
 */
export function savePlayQueue(entries: Song[]): void {
  playlistSet$.next(entries);
}
