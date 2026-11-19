import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * A higher-density copy of the base image. Its dimensions must be exactly
 * `scale` times the base image's (`E5021`).
 *
 * @example
 * ```xml
 * <Variant scale="2" src="assets/images/frame@2x.png" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Variant;
 * def.attributes.scale.values; // ["2", "3"]
 * ```
 */
export const VARIANT_ELEMENT: ElementDef = {
  name: "Variant",
  category: ElementCategory.Structure,
  attributes: {
    scale: {
      type: ValueType.Enum,
      values: ["2", "3"],
      required: true,
    },
    src: { type: ValueType.String, required: true },
  },
  children: NO_CHILDREN,
  parents: ["Image"],
  since: THEME_SPEC_VERSION,
};
