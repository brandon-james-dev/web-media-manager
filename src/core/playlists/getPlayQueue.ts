import type { Song } from "@/models";
import { playlistSet$ } from "@/events/player-events";
import { songToChild } from "@/core/contracts";
import { Observable, map } from "rxjs";
import type { PlayQueue } from "./types";

function toQueue(entries: Song[]): PlayQueue {
  return { current: 0, position: 0, entries: entries.map(songToChild) };
}

/**
 * Domain: Play Queue.
 * Open Subsonic equivalent: getPlayQueue().
 *
 * NOTE: today the play queue is ephemeral (React state), so this returns
 * the live queue via the RxJS subject. A persisted PlayQueueStore arrives
 * in a later phase.
 */
export function getPlayQueue(): Observable<PlayQueue> {
  return playlistSet$.pipe(map((songs) => toQueue(songs)));
}
