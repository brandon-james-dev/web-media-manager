import { THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * The document root. Its `spec` must match the manifest (`E3010`). Every
 * section is optional except `Palettes`, each may appear at most once, and
 * they must appear in the order listed (`E4012`).
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0">
 *   <Palettes>...</Palettes>
 *   <Defaults text="@text/body" />
 * </Theme>
 * ```
 * @example
 * ```ts
 * const def = THEME_ELEMENTS.Theme;
 * def.attributes.spec.required; // true
 * ```
 */
export const THEME_ELEMENT: ElementDef = {
  name: "Theme",
  category: ElementCategory.Root,
  attributes: {
    spec: { type: ValueType.String, required: true },
  },
  children: {
    min: 1,
    max: 12,
    allowed: [
      "Colors",
      "Palettes",
      "Metrics",
      "Fonts",
      "TextStyles",
      "Images",
      "Brushes",
      "Shadows",
      "ButtonStyles",
      "SliderStyles",
      "PanelStyles",
      "Defaults",
    ],
  },
  since: THEME_SPEC_VERSION,
};
