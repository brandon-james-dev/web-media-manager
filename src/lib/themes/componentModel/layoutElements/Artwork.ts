import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * The current track's cover, or a disc icon when there is none.
 * `action="openNowPlaying"` makes it open the Now Playing page when
 * pressed. Minimum 24×24, unlimited per page.
 *
 * @example
 * ```xml
 * <Artwork width="56" height="56" action="openNowPlaying" />
 * <Artwork width="360" height="360" fit="contain" cornerRadius="12" />
 * ```
 * @example
 * ```ts
 * const { values } = LAYOUT_ELEMENTS.Artwork.attributes.fit;
 * const fit = node.attributes.fit;
 * if (fit !== undefined && !values?.includes(fit)) {
 *   reportSpecMismatch(node);
 * }
 * ```
 *
 * @see [ThemeArtwork](../../../../components/theme-widgets/playback/Artwork.tsx)
 */
export const ARTWORK_ELEMENT: ElementDef = {
  name: "Artwork",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    fit: { type: ValueType.Enum, values: ["cover", "contain"] },
    action: { type: ValueType.Enum, values: ["none", "openNowPlaying"] },
    cornerRadius: { type: ValueType.CornerRadius },
  },
  children: NO_CHILDREN,
  minSize: { width: 24, height: 24 },
  perPage: null,
  since: THEME_SPEC_VERSION,
};
