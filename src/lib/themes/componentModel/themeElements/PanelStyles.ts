import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The panel style table. Every `@panel/` reference resolves to an entry
 * here.
 *
 * @example
 * ```xml
 * <PanelStyles>
 *   <PanelStyle id="inset" background="@slot/card" />
 * </PanelStyles>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.PanelStyles;
 * def.children.allowed; // ["PanelStyle"]
 * ```
 */
export const PANEL_STYLES_ELEMENT: ElementDef = {
  name: "PanelStyles",
  category: ElementCategory.Structure,
  attributes: {},
  children: { min: 0, max: 1000, allowed: ["PanelStyle"] },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
