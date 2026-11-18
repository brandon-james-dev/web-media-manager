import { cn } from "cn";
import { wmmBus } from "@/events";
import { useOfflineSongs, usePlayback } from "@/hooks";
import { useTranslation } from "@/i18n";
import { attrBool, attrRef, attrString } from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import { useThemeRender } from "@/lib/themes/render/browser";
import type { IRValue } from "@/lib/themes/ir";
import { ThemeSlider } from "../shared/ThemeSlider";
import { usePlaybackClock } from "../shared/usePlaybackClock";
import { WidgetFrame } from "../shared/WidgetFrame";

/**
 * The seek slider of the current track. It polls the playback cursor, paints
 * itself from the theme's `@slider/...` style, and sends
 * `wmm.playback.seek` on every change. The `edge` variant is a thin rule with
 * a taller touch area and no thumb.
 *
 * @example
 * ```xml
 * <SeekBar grow="1" slider="@slider/seek" />
 * <SeekBar variant="edge" buffering="false" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={seekBar} />
 * ```
 */
export function ThemeSeekBar({ node, style }: ElementProps) {
  const { stylesheet, ir } = useThemeRender();
  const { nowPlaying, isBuffering, getDuration } = usePlayback();
  const { offlineSongIds } = useOfflineSongs();
  const { t } = useTranslation();
  const elapsed = usePlaybackClock(250);

  const edge = attrString(node, "variant") === "edge";
  const sliderId = attrRef(node, "slider", "slider");
  const sliderClass =
    sliderId === undefined ? undefined : stylesheet.classes.slider[sliderId];
  const thumb = thumbKind(
    sliderId === undefined ? undefined : ir.sliderStyles[sliderId]?.base.thumb
  );

  const duration = getDuration() || nowPlaying?.duration || 0;
  const value = duration > 0 ? Math.min(1, elapsed / duration) : 0;
  const showBuffering =
    (attrBool(node, "buffering") ?? true) &&
    isBuffering &&
    nowPlaying !== undefined &&
    !offlineSongIds.has(nowPlaying.id);

  function handleChange(next: number): void {
    if (duration <= 0) return;
    wmmBus.invoke("wmm.playback.seek", { positionSeconds: next * duration });
  }

  return (
    <WidgetFrame node={node} style={style}>
      <div
        className={cn(
          "relative flex min-h-0 min-w-0 flex-1 items-center",
          edge && "-my-1.5 py-1.5"
        )}
      >
        <ThemeSlider
          value={value}
          onChange={handleChange}
          label={t("playback.seek")}
          thickness={edge ? 2 : 4}
          showThumb={!edge && thumb !== "none"}
          disabled={duration <= 0}
          className={cn("relative z-10", sliderClass)}
        />
        {showBuffering ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-1 -translate-y-1/2 overflow-hidden rounded-full"
            role="progressbar"
            aria-label={t("playback.buffering")}
          >
            <div className="buffering-sweep h-full w-1/3 bg-accent/60" />
          </div>
        ) : null}
      </div>
    </WidgetFrame>
  );
}

/** The thumb kind a slider style declares, defaulting to a round thumb. */
function thumbKind(value: IRValue | undefined): string {
  return typeof value === "string" ? value : "round";
}
