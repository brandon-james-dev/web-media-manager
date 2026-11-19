import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { LAYOUT_LIST, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * Places children in cells of 1–12 columns and 1–12 rows. Each track is a
 * Length, `auto`, or a star share `N*` (N = 1–100); an omitted list means
 * one `1*` track. A child's cell and span must lie inside the grid
 * (`E6041`). Overlapping children are allowed, later ones on top.
 *
 * @example
 * ```xml
 * <Grid columns="220 1* 2*" rows="auto 1*" columnGap="4" rowGap="4">
 *   <SearchBox row="0" column="0" columnSpan="3" />
 *   <LibraryBrowser row="1" column="0" />
 *   <TrackList row="1" column="1" columnSpan="2" />
 * </Grid>
 * ```
 * @example
 * ```ts
 * if (column + columnSpan > columnCount || row + rowSpan > rowCount) {
 *   issues.push({ code: "E6041", element: child.name });
 * }
 * ```
 *
 * @see [Grid](../../render/layout/browser/elements/Grid.tsx)
 */
export const GRID_ELEMENT: ElementDef = {
  name: "Grid",
  category: ElementCategory.Primitive,
  attributes: {
    ...COMMON_ATTRIBUTES,
    columns: { type: ValueType.GridTracks },
    rows: { type: ValueType.GridTracks },
    columnGap: { type: ValueType.Length },
    rowGap: { type: ValueType.Length },
  },
  children: LAYOUT_LIST,
  since: THEME_SPEC_VERSION,
};
