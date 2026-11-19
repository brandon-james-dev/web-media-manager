import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One font file in a family. `weight` and `style` pick the face the host
 * uses for a matching text style.
 *
 * @example
 * ```xml
 * <Face src="assets/fonts/ui-regular.woff2" weight="400" style="normal" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Face;
 * def.attributes.weight.default; // "400"
 * ```
 */
export const FACE_ELEMENT: ElementDef = {
  name: "Face",
  category: ElementCategory.Structure,
  attributes: {
    src: { type: ValueType.String, required: true },
    weight: {
      type: ValueType.Integer,
      min: 100,
      max: 900,
      default: "400",
    },
    style: {
      type: ValueType.Enum,
      values: ["normal", "italic"],
      default: "normal",
    },
  },
  children: NO_CHILDREN,
  parents: ["FontFamily"],
  since: THEME_SPEC_VERSION,
};
