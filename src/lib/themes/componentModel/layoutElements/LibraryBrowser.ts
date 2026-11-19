import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * Navigates artists, albums, genres, playlists and songs. Its selection
 * drives the `TrackList` on the same page. `views` is an ordered subset of
 * the five views. `display` is `list`, `grid` or `tree`: `tree` renders a
 * vertical navigation tree with a playlists node and a library node whose
 * children are the other views, each expandable into its values. Minimum
 * 160×160, one per page.
 *
 * @example
 * ```xml
 * <LibraryBrowser
 *   views="artists albums playlists"
 *   initialView="albums"
 *   display="grid"
 *   artwork="true"
 *   panel="@panel/inset"
 * />
 * <LibraryBrowser views="playlists artists albums songs" display="tree" />
 * ```
 * @example
 * ```ts
 * const def = LAYOUT_ELEMENTS.LibraryBrowser;
 * const found = pageWidgets.filter((n) => n.name === def.name);
 * if (typeof def.perPage === "number" && found.length > def.perPage) {
 *   reportSpecMismatch(found[def.perPage]);
 * }
 * ```
 *
 * @see [ThemeLibraryBrowser](../../../../components/theme-widgets/library/LibraryBrowser.tsx)
 */
export const LIBRARY_BROWSER_ELEMENT: ElementDef = {
  name: "LibraryBrowser",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    views: {
      type: ValueType.EnumList,
      values: ["artists", "albums", "genres", "playlists", "songs"],
    },
    initialView: {
      type: ValueType.Enum,
      values: ["artists", "albums", "genres", "playlists", "songs"],
    },
    display: { type: ValueType.Enum, values: ["list", "grid", "tree"] },
    artwork: { type: ValueType.Boolean },
    itemText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    headerText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  minSize: { width: 160, height: 160 },
  perPage: 1,
  since: THEME_SPEC_VERSION,
};
