import { NowPlayingBackdrop } from "@/components/player-controls/NowPlayingBackdrop";
import { useArtworkPalette } from "@/components/player-controls/useArtworkPalette";
import { usePlayback } from "@/hooks";
import { attrString } from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import { WidgetFrame } from "../../shared/WidgetFrame";

/**
 * The animated background behind a page: a seeded gradient with dots,
 * circles and notes. `source="artwork"` takes its colors from the current
 * cover, `palette` from the theme's accent slot.
 *
 * @example
 * ```xml
 * <Backdrop row="0" rowSpan="2" source="artwork" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={backdrop} />
 * ```
 */
export function ThemeBackdrop({ node, style }: ElementProps) {
  const { nowPlaying } = usePlayback();
  const source = attrString(node, "source") ?? "palette";
  const palette = useArtworkPalette(nowPlaying?.id, source === "artwork");

  return (
    <WidgetFrame node={node} style={style}>
      <div className="relative min-h-0 min-w-0 flex-1">
        <NowPlayingBackdrop palette={palette} seed={nowPlaying?.id ?? "wmm"} />
      </div>
    </WidgetFrame>
  );
}
