import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One named length in CSS pixels.
 *
 * @example
 * ```xml
 * <Length id="gap-sm" value="4" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Length;
 * def.attributes.value.type; // ValueType.Length
 * ```
 */
export const LENGTH_ELEMENT: ElementDef = {
  name: "Length",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    value: { type: ValueType.Length, required: true },
  },
  children: NO_CHILDREN,
  parents: ["Metrics"],
  since: THEME_SPEC_VERSION,
};
