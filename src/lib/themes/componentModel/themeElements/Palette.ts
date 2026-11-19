import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One scheme's color slots. Two palettes with the same `scheme` are an
 * error (`E6014`), as is a palette missing a required slot.
 *
 * @example
 * ```xml
 * <Palette scheme="dark">
 *   <Set slot="background" value="@color/navy-900" />
 *   <Set slot="accent" value="#3d8bff" />
 * </Palette>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Palette;
 * def.attributes.scheme.values; // ["light", "dark"]
 * ```
 */
export const PALETTE_ELEMENT: ElementDef = {
  name: "Palette",
  category: ElementCategory.Structure,
  attributes: {
    scheme: {
      type: ValueType.Enum,
      values: ["light", "dark"],
      required: true,
    },
  },
  children: { min: 1, max: null, allowed: ["Set"] },
  parents: ["Palettes"],
  since: THEME_SPEC_VERSION,
};
