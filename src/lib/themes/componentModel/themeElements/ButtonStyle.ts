import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import {
  BUTTON_STYLE_PROPERTIES,
  STYLE_SIZE_ATTRIBUTES,
} from "./styleAttributes";

/**
 * One named button style. When `image` is set it draws the whole face and
 * `background` and `border` are ignored. Its states are `hover`,
 * `pressed`, `focused`, `disabled`, `selected` and `active`, applied in
 * the precedence `disabled` > `pressed` > `active` > `selected` >
 * `hover` > `focused`. `basedOn` must stay acyclic and at most 8 levels
 * deep (`E6013`).
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" background="@brush/chrome-gloss"
 *   foreground="#ffffff" border="#0d2766" borderWidth="1"
 *   cornerRadius="16" padding="6" minWidth="32" minHeight="32"
 *   iconSize="16" textStyle="@text/body">
 *   <State name="hover" background="@brush/chrome-gloss-hi" />
 *   <State name="pressed" background="@brush/chrome-gloss-down"
 *     shadow="@shadow/inset" />
 *   <State name="disabled" opacity="0.4" />
 * </ButtonStyle>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.ButtonStyle;
 * def.attributes.iconSize.max; // 64
 * ```
 */
export const BUTTON_STYLE_ELEMENT: ElementDef = {
  name: "ButtonStyle",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    basedOn: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
    ...STYLE_SIZE_ATTRIBUTES,
    ...BUTTON_STYLE_PROPERTIES,
  },
  children: { min: 0, max: null, allowed: ["State"] },
  parents: ["ButtonStyles"],
  since: THEME_SPEC_VERSION,
};
