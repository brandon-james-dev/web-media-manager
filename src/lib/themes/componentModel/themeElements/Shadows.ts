import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The shadow table. Every `@shadow/` reference resolves to an entry here.
 *
 * @example
 * ```xml
 * <Shadows>
 *   <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
 * </Shadows>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Shadows;
 * def.children.allowed; // ["Shadow"]
 * ```
 */
export const SHADOWS_ELEMENT: ElementDef = {
  name: "Shadows",
  category: ElementCategory.Structure,
  attributes: {},
  children: { min: 0, max: 1000, allowed: ["Shadow"] },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
