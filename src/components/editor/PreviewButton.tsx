import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { usePlayback } from "@/hooks";
import { wmmBus } from "@/core/events";

/** How long a quick-edit preview plays before stopping automatically. */
const PREVIEW_DURATION_SECONDS = 30;

interface PreviewButtonProps {
  songId?: string;
  disabled?: boolean;
}

/**
 * Circular play/pause preview for the quick-edit bar.
 * - Accent-filled circle, no text; toggles play/pause on the selected song.
 * - A CSS mask+conic progress ring around the circle fills as the track plays.
 * - Playback is limited to `PREVIEW_DURATION_SECONDS` (auto-pause at the cap).
 * - Stops (pauses) when the selected/now-playing track changes away.
 * - Disabled when disabled (e.g. multiple tracks selected).
 *
 * Note: the caller should render this with `key={songId}` so the elapsed reset
 * on song change happens via remount (state initializer) rather than an effect.
 */
export function PreviewButton({ songId, disabled }: PreviewButtonProps) {
  const { isPlaying, nowPlaying, getCurrentTime } = usePlayback();
  // Whether THIS song is the one currently loaded in the player (previewing).
  // Note: based on nowPlaying identity alone, NOT isPlaying — so clicking the
  // button while this track is paused toggles pause/resume instead of restarting.
  const previewing = !!songId && nowPlaying?.id === songId;
  // Elapsed preview time drives the ring. Set only inside the interval
  // callback (never directly in an effect body), so no set-state-in-effect.
  const [elapsed, setElapsed] = useState(0);

  // The ring reflects whether we're actively *playing* this preview.
  const active = previewing && isPlaying;
  // activeRef lets the persistent rAF loop read the current play state without
  // being re-created each pause/resume (refs are read inside the effect loop,
  // not during render, so this is lint-clean).
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Stop the preview if the player moved to a different song while playing.
  // (No setState here — elapsed resets via the key-driven remount on songId
  // change; this effect only handles the external stop.)
  useEffect(() => {
    if (!songId || !nowPlaying) return;
    if (nowPlaying.id !== songId && isPlaying) {
      wmmBus.invoke("wmm.playback.stop", undefined);
    }
  }, [songId, nowPlaying?.id, nowPlaying, isPlaying]);

  // Drive the ring smoothly with a SINGLE requestAnimationFrame loop that
  // lives for the button's whole lifetime (deps exclude `active`; it reads
  // activeRef). Pausing does not tear down the loop — it just stops updating
  // the ring — so a quick pause/resume has no loop-rebuild window and no
  // stale first frame.
  useEffect(() => {
    if (!songId) return;

    let rafId = 0;

    const tick = () => {
      if (activeRef.current) {
        const t = getCurrentTime();
        if (t >= PREVIEW_DURATION_SECONDS) {
          setElapsed(0);
          wmmBus.invoke("wmm.playback.playpause", undefined);
          return; // stop the loop (don't schedule next frame)
        }
        setElapsed(Math.min(t, PREVIEW_DURATION_SECONDS));
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [songId, getCurrentTime]);

  function handleClick() {
    if (!songId) return;
    // Starting a fresh preview: reset the ring to zero immediately so there's
    // no stale elapsed from a previous song before the first position read.
    if (!previewing) {
      setElapsed(0);
    }
    // Toggle: if this song is already the loaded (previewing) track, pause or
    // resume it; otherwise start previewing it.
    wmmBus.invoke(
      previewing ? "wmm.playback.playpause" : "wmm.playback.playSong",
      previewing ? undefined : ({ songId } as const)
    );
  }

  const pct = Math.min(elapsed / PREVIEW_DURATION_SECONDS, 1) * 100;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !songId}
      aria-label={active ? "Pause preview" : "Play preview"}
      className="relative rounded-full aspect-square p-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {/* Ring layer behind the button, at the button's exact size, so it
          renders as the button's own border that fills with progress. The
          mask carves the center, leaving a circular border; the button covers
          the hole and sits on top. */}
      <span
        aria-hidden="true"
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
        className="absolute inset-0 h-full rounded-full aspect-square bg-[conic-gradient(#fff_0%_var(--pct),rgba(255,255,255,.35)_var(--pct)_100%)] [-webkit-mask:radial-gradient(farthest-side,transparent_60%,#000_61%)] [mask:radial-gradient(farthest-side,transparent_60%,#000_61%)]"
      />
      {/* Accent-colored circular button with a play/pause icon, no text. */}
      <span className="relative z-10 flex h-6 w-6 p-1.5 items-center justify-center rounded-full bg-accent text-white">
        {active ? (
          <Pause fill="currentColor" />
        ) : (
          <Play fill="currentColor" className="ml-0.5" />
        )}
      </span>
    </button>
  );
}
