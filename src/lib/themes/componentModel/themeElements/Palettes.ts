import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The scheme-dependent palettes. A theme declares one palette per scheme
 * listed in the manifest.
 *
 * @example
 * ```xml
 * <Palettes>
 *   <Palette scheme="dark">
 *     <Set slot="background" value="@color/navy-900" />
 *     <Set slot="accent" value="#3d8bff" />
 *   </Palette>
 * </Palettes>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Palettes;
 * def.children.max; // 2
 * ```
 */
export const PALETTES_ELEMENT: ElementDef = {
  name: "Palettes",
  category: ElementCategory.Structure,
  attributes: {},
  children: { min: 1, max: 2, allowed: ["Palette"] },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
