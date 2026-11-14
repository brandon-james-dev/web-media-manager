import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { formatLength } from "@/lib/formatLength";
import { usePlayback } from "@/hooks/usePlayback";
import { wmmBus } from "@/events";

export interface TvPlaybackControlsProps {
  /** Fade the bar out; it stays mounted so the scrubber keeps its position. */
  hidden?: boolean;
}

/** How long a scrub gesture keeps the thumb pinned before live position wins. */
const SCRUB_HOLD_MS = 1000;

/**
 * Transport controls and track scrubber for the television now-playing view.
 *
 * A TV has no persistent player bar, so these live inside the overlay and are
 * hidden until the remote or a pointer wakes them. Every control is a focus
 * stop, so the D-pad reaches them like any other tile.
 */
export function TvPlaybackControls({ hidden = false }: TvPlaybackControlsProps) {
  const { nowPlaying, isPlaying, getCurrentTime, getDuration } = usePlayback();
  const [position, setPosition] = useState(0);
  // While scrubbing, the thumb follows the gesture rather than the poll, so it
  // does not snap back to the old position between seeks.
  const [scrubPct, setScrubPct] = useState<number | null>(null);
  const scrubTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The provider recreates its readers on every render; hold the latest in a
  // ref so the poll effect does not restart each render.
  const readTime = useRef(getCurrentTime);
  useEffect(() => {
    readTime.current = getCurrentTime;
  }, [getCurrentTime]);

  useEffect(() => {
    if (!nowPlaying) return;
    const songId = nowPlaying.id;
    const timer = window.setInterval(() => {
      setPosition((prev) => {
        const next = readTime.current();
        // Ignore a poll that belongs to the previous track.
        return songId === nowPlaying.id ? next : prev;
      });
    }, 500);
    return () => window.clearInterval(timer);
  }, [nowPlaying]);

  useEffect(
    () => () => {
      if (scrubTimer.current) clearTimeout(scrubTimer.current);
    },
    []
  );

  if (!nowPlaying) {
    return null;
  }

  const duration = getDuration() || nowPlaying.duration || 0;
  const livePct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const pct = scrubPct ?? livePct;
  const shownSeconds = (pct / 100) * duration;

  function handleScrub(value: number | readonly number[]) {
    const next = Number(Array.isArray(value) ? value[0] : value);
    setScrubPct(next);
    wmmBus.invoke("wmm.playback.seek", { positionSeconds: next });
    if (scrubTimer.current) clearTimeout(scrubTimer.current);
    scrubTimer.current = setTimeout(() => setScrubPct(null), SCRUB_HOLD_MS);
  }

  return (
    <div
      data-tv-playback-controls="true"
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/80 via-black/50 to-transparent px-8 pt-10 pb-6 transition-opacity duration-300",
        hidden && "pointer-events-none opacity-0"
      )}
    >
      <div className="mx-auto flex w-4xl flex-col gap-3">
        <div className="flex items-center gap-4">
          <span className="w-12 text-right text-sm tabular-nums text-white/80">
            {formatLength(shownSeconds)}
          </span>
          {/* A native range input: it is focusable, exposes role="slider" with
              its value, and the arrow keys adjust it, which is what the remote
              needs. The shared Slider's thumb is a plain div with no tab stop,
              so it cannot be reached from a D-pad. */}
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            aria-label="Seek"
            onChange={(event) => handleScrub(Number(event.target.value))}
            className="h-1 flex-1 cursor-default appearance-none rounded-full bg-white/25 accent-white outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{
              backgroundImage: `linear-gradient(to right, white ${pct}%, transparent ${pct}%)`,
            }}
          />
          <span className="w-12 text-sm tabular-nums text-white/80">
            {duration > 0 ? formatLength(duration) : "--:--"}
          </span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Previous track"
            onClick={() => wmmBus.invoke("wmm.playback.prev")}
            className="flex size-12 cursor-default items-center justify-center rounded-full text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SkipBack className="size-6 fill-current" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => wmmBus.invoke("wmm.playback.playpause")}
            className="flex size-16 cursor-default items-center justify-center rounded-full bg-white text-black outline-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isPlaying ? (
              <Pause className="size-7 fill-current" />
            ) : (
              <Play className="size-7 fill-current" />
            )}
          </button>
          <button
            type="button"
            aria-label="Next track"
            onClick={() => wmmBus.invoke("wmm.playback.next")}
            className="flex size-12 cursor-default items-center justify-center rounded-full text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SkipForward className="size-6 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
