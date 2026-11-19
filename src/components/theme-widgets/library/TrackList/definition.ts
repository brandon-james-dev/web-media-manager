import {
  COMMON_ATTRIBUTES,
  ElementCategory,
  NO_CHILDREN,
  ReferenceKind,
  THEME_SPEC_VERSION,
  TRACK_COLUMN_VALUES,
  ValueType,
  WIDGET_ATTRIBUTES,
} from "@/lib/themes/widgetKit";
import type { ElementDef } from "@/lib/themes/widgetKit";

/**
 * Songs for the current selection on the page: the `LibraryBrowser`
 * selection, the playlist picked in a `Playlist`, or all songs. `variant`
 * is `table`, `albums`, `list` or `tv`, and each option lists the variants
 * that accept it (`E6202`). `albums` groups the rows by album: a header row
 * per album carries the album artist, and a left column shows the cover,
 * album, album artist, genre and year beside that album's tracks, so the
 * `album` column is redundant there and is dropped if listed. `sortBy` must
 * be one of `columns` (`E6203`); a repeated column is `E4004`. `density`
 * sets the row height: `compact` 28 px, `comfortable` 44 px; `tv` is always
 * 72 px. Minimum size depends on the variant. One per page.
 *
 * @example
 * ```xml
 * <TrackList
 *   variant="table"
 *   columns="title artist album duration"
 *   sortBy="artist"
 *   density="compact"
 *   playingText="@text/accent"
 * />
 * <TrackList variant="albums" columns="track title duration" resizeColumns="true" />
 * <TrackList variant="list" fields="artwork artist duration" scrubber="true" />
 * ```
 * @example
 * ```ts
 * const variant = node.attributes.variant ?? "table";
 * for (const [name, attr] of Object.entries(def.attributes)) {
 *   const set = node.attributes[name] !== undefined;
 *   if (set && attr.variants && !attr.variants.includes(variant)) {
 *     issues.push({ code: "E6202", attribute: name });
 *   }
 * }
 * ```
 *
 * @see [ThemeTrackList](./TrackList.tsx)
 */
export const TRACK_LIST_ELEMENT: ElementDef = {
  name: "TrackList",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    variant: {
      type: ValueType.Enum,
      values: ["table", "albums", "list", "tv"],
    },
    columns: {
      type: ValueType.EnumList,
      values: TRACK_COLUMN_VALUES,
      default: "title album artist track genre year duration bitrate offline",
      variants: ["table", "albums"],
    },
    sortBy: {
      type: ValueType.Enum,
      values: TRACK_COLUMN_VALUES,
      default: "title",
      variants: ["table", "albums"],
    },
    sortDirection: {
      type: ValueType.Enum,
      values: ["ascending", "descending"],
      default: "ascending",
      variants: ["table", "albums"],
    },
    columnMenu: {
      type: ValueType.Boolean,
      default: "true",
      variants: ["table", "albums"],
    },
    reorderColumns: {
      type: ValueType.Boolean,
      default: "true",
      variants: ["table", "albums"],
    },
    resizeColumns: {
      type: ValueType.Boolean,
      default: "true",
      variants: ["table", "albums"],
    },
    scrubber: {
      type: ValueType.Boolean,
      variants: ["table", "albums", "list"],
    },
    fields: {
      type: ValueType.EnumList,
      values: [
        "artwork",
        "explicit",
        "artist",
        "album",
        "duration",
        "favorite",
      ],
      variants: ["list", "tv"],
    },
    alternateRows: {
      type: ValueType.Boolean,
      variants: ["table", "albums", "tv"],
    },
    showHeader: {
      type: ValueType.Boolean,
      default: "true",
      variants: ["table", "albums"],
    },
    rowText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    headerText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    playingText: {
      type: ValueType.Reference,
      refKinds: [ReferenceKind.Text],
    },
    alternateBrush: {
      type: ValueType.Reference,
      refKinds: [ReferenceKind.Brush],
    },
  },
  children: NO_CHILDREN,
  minSize: {
    table: { width: 240, height: 120 },
    albums: { width: 360, height: 160 },
    list: { width: 200, height: 120 },
    tv: { width: 480, height: 200 },
  },
  minSizeBy: "variant",
  perPage: 1,
  since: THEME_SPEC_VERSION,
};
