import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One named panel style. `clip` defaults to true when `cornerRadius` is
 * above 0, so it has no static default. `textStyle` is the default for
 * every text descendant.
 *
 * @example
 * ```xml
 * <PanelStyle id="inset" background="@slot/card" border="@slot/border"
 *   borderWidth="1" cornerRadius="4" padding="4" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.PanelStyle;
 * def.attributes.clip.type; // ValueType.Boolean
 * ```
 */
export const PANEL_STYLE_ELEMENT: ElementDef = {
  name: "PanelStyle",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    basedOn: { type: ValueType.Reference, refKinds: [ReferenceKind.Panel] },
    background: { type: ValueType.Brush },
    border: { type: ValueType.Color },
    borderWidth: { type: ValueType.Thickness },
    cornerRadius: { type: ValueType.CornerRadius },
    padding: { type: ValueType.Thickness },
    shadow: { type: ValueType.Reference, refKinds: [ReferenceKind.Shadow] },
    clip: { type: ValueType.Boolean },
    textStyle: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  parents: ["PanelStyles"],
  since: THEME_SPEC_VERSION,
};
