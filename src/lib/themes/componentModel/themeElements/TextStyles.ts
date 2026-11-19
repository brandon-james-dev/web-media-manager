import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The named text style table. Every `@text/` reference resolves to an entry
 * here.
 *
 * @example
 * ```xml
 * <TextStyles>
 *   <TextStyle id="caption" basedOn="@text/body" size="11" />
 * </TextStyles>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.TextStyles;
 * def.children.allowed; // ["TextStyle"]
 * ```
 */
export const TEXT_STYLES_ELEMENT: ElementDef = {
  name: "TextStyles",
  category: ElementCategory.Structure,
  attributes: {},
  children: { min: 0, max: 1000, allowed: ["TextStyle"] },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
