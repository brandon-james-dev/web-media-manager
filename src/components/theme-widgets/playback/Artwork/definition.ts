import { ValueType, defineWidget } from "@/core/themes/widgetKit";

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
 * @see [ThemeArtwork](./Artwork.tsx)
 */
export const ARTWORK_ELEMENT = defineWidget({
  name: "Artwork",
  attributes: {
    fit: { type: ValueType.Enum, values: ["cover", "contain"] },
    action: { type: ValueType.Enum, values: ["none", "openNowPlaying"] },
    cornerRadius: { type: ValueType.CornerRadius },
  },
  minSize: { width: 24, height: 24 },
  perPage: null,
});
