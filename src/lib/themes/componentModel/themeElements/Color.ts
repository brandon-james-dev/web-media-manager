import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One named color. `value` may reference another color, and a chain that
 * loops back to itself is an error (`E4011`).
 *
 * @example
 * ```xml
 * <Color id="navy-900" value="#0b1a3a" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Color;
 * def.attributes.value.required; // true
 * ```
 */
export const COLOR_ELEMENT: ElementDef = {
  name: "Color",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    value: { type: ValueType.Color, required: true },
  },
  children: NO_CHILDREN,
  parents: ["Colors"],
  since: THEME_SPEC_VERSION,
};
