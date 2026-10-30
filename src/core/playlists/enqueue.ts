import { wmmBus } from "@/core/events";
import type { Song } from "@/models";

/**
 * Domain: Play Queue.
 * Low-level: emit a `songAdded` signal on the WmmBus when a song is enqueued.
 * Payload carries ids only — the provider/store resolve them to `Song`.
 */
export function enqueue(song: Song): void {
  wmmBus.publish("wmm.playlists.songAdded", { songId: song.id });
}
