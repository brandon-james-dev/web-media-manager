import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * A gradient brush with 2 to 8 stops along `angle`, in the CSS convention.
 *
 * @example
 * ```xml
 * <LinearGradient id="chrome-gloss" angle="180">
 *   <Stop offset="0" color="#5f8fe0" />
 *   <Stop offset="1" color="#1c3f94" />
 * </LinearGradient>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.LinearGradient;
 * def.attributes.angle.default; // "180"
 * ```
 */
export const LINEAR_GRADIENT_ELEMENT: ElementDef = {
  name: "LinearGradient",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    angle: {
      type: ValueType.Integer,
      min: 0,
      max: 359,
      default: "180",
    },
  },
  children: { min: 2, max: 8, allowed: ["Stop"] },
  parents: ["Brushes"],
  since: THEME_SPEC_VERSION,
};
