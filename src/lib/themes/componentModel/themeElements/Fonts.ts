import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The font family table. Every `@font/` reference resolves to an entry
 * here.
 *
 * @example
 * ```xml
 * <Fonts>
 *   <FontFamily id="ui" fallback="sansSerif" />
 * </Fonts>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Fonts;
 * def.children.allowed; // ["FontFamily"]
 * ```
 */
export const FONTS_ELEMENT: ElementDef = {
  name: "Fonts",
  category: ElementCategory.Structure,
  attributes: {},
  children: { min: 0, max: 1000, allowed: ["FontFamily"] },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
