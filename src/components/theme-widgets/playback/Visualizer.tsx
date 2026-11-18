import { createPortal } from "react-dom";
import { Disc3, SlidersHorizontal } from "lucide-react";
import { cn } from "cn";
import { AlbumArtImage } from "@/components/album-art-image";
import { Button } from "@/components/ui/button";
import {
  VisualizationHost,
  VisualizerSelector,
  VisualizerSettings,
} from "@/components/visualizer";
import { usePlayback, useVisualizer } from "@/hooks";
import { useTranslation } from "@/i18n";
import { ThumbnailSize } from "@/lib";
import { attrBool, attrString } from "@/lib/themes/render";
import {
  useTabStripButtonClass,
  useTabStripStart,
} from "@/lib/themes/render/browser";
import type { ElementProps } from "@/lib/themes/render/browser";
import { useThemeTextClass } from "../shared/themeText";
import { WidgetFrame } from "../shared/WidgetFrame";

/**
 * The active visualizer plugin, filling the widget. Without a plugin,
 * `fallback="artwork"` shows the current cover instead. `trackInfo` overlays
 * the title and artist at the bottom start of the frame. `selector` and
 * `settingsButton` add the plugin picker and its settings, placed at the start
 * of the tab strip when the visualizer sits in a Tabs panel, otherwise at the
 * top start of the frame.
 *
 * @example
 * ```xml
 * <Visualizer selector="true" settingsButton="true" trackInfo="true" fallback="artwork" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={visualizer} />
 * ```
 */
export function ThemeVisualizer({ node, style }: ElementProps) {
  const { nowPlaying } = usePlayback();
  const { activePluginId, setSettingsOpen } = useVisualizer();
  const { t } = useTranslation();
  const stripStart = useTabStripStart();
  const stripButtonClass = useTabStripButtonClass();
  const titleClass = useThemeTextClass(node, "titleText");
  const detailClass = useThemeTextClass(node, "detailText");

  const showTrackInfo = attrBool(node, "trackInfo") ?? false;
  const showSelector = attrBool(node, "selector") ?? false;
  const showSettings = attrBool(node, "settingsButton") ?? false;
  const showArtwork =
    activePluginId === null && attrString(node, "fallback") === "artwork";

  const controls =
    showSelector || showSettings ? (
      <div className="flex items-center gap-1 cursor-default select-none">
        {showSelector ? (
          <VisualizerSelector
            variant="compact"
            className="w-44"
            triggerClassName={cn(
              stripButtonClass,
              stripButtonClass === undefined
                ? undefined
                : "border-current/30 [&_svg]:text-current [&_svg]:opacity-80"
            )}
          />
        ) : null}
        {showSettings ? (
          <Button
            size="icon"
            variant="ghost"
            className={stripButtonClass}
            title={t("visualizer.settings")}
            aria-label={t("visualizer.settings")}
            disabled={activePluginId === null}
            onClick={() => setSettingsOpen(true)}
          >
            <SlidersHorizontal />
          </Button>
        ) : null}
      </div>
    ) : null;

  return (
    <WidgetFrame node={node} style={style}>
      <div className="relative min-h-0 min-w-0 flex-1">
        {activePluginId === null ? (
          showArtwork ? (
            <AlbumArtImage
              songId={nowPlaying?.id}
              thumbSize={ThumbnailSize.thumb512}
              className="size-full object-contain"
              fallback={
                <span className="flex size-full items-center justify-center bg-muted">
                  <Disc3 className="text-muted-foreground" />
                </span>
              }
            />
          ) : null
        ) : (
          <VisualizationHost
            className="size-full"
            showFullscreenControl={false}
          />
        )}
        {controls === null ? null : stripStart === null ? (
          <div className="absolute top-2 left-2 z-10">{controls}</div>
        ) : (
          createPortal(controls, stripStart)
        )}
        {showTrackInfo && nowPlaying !== undefined ? (
          <div className="pointer-events-none absolute bottom-2 left-2 flex min-w-0 max-w-[80%] flex-col">
            <span className={cn(titleClass, "truncate")}>
              {nowPlaying.title}
            </span>
            <span className={cn(detailClass, "truncate")}>
              {nowPlaying.artist}
            </span>
          </div>
        ) : null}
      </div>
      {showSettings ? <VisualizerSettings /> : null}
    </WidgetFrame>
  );
}
