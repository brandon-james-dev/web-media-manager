import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { SHADOW_ATTRIBUTES } from "./styleAttributes";

/**
 * One named shadow with up to 3 stacked layers. The shadow's own offsets
 * draw the first layer.
 *
 * @example
 * ```xml
 * <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Shadow;
 * def.children.max; // 3
 * ```
 */
export const SHADOW_ELEMENT: ElementDef = {
  name: "Shadow",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    ...SHADOW_ATTRIBUTES,
  },
  children: { min: 0, max: 3, allowed: ["Layer"] },
  parents: ["Shadows"],
  since: THEME_SPEC_VERSION,
};
