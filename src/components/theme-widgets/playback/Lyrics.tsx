import { cn } from "cn";
import { usePlayback } from "@/hooks";
import { useTranslation } from "@/i18n";
import { attrString } from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import { useThemeTextClass } from "../shared/themeText";
import { WidgetFrame } from "../shared/WidgetFrame";

/**
 * The current song's lyrics, scrolled inside the widget, or a muted note when
 * the song has none. `align="center"` centres the lines.
 *
 * @example
 * ```xml
 * <Lyrics align="center" text="@text/body" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={lyrics} />
 * ```
 */
export function ThemeLyrics({ node, style }: ElementProps) {
  const { nowPlaying } = usePlayback();
  const { t } = useTranslation();
  const textClass = useThemeTextClass(node, "text");
  const centered = attrString(node, "align") === "center";
  const lyrics = nowPlaying?.lyrics?.trim();

  return (
    <WidgetFrame node={node} style={style}>
      {lyrics ? (
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <p
            className={cn(
              "whitespace-pre-wrap pr-3 leading-relaxed",
              textClass,
              centered && "text-center"
            )}
          >
            {lyrics}
          </p>
        </div>
      ) : (
        <p
          className={cn(
            "m-auto text-sm text-muted-foreground",
            centered && "text-center"
          )}
        >
          {t("playback.noLyrics")}
        </p>
      )}
    </WidgetFrame>
  );
}
