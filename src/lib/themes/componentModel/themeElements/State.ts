import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import {
  BUTTON_STYLE_PROPERTIES,
  SLIDER_STYLE_PROPERTIES,
  STYLE_SIZE_ATTRIBUTES,
} from "./styleAttributes";

/**
 * One static appearance of a button or slider style, applied instantly
 * rather than animated. `value` matches one value of a multi-valued
 * command state, and is only allowed on `active`. Overriding `basedOn`,
 * `minWidth` or `minHeight`, setting a property of the other style kind,
 * or naming a state the style kind does not support is `E6015`.
 *
 * @example
 * ```xml
 * <ButtonStyle id="repeat" basedOn="@button/transport">
 *   <State name="active" value="one" foreground="@slot/accent" />
 * </ButtonStyle>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.State;
 * def.attributes.name.values; // ["hover", "pressed", ...]
 * ```
 */
export const STATE_ELEMENT: ElementDef = {
  name: "State",
  category: ElementCategory.Structure,
  attributes: {
    name: {
      type: ValueType.Enum,
      values: ["hover", "pressed", "focused", "disabled", "selected", "active"],
      required: true,
    },
    value: { type: ValueType.String },
    basedOn: {
      type: ValueType.Reference,
      refKinds: [ReferenceKind.Button, ReferenceKind.Slider],
    },
    ...STYLE_SIZE_ATTRIBUTES,
    ...BUTTON_STYLE_PROPERTIES,
    ...SLIDER_STYLE_PROPERTIES,
  },
  children: NO_CHILDREN,
  parents: ["ButtonStyle", "SliderStyle"],
  since: THEME_SPEC_VERSION,
};
