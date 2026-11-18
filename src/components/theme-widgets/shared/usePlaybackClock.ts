import { useEffect, useState } from "react";
import { usePlayback } from "@/hooks";

/**
 * The playback cursor in seconds, polled at a fixed rate while a track plays
 * and snapped to the engine's position when it pauses or the track changes.
 * Widgets poll rather than subscribe because the engine exposes the cursor as
 * a query, not an event.
 *
 * @example
 * ```xml
 * <SeekBar grow="1" slider="@slider/seek" />
 * ```
 * @example
 * ```ts
 * const elapsed = usePlaybackClock(250);
 * ```
 */
export function usePlaybackClock(intervalMs: number): number {
  const { nowPlaying, isPlaying, getCurrentTime } = usePlayback();
  const [seconds, setSeconds] = useState<number>(0);
  const [songId, setSongId] = useState<string | undefined>(nowPlaying?.id);

  if (songId !== nowPlaying?.id) {
    setSongId(nowPlaying?.id);
    setSeconds(0);
  }

  useEffect(() => {
    if (!isPlaying) {
      setSeconds(getCurrentTime());
      return;
    }
    const id = setInterval(() => setSeconds(getCurrentTime()), intervalMs);
    return () => clearInterval(id);
  }, [isPlaying, nowPlaying, getCurrentTime, intervalMs]);

  return seconds;
}
