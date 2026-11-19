import { ValueType, defineWidget } from "@/core/themes/widgetKit";

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
export const BACKDROP_ELEMENT = defineWidget({
  name: "Backdrop",
  attributes: {
    source: { type: ValueType.Enum, values: ["artwork", "palette"] },
  },
  perPage: 1,
});
