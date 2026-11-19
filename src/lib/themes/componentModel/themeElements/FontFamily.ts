import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One font family with up to 16 faces. A theme holds at most 8 families
 * and a family at most 16 faces (`E6016`). `fallback` picks the host stack
 * used when no face loads.
 *
 * @example
 * ```xml
 * <FontFamily id="ui" fallback="sansSerif">
 *   <Face src="assets/fonts/ui-regular.woff2" weight="400" style="normal" />
 * </FontFamily>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.FontFamily;
 * def.children.max; // 16
 * ```
 */
export const FONT_FAMILY_ELEMENT: ElementDef = {
  name: "FontFamily",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    fallback: {
      type: ValueType.Enum,
      values: ["sansSerif", "serif", "monospace", "systemUi"],
      required: true,
    },
  },
  children: { min: 0, max: 16, allowed: ["Face"] },
  parents: ["Fonts"],
  since: THEME_SPEC_VERSION,
};
