import { useCallback } from "react";
import { wmmBus } from "@/events";
import { shuffleState, usePlayback } from "./usePlayback";

/**
 * Returns a function that plays the given songs shuffled: turns shuffle on
 * (the provider shuffles as it advances), queues the songs, and starts from a
 * random one so the first track is not always the list's first.
 */
export function useShufflePlay(): (songIds: string[]) => void {
  const { shuffle } = usePlayback();

  return useCallback(
    (songIds: string[]) => {
      if (!songIds.length) return;
      if (shuffle !== shuffleState.On) {
        wmmBus.invoke("wmm.playback.toggleShuffle");
      }
      wmmBus.invoke("wmm.playback.playQueue", { songIds });
      wmmBus.invoke("wmm.playback.playSong", {
        songId: songIds[Math.floor(Math.random() * songIds.length)],
      });
    },
    [shuffle]
  );
}
