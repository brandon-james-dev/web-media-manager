import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "../ui/button";
import { formatTimecode } from "@/lib/lyrics";

export type WaveformMarker = {
  /** Where the marker sits on the timeline. */
  timeMs: number;
  /** Draw the marker in the accent colour, for the selected placement. */
  selected?: boolean;
};

export type WaveformScrubberProps = {
  /** Peak envelope, or null when the audio could not be decoded. */
  peaks: Float32Array | null;
  durationMs: number;
  cursorMs: number;
  playing: boolean;
  disabled?: boolean;
  /** Placement markers drawn as selectable vertical lines. */
  markers?: WaveformMarker[];
  onScrub: (timeMs: number) => void;
  onTogglePlay: () => void;
  /** Called with the marker index when one of the lines is clicked. */
  onMarkerSelect?: (index: number) => void;
  /** Controls shown right-aligned on the play/time row. */
  trailing?: React.ReactNode;
};

/**
 * Waveform with a video-style scrubber: a vertical playhead line with a
 * triangle on top, dragged or clicked to move the cursor. The played portion
 * is drawn in the accent colour so the current position reads at a glance.
 */
export function WaveformScrubber(props: WaveformScrubberProps) {
  const {
    peaks,
    durationMs,
    cursorMs,
    playing,
    disabled,
    markers,
    onScrub,
    onTogglePlay,
    onMarkerSelect,
    trailing,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const ratio = durationMs > 0 ? Math.min(1, Math.max(0, cursorMs / durationMs)) : 0;

  //#region Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const styles = getComputedStyle(canvas);
      const accent = styles.getPropertyValue("--accent").trim() || "#888";
      const muted =
        styles.getPropertyValue("--muted-foreground").trim() || "#666";

      const middle = height / 2;
      const playedX = ratio * width;

      if (!peaks || peaks.length === 0) {
        // Undecodable audio still gets a scrub track, just without a shape.
        ctx.fillStyle = muted;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, middle - 1, width, 2);
        ctx.globalAlpha = 1;
        return;
      }

      const barWidth = width / peaks.length;

      for (let index = 0; index < peaks.length; index++) {
        const x = index * barWidth;
        const amplitude = Math.max(0.02, peaks[index]) * (middle - 2);

        ctx.fillStyle = x <= playedX ? accent : muted;
        ctx.globalAlpha = x <= playedX ? 1 : 0.4;
        ctx.fillRect(x, middle - amplitude, Math.max(1, barWidth - 0.5), amplitude * 2);
      }

      ctx.globalAlpha = 1;
    };

    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [peaks, ratio]);
  //#endregion

  //#region Interactivity handlers
  const seekFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || durationMs <= 0) return;

      const rect = track.getBoundingClientRect();
      const next = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / rect.width)
      );

      onScrub(next * durationMs);
    },
    [durationMs, onScrub]
  );

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    seekFromPointer(event.clientX);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    seekFromPointer(event.clientX);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }
  //#endregion

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Lyrics timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(durationMs)}
        aria-valuenow={Math.round(cursorMs)}
        aria-valuetext={formatTimecode(cursorMs)}
        className={`relative h-20 w-full touch-none select-none rounded-md border bg-muted/20 ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />

        {/* Placement markers: one selectable line per timed lyric. */}
        {durationMs > 0 &&
          markers?.map((marker, index) => {
            const left = Math.min(
              100,
              Math.max(0, (marker.timeMs / durationMs) * 100)
            );

            return (
              <button
                key={`${marker.timeMs}-${index}`}
                type="button"
                aria-label={formatTimecode(marker.timeMs)}
                aria-pressed={marker.selected ?? false}
                className={`absolute inset-y-0 z-10 w-1.5 -translate-x-1/2 cursor-pointer ${
                  marker.selected ? "bg-foreground/50" : "bg-foreground/20"
                }`}
                style={{ left: `${left}%` }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkerSelect?.(index);
                }}
              />
            );
          })}

        {/* Playhead: a full-height line with a triangle on top. */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-accent"
          style={{ left: `${ratio * 100}%` }}
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2"
          style={{ left: `${ratio * 100}%` }}
          aria-hidden="true"
        >
          <svg width="14" height="10" viewBox="0 0 14 10" className="text-accent">
            <polygon points="0,0 14,0 7,10" fill="currentColor" />
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={onTogglePlay}
        >
          {playing ? <Pause /> : <Play />}
        </Button>

        <span className="font-mono text-sm tabular-nums">
          {formatTimecode(cursorMs)}
        </span>

        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          / {formatTimecode(durationMs)}
        </span>

        {trailing && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
}
