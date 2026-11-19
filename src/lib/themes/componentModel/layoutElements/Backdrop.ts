import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * The animated background behind a page: a seeded gradient with dots,
 * circles and notes. `source="artwork"` takes colors from the cover and
 * `palette` from `@slot/accent`. Static when reduced motion is on. No
 * minimum size, one per page.
 *
 * @example
 * ```xml
 * <Grid rows="1* auto">
 *   <Backdrop row="0" rowSpan="2" source="artwork" />
 * </Grid>
 * ```
 * @example
 * ```ts
 * const hasMinSize = LAYOUT_ELEMENTS.Backdrop.minSize !== undefined;
 * ```
 *
 * @see [ThemeBackdrop](../../../../components/theme-widgets/playback/Backdrop.tsx)
 */
export const BACKDROP_ELEMENT: ElementDef = {
  name: "Backdrop",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    source: { type: ValueType.Enum, values: ["artwork", "palette"] },
  },
  children: NO_CHILDREN,
  perPage: 1,
  since: THEME_SPEC_VERSION,
};
