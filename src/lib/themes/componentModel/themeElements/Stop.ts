import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One gradient stop. Offsets must not decrease down the list (`E6016`).
 *
 * @example
 * ```xml
 * <Stop offset="0" color="#5f8fe0" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Stop;
 * def.attributes.offset.max; // 1
 * ```
 */
export const STOP_ELEMENT: ElementDef = {
  name: "Stop",
  category: ElementCategory.Structure,
  attributes: {
    offset: { type: ValueType.Number, min: 0, max: 1, required: true },
    color: { type: ValueType.Color, required: true },
  },
  children: NO_CHILDREN,
  parents: ["LinearGradient"],
  since: THEME_SPEC_VERSION,
};
