import { AlbumArtImage } from "@/components/album-art-image";
import { ThumbnailSize } from "@/lib";
import { usePlayback } from "@/hooks";
import { wmmBus } from "@/events";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * The now-playing rectangle on the TV pages.
 *
 * A television has no persistent player bar: the remote drives playback, and
 * the full controls live in the now-playing view. This rectangle keeps the
 * current track visible, carries the transport buttons, and is the way into
 * that view, so it is a focus stop like any other tile.
 */
export function TvNowPlaying() {
  const { nowPlaying, isPlaying, getCurrentTime, getDuration } = usePlayback();
  // Position is stored with the song it belongs to, so a new track reads as 0
  // without an effect having to reset it.
  const [tick, setTick] = useState<{ songId?: string; seconds: number }>({
    seconds: 0,
  });
  const position = tick.songId === nowPlaying?.id ? tick.seconds : 0;

  // The provider recreates its readers on every render, so hold the latest in
  // a ref. Syncing it in an effect keeps the ref out of the render path.
  const readTime = useRef(getCurrentTime);
  useEffect(() => {
    readTime.current = getCurrentTime;
  }, [getCurrentTime]);

  // The provider exposes readers rather than a ticking value, so poll while a
  // track is loaded. A second is enough for a progress line.
  useEffect(() => {
    if (!nowPlaying) return;
    const songId = nowPlaying.id;
    const timer = window.setInterval(() => {
      setTick({ songId, seconds: readTime.current() });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [nowPlaying]);

  if (!nowPlaying) {
    return null;
  }

  const duration = getDuration();
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <div className="flex w-full shrink-0 items-center gap-4 rounded-xl border bg-card/80 p-3 shadow-lg backdrop-blur">
      <button
        type="button"
        aria-label="Open now playing"
        onClick={() => wmmBus.invoke("wmm.ui.openNowPlaying")}
        className="flex min-w-0 flex-1 cursor-default items-center gap-4 rounded-lg p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
          <AlbumArtImage
            songId={nowPlaying.id}
            thumbSize={ThumbnailSize.thumb128}
            className="size-full object-cover"
            fallback={<div className="size-full bg-muted" />}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{nowPlaying.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[nowPlaying.artist, nowPlaying.album].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Previous track"
          onClick={() => wmmBus.invoke("wmm.playback.prev")}
          className="flex size-11 cursor-default items-center justify-center rounded-full outline-none hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SkipBack className="fill-current" />
        </button>
        <button
          type="button"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={() => wmmBus.invoke("wmm.playback.playpause")}
          className="flex size-12 cursor-default items-center justify-center rounded-full bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isPlaying ? <Pause /> : <Play />}
        </button>
        <button
          type="button"
          aria-label="Next track"
          onClick={() => wmmBus.invoke("wmm.playback.next")}
          className="flex size-11 cursor-default items-center justify-center rounded-full outline-none hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SkipForward className="fill-current" />
        </button>
      </div>
    </div>
  );
}
