import { wmmBus } from "@/core/events";
import { getStore } from "@/core/system";
import { songToChild } from "@/core/contracts";
import { Observable, filter, from, map, mergeMap, toArray } from "rxjs";
import type { Song } from "@/models";
import type { PlayQueue } from "./types";

function toQueue(entries: Song[]): PlayQueue {
  return { current: 0, position: 0, entries: entries.map(songToChild) };
}

/**
 * Domain: Play Queue.
 * Open Subsonic equivalent: getPlayQueue().
 *
 * Live queue via the WmmBus `queueChanged` event; ids are resolved to songs
 * through the store. A persisted PlayQueueStore arrives in a later phase.
 */
export function getPlayQueue(): Observable<PlayQueue> {
  return wmmBus.on$("wmm.playback.queueChanged").pipe(
    mergeMap((payload) =>
      from(payload?.songIds ?? []).pipe(
        mergeMap((id) => from(getStore().get(id))),
        filter((s): s is Song => !!s),
        toArray()
      )
    ),
    map(toQueue)
  );
}
