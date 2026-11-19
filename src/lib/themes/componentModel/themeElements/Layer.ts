import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { SHADOW_ATTRIBUTES } from "./styleAttributes";

/**
 * An extra shadow layer stacked on the shadow that holds it.
 *
 * @example
 * ```xml
 * <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066">
 *   <Layer x="0" y="8" blur="16" spread="-2" color="#00000040" />
 * </Shadow>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Layer;
 * def.attributes.blur.max; // 64
 * ```
 */
export const LAYER_ELEMENT: ElementDef = {
  name: "Layer",
  category: ElementCategory.Structure,
  attributes: SHADOW_ATTRIBUTES,
  children: NO_CHILDREN,
  parents: ["Shadow"],
  since: THEME_SPEC_VERSION,
};
