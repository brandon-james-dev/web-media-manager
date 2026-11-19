import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * A brush that fills with one color.
 *
 * @example
 * ```xml
 * <SolidBrush id="panel" color="@slot/card" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.SolidBrush;
 * def.attributes.color.required; // true
 * ```
 */
export const SOLID_BRUSH_ELEMENT: ElementDef = {
  name: "SolidBrush",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    color: { type: ValueType.Color, required: true },
  },
  children: NO_CHILDREN,
  parents: ["Brushes"],
  since: THEME_SPEC_VERSION,
};
