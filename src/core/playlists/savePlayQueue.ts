import { wmmBus } from "@/core/events";
import type { Song } from "@/models";

/**
 * Domain: Play Queue.
 * Open Subsonic equivalent: savePlayQueue().
 *
 * Publishes a new queue to the WmmBus. Payload carries ids only — the
 * provider/store resolve them to `Song` objects.
 */
export function savePlayQueue(entries: Song[]): void {
  wmmBus.publish("wmm.playback.queueChanged", {
    songIds: entries.map((s) => s.id),
  });
}
