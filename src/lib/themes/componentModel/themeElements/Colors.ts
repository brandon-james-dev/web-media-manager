import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The fixed color table. Every `@color/` reference resolves to an entry
 * here.
 *
 * @example
 * ```xml
 * <Colors>
 *   <Color id="navy-900" value="#0b1a3a" />
 * </Colors>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Colors;
 * def.children.allowed; // ["Color"]
 * ```
 */
export const COLORS_ELEMENT: ElementDef = {
  name: "Colors",
  category: ElementCategory.Structure,
  attributes: {},
  children: { min: 0, max: 1000, allowed: ["Color"] },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
