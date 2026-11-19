import {
  ReferenceKind,
  ValueType,
  defineWidget,
} from "@/core/themes/widgetKit";

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
 * @see [ThemeLibraryBrowser](./LibraryBrowser.tsx)
 */
export const LIBRARY_BROWSER_ELEMENT = defineWidget({
  name: "LibraryBrowser",
  attributes: {
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
  minSize: { width: 160, height: 160 },
  perPage: 1,
});
