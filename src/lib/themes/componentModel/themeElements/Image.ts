import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One image asset. `slice` is the nine-slice inset in 1× image pixels, and
 * is required when a brush draws the image with `fit="nineSlice"`.
 *
 * @example
 * ```xml
 * <Image id="chrome-frame" src="assets/images/frame.png" slice="12 12 12 12">
 *   <Variant scale="2" src="assets/images/frame@2x.png" />
 * </Image>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Image;
 * def.children.max; // 2
 * ```
 */
export const IMAGE_ELEMENT: ElementDef = {
  name: "Image",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    src: { type: ValueType.String, required: true },
    slice: { type: ValueType.Thickness },
  },
  children: { min: 0, max: 2, allowed: ["Variant"] },
  parents: ["Images"],
  since: THEME_SPEC_VERSION,
};
