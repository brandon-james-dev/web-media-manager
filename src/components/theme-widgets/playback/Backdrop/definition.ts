import {
  COMMON_ATTRIBUTES,
  ElementCategory,
  NO_CHILDREN,
  THEME_SPEC_VERSION,
  ValueType,
  WIDGET_ATTRIBUTES,
} from "@/lib/themes/widgetKit";
import type { ElementDef } from "@/lib/themes/widgetKit";

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
 * @see [ThemeBackdrop](./Backdrop.tsx)
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
