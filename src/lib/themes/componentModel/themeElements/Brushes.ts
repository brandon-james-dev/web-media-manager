import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The brush table. Every `@brush/` reference resolves to one of the three
 * brush elements.
 *
 * @example
 * ```xml
 * <Brushes>
 *   <SolidBrush id="panel" color="@slot/card" />
 * </Brushes>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Brushes;
 * def.children.allowed; // ["SolidBrush", "LinearGradient", "ImageBrush"]
 * ```
 */
export const BRUSHES_ELEMENT: ElementDef = {
  name: "Brushes",
  category: ElementCategory.Structure,
  attributes: {},
  children: {
    min: 0,
    max: 1000,
    allowed: ["SolidBrush", "LinearGradient", "ImageBrush"],
  },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
