import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * Composite shortcut that renders a built-in player arrangement. The
 * Booleans `artwork`, `transport`, `seek`, `volume` and `queue` pick its
 * parts and are ignored by `indicator`. `variant="indicator"` is the TV
 * navigation chip: it opens the Now Playing page and renders nothing while
 * no track is loaded. Minimum bar 320×56, compact 240×56, indicator
 * 160×40, full 320×320; one per page.
 *
 * @example
 * ```xml
 * <NowPlaying row="1" variant="bar" artwork="false" idleHide="true" />
 * <NowPlaying
 *   variant="compact"
 *   transport="true"
 *   seek="true"
 *   transportButton="@button/play"
 *   slider="@slider/seek"
 * />
 * ```
 * @example
 * ```ts
 * const hasTransport = pageWidgets.some(
 *   (n) => n.name === "NowPlaying" && n.attributes.transport === "true"
 * );
 * if (!hasTransport && !hasPlayPauseButton) {
 *   issues.push({ code: "W6109", element: "Page" });
 * }
 * ```
 *
 * @see [ThemeNowPlaying](../../../../components/theme-widgets/playback/NowPlaying.tsx)
 */
export const NOW_PLAYING_ELEMENT: ElementDef = {
  name: "NowPlaying",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    variant: {
      type: ValueType.Enum,
      values: ["bar", "compact", "indicator", "full"],
    },
    artwork: { type: ValueType.Boolean },
    transport: { type: ValueType.Boolean },
    seek: { type: ValueType.Boolean },
    volume: { type: ValueType.Boolean },
    queue: { type: ValueType.Boolean },
    titleText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    detailText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    transportButton: {
      type: ValueType.Reference,
      refKinds: [ReferenceKind.Button],
    },
    slider: { type: ValueType.Reference, refKinds: [ReferenceKind.Slider] },
  },
  children: NO_CHILDREN,
  minSize: {
    bar: { width: 320, height: 56 },
    compact: { width: 240, height: 56 },
    indicator: { width: 160, height: 40 },
    full: { width: 320, height: 320 },
  },
  minSizeBy: "variant",
  perPage: 1,
  since: THEME_SPEC_VERSION,
};
