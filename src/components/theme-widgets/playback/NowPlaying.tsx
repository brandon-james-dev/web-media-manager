import type { CSSProperties } from "react";
import { cn } from "cn";
import { TvNowPlayingIndicator } from "@/components/tv";
import { attrBool, attrString } from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import type { IRNode, IRValue } from "@/lib/themes/ir";
import { WidgetFrame } from "../shared/WidgetFrame";
import { ThemeArtwork } from "./Artwork";
import { ThemeSeekBar } from "./SeekBar";
import { ThemeTrackInfo } from "./TrackInfo";

/**
 * The composite player shortcut. `indicator` is the television navigation
 * chip; `bar` and `compact` lay the cover, the track details and the seek bar
 * in one row; `full` stacks them in a column. It never mounts the app's
 * player bar, which registers global handlers.
 *
 * @example
 * ```xml
 * <NowPlaying row="1" variant="bar" artwork="false" idleHide="true" />
 * <NowPlaying variant="full" seek="true" slider="@slider/seek" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={nowPlaying} />
 * ```
 */
export function ThemeNowPlaying({ node, style }: ElementProps) {
  const variant = attrString(node, "variant") ?? "bar";
  if (variant === "indicator") return <TvNowPlayingIndicator />;

  const full = variant === "full";
  const showArtwork = attrBool(node, "artwork") ?? true;
  const showSeek = attrBool(node, "seek") ?? true;

  const artworkNode = widgetNode("Artwork", {
    fit: "cover",
    action: "openNowPlaying",
  });
  const trackInfoNode = widgetNode("TrackInfo", {
    fields: "title artist",
    titleText: node.attributes.titleText,
    detailText: node.attributes.detailText,
  });
  const seekNode = widgetNode("SeekBar", { slider: node.attributes.slider });

  return (
    <WidgetFrame node={node} style={style}>
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 gap-3",
          full ? "flex-col items-stretch" : "items-center"
        )}
      >
        {showArtwork ? (
          <ThemeArtwork node={artworkNode} style={artworkStyle(full)} />
        ) : null}
        <ThemeTrackInfo node={trackInfoNode} style={trackInfoStyle(full)} />
        {showSeek ? (
          <ThemeSeekBar node={seekNode} style={seekStyle(full)} />
        ) : null}
      </div>
    </WidgetFrame>
  );
}

/** The placement of the cover inside the composite. */
function artworkStyle(full: boolean): CSSProperties {
  return full
    ? { flex: "1 1 auto", minHeight: 0, minWidth: 0, width: "100%" }
    : { flex: "0 0 auto", width: 40, height: 40 };
}

/** The placement of the track details inside the composite. */
function trackInfoStyle(full: boolean): CSSProperties {
  return full
    ? { flex: "0 0 auto", width: "100%" }
    : { flex: "1 1 auto", minWidth: 0 };
}

/** The placement of the seek bar inside the composite. */
function seekStyle(full: boolean): CSSProperties {
  return full
    ? { flex: "0 0 auto", width: "100%" }
    : { flex: "0 0 40%", minWidth: 0 };
}

/** A node for one of the widgets the composite arranges. */
function widgetNode(
  element: string,
  attributes: Readonly<Record<string, IRValue | undefined>>
): IRNode {
  const compiled: Record<string, IRValue> = {};
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined) compiled[name] = value;
  }
  return { element, attributes: compiled, children: [] };
}
