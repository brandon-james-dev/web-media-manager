import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { PALETTE_SLOTS } from "../paletteSlots";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One slot value inside a palette. `slot` must be one of
 * {@link PALETTE_SLOTS}.
 *
 * @example
 * ```xml
 * <Set slot="accent" value="#3d8bff" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Set;
 * def.attributes.slot.values === PALETTE_SLOTS; // true
 * ```
 */
export const SET_ELEMENT: ElementDef = {
  name: "Set",
  category: ElementCategory.Structure,
  attributes: {
    slot: {
      type: ValueType.Enum,
      values: PALETTE_SLOTS,
      required: true,
    },
    value: { type: ValueType.Color, required: true },
  },
  children: NO_CHILDREN,
  parents: ["Palette"],
  since: THEME_SPEC_VERSION,
};
