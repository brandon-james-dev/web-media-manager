import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The slider style table. Every `@slider/` reference resolves to an entry
 * here.
 *
 * @example
 * ```xml
 * <SliderStyles>
 *   <SliderStyle id="seek" thickness="4" thumb="round" />
 * </SliderStyles>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.SliderStyles;
 * def.children.allowed; // ["SliderStyle"]
 * ```
 */
export const SLIDER_STYLES_ELEMENT: ElementDef = {
  name: "SliderStyles",
  category: ElementCategory.Structure,
  attributes: {},
  children: { min: 0, max: 1000, allowed: ["SliderStyle"] },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
