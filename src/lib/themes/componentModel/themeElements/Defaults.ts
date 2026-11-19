import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * The style each element kind falls back to when it names none. If absent,
 * the host's palette-derived styles apply.
 *
 * @example
 * ```xml
 * <Defaults button="@button/standard" panel="@panel/plain"
 *   text="@text/body" />
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Defaults;
 * def.attributes.button.refKinds; // ["button"]
 * ```
 */
export const DEFAULTS_ELEMENT: ElementDef = {
  name: "Defaults",
  category: ElementCategory.Structure,
  attributes: {
    button: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
    panel: { type: ValueType.Reference, refKinds: [ReferenceKind.Panel] },
    text: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  parents: ["Theme"],
  since: THEME_SPEC_VERSION,
};
