import { Disc3 } from "lucide-react";
import { cn } from "cn";
import { AlbumArtImage } from "@/components/album-art-image";
import { wmmBus } from "@/events";
import { usePlayback } from "@/hooks";
import { useTranslation } from "@/i18n";
import { ThumbnailSize } from "@/lib";
import { attrString, readAttr } from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import type { IRValue } from "@/lib/themes/ir";
import { WidgetFrame } from "../../shared/WidgetFrame";

/**
 * The current track's cover, filling the box the layout gives it. Without
 * artwork it draws a neutral disc tile. `action="openNowPlaying"` makes the
 * whole tile a button that opens the Now Playing page.
 *
 * @example
 * ```xml
 * <Artwork width="56" height="56" action="openNowPlaying" />
 * <Artwork width="360" height="360" fit="contain" cornerRadius="12" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={artwork} />
 * ```
 */
export function ThemeArtwork({ node, style }: ElementProps) {
  const { nowPlaying } = usePlayback();
  const { t } = useTranslation();

  const fit = attrString(node, "fit") ?? "cover";
  const radius = cornerRadius(readAttr(node, "cornerRadius"));
  const tile = (
    <span
      className="relative block size-full overflow-hidden"
      style={{ borderRadius: radius }}
    >
      <AlbumArtImage
        songId={nowPlaying?.id}
        thumbSize={ThumbnailSize.thumb256}
        className={cn(
          "size-full",
          fit === "contain" ? "object-contain" : "object-cover"
        )}
        fallback={
          <span className="flex size-full items-center justify-center bg-muted">
            <Disc3 className="text-muted-foreground" />
          </span>
        }
      />
    </span>
  );

  return (
    <WidgetFrame node={node} style={style}>
      {attrString(node, "action") === "openNowPlaying" ? (
        <button
          type="button"
          className="block min-h-0 min-w-0 flex-1"
          aria-label={t("playback.openNowPlaying")}
          onClick={() => wmmBus.invoke("wmm.ui.openNowPlaying")}
        >
          {tile}
        </button>
      ) : (
        tile
      )}
    </WidgetFrame>
  );
}

/** The four corner radii of a compiled `cornerRadius` attribute, in CSS order. */
function cornerRadius(value: IRValue | undefined): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const sides = value.filter(
    (side): side is number => typeof side === "number"
  );
  if (sides.length === 0) return undefined;
  return sides.map((side) => `${side}px`).join(" ");
}
