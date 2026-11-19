import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The image asset table. Every `@image/` reference resolves to an entry
 * here.
 *
 * @example
 * ```xml
 * <Images>
 *   <Image id="chrome-frame" src="assets/images/frame.png" />
 * </Images>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Images;
 * def.children.allowed; // ["Image"]
 * ```
 */
export const IMAGES_ELEMENT: ElementDef = {
  name: "Images",
  category: ElementCategory.Structure,
  attributes: {},
  children: { min: 0, max: 1000, allowed: ["Image"] },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
