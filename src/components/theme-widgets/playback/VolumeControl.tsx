import { cn } from "cn";
import { wmmBus } from "@/events";
import { usePlayback } from "@/hooks";
import { useTranslation } from "@/i18n";
import {
  attrBool,
  attrRef,
  attrString,
  resolveThemeIcon,
} from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import { useThemeRender } from "@/lib/themes/render/browser";
import { ThemeSlider } from "../shared/ThemeSlider";
import { WidgetFrame } from "../shared/WidgetFrame";

/**
 * The app-wide volume slider with an optional mute button. The slider runs
 * along either axis and paints itself from the theme's `@slider/...` style;
 * the button takes its class from `@button/...`.
 *
 * @example
 * ```xml
 * <VolumeControl width="140" muteButton="true" slider="@slider/volume" />
 * <VolumeControl orientation="vertical" height="120" button="@button/icon" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={volumeControl} />
 * ```
 */
export function ThemeVolumeControl({ node, style }: ElementProps) {
  const { stylesheet } = useThemeRender();
  const { volume, muted } = usePlayback();
  const { t } = useTranslation();

  const vertical = attrString(node, "orientation") === "vertical";
  const showMute = attrBool(node, "muteButton") ?? false;

  const sliderId = attrRef(node, "slider", "slider");
  const sliderClass =
    sliderId === undefined ? undefined : stylesheet.classes.slider[sliderId];

  const buttonId = attrRef(node, "button", "button");
  const buttonClass =
    buttonId === undefined
      ? stylesheet.defaults.button
      : (stylesheet.classes.button[buttonId] ?? stylesheet.defaults.button);

  const MuteIcon = resolveThemeIcon("mute", { active: muted });
  const label = muted ? t("playback.unmute") : t("playback.mute");

  function handleChange(next: number): void {
    wmmBus.invoke("wmm.playback.setVolume", { volume: next });
  }

  return (
    <WidgetFrame node={node} style={style}>
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 items-center gap-2",
          vertical && "flex-col"
        )}
      >
        {showMute ? (
          <button
            type="button"
            className={cn(buttonClass, "shrink-0")}
            aria-label={label}
            aria-pressed={muted}
            data-active={muted ? "" : undefined}
            onClick={() => wmmBus.invoke("wmm.playback.toggleMute")}
          >
            <MuteIcon
              aria-hidden
              style={{
                width: "var(--wmm-icon-size, 1em)",
                height: "var(--wmm-icon-size, 1em)",
              }}
            />
          </button>
        ) : null}
        <ThemeSlider
          value={muted ? 0 : volume}
          onChange={handleChange}
          label={t("playback.volume")}
          orientation={vertical ? "vertical" : "horizontal"}
          showThumb
          className={cn("min-h-0 min-w-0 flex-1", sliderClass)}
        />
      </div>
    </WidgetFrame>
  );
}
