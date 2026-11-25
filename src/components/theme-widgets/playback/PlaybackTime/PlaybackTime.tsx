import { cn } from "cn";
import { attrString } from "@/core/themes";
import { usePlayback } from "@/hooks";
import { formatTrackDuration } from "@/lib/format";
import type { ElementProps } from "@/lib/themes/render/browser";
import { usePlaybackClock } from "../../shared/usePlaybackClock";
import { useThemeTextClass } from "../../shared/themeText";
import { WidgetFrame } from "../../shared/WidgetFrame";

/**
 * A time readout for the current track, in one of four formats. It shows
 * `--:--` while the duration is unknown and keeps the digits from shifting
 * with tabular figures.
 *
 * @example
 * ```xml
 * <PlaybackTime format="elapsed" />
 * <PlaybackTime format="remaining" text="@text/caption" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={playbackTime} />
 * ```
 */
export function ThemePlaybackTime({ node, style }: ElementProps) {
  const { nowPlaying, getDuration } = usePlayback();
  const elapsed = usePlaybackClock(1000);
  const textClass = useThemeTextClass(node, "text");

  const format = attrString(node, "format") ?? "elapsed";
  const duration = getDuration() || nowPlaying?.duration || 0;

  return (
    <WidgetFrame node={node} style={style}>
      <span
        className={cn(
          "flex min-h-0 min-w-0 items-center tabular-nums",
          textClass
        )}
      >
        {formatTime(format, elapsed, duration)}
      </span>
    </WidgetFrame>
  );
}

/**
 * The readout text of one format, with `--:--` for an unknown duration.
 *
 * @example
 * ```xml
 * <PlaybackTime format="elapsedAndTotal" />
 * ```
 * @example
 * ```ts
 * const text = formatTime("elapsedAndTotal", 67, 537); // "01:07 / 08:57"
 * ```
 */
export function formatTime(
  format: string,
  elapsed: number,
  duration: number
): string {
  const known = duration > 0;
  switch (format) {
    case "total":
      return known ? formatTrackDuration(duration) : "--:--";
    case "remaining":
      return known
        ? `-${formatTrackDuration(Math.max(0, duration - elapsed))}`
        : "--:--";
    case "elapsedAndTotal":
      return `${formatTrackDuration(elapsed)} / ${known ? formatTrackDuration(duration) : "--:--"}`;
    default:
      return known ? formatTrackDuration(elapsed) : "--:--";
  }
}
