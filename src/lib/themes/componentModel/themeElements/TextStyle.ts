import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * One named text style. `basedOn` must stay acyclic and at most 8 levels
 * deep (`E6013`), and `maxLines` is only allowed with `overflow="wrap"`
 * (`E6016`).
 *
 * @example
 * ```xml
 * <TextStyle id="caption" basedOn="@text/body" size="11"
 *   color="@slot/mutedForeground" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.TextStyle;
 * def.attributes.overflow.default; // "truncate"
 * ```
 */
export const TEXT_STYLE_ELEMENT: ElementDef = {
  name: "TextStyle",
  category: ElementCategory.Structure,
  attributes: {
    id: { type: ValueType.Id, required: true },
    basedOn: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    font: { type: ValueType.Reference, refKinds: [ReferenceKind.Font] },
    size: { type: ValueType.Length, min: 8, max: 96 },
    weight: { type: ValueType.Integer, min: 100, max: 900 },
    italic: { type: ValueType.Boolean },
    color: { type: ValueType.Color },
    lineHeight: { type: ValueType.Number, min: 0.8, max: 3 },
    letterSpacing: { type: ValueType.Integer, min: -4, max: 16 },
    transform: {
      type: ValueType.Enum,
      values: ["none", "uppercase", "lowercase", "capitalize"],
    },
    align: { type: ValueType.Enum, values: ["start", "center", "end"] },
    overflow: {
      type: ValueType.Enum,
      values: ["truncate", "wrap"],
      default: "truncate",
    },
    maxLines: { type: ValueType.Integer, min: 1, max: 10 },
    shadow: { type: ValueType.Reference, refKinds: [ReferenceKind.Shadow] },
  },
  children: NO_CHILDREN,
  parents: ["TextStyles"],
  since: THEME_SPEC_VERSION,
};
