import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * The current song's lyrics, or `playback.noLyrics`. Minimum 160×80, one
 * per page.
 *
 * @example
 * ```xml
 * <Tab id="lyrics" titleKey="playback.lyrics" icon="@icon/lyrics">
 *   <Lyrics align="center" text="@text/body" />
 * </Tab>
 * ```
 * @example
 * ```ts
 * const align = node.attributes.align ?? "start";
 * const centered = align === "center";
 * ```
 *
 * @see [ThemeLyrics](../../../../components/theme-widgets/playback/Lyrics.tsx)
 */
export const LYRICS_ELEMENT: ElementDef = {
  name: "Lyrics",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    align: { type: ValueType.Enum, values: ["start", "center"] },
    text: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  minSize: { width: 160, height: 80 },
  perPage: 1,
  since: THEME_SPEC_VERSION,
};
