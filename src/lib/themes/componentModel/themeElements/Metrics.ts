import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * The named length table. Every `@length/` reference resolves to an entry
 * here.
 *
 * @example
 * ```xml
 * <Metrics>
 *   <Length id="gap-sm" value="4" />
 * </Metrics>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Metrics;
 * def.children.allowed; // ["Length"]
 * ```
 */
export const METRICS_ELEMENT: ElementDef = {
  name: "Metrics",
  category: ElementCategory.Structure,
  attributes: {},
  children: { min: 0, max: 1000, allowed: ["Length"] },
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
