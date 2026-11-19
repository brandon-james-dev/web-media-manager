import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The button style table. Every `@button/` reference resolves to an entry
 * here.
 *
 * @example
 * ```xml
 * <ButtonStyles>
 *   <ButtonStyle id="transport" background="@brush/chrome-gloss" />
 * </ButtonStyles>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.ButtonStyles;
 * def.children.allowed; // ["ButtonStyle"]
 * ```
 */
export const BUTTON_STYLES_ELEMENT: ElementDef = {
  name: "ButtonStyles",
  category: ElementCategory.Structure,
  attributes: {},
  children: { min: 0, max: 1000, allowed: ["ButtonStyle"] },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
