import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * The playlists list. Picking one fills the page's `TrackList`, and rows
 * from a `TrackList` can be dragged onto it. `editable` adds a
 * new-playlist button and gives each row a context menu with play, rename
 * and delete, F2 to rename the focused row and Delete to ask before
 * deleting it; `editable="false"` leaves the list read-only. The play queue
 * is `PlayQueue`. Minimum 160×120, one per page.
 *
 * @example
 * ```xml
 * <Tab id="playlists" titleKey="navigation.playlists" icon="@icon/playlists">
 *   <Playlist artwork="true" rowText="@text/body" />
 * </Tab>
 * <Playlist artwork="false" editable="false" />
 * ```
 * @example
 * ```ts
 * const min = LAYOUT_ELEMENTS.Playlist.minSize as Size;
 * if (box.width < min.width || box.height < min.height) {
 *   issues.push({ code: "W6071", element: "Playlist" });
 * }
 * ```
 *
 * @see [ThemePlaylist](../../../../components/theme-widgets/library/Playlist.tsx)
 */
export const PLAYLIST_ELEMENT: ElementDef = {
  name: "Playlist",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    artwork: { type: ValueType.Boolean },
    editable: { type: ValueType.Boolean, default: "true" },
    rowText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  minSize: { width: 160, height: 120 },
  perPage: 1,
  since: THEME_SPEC_VERSION,
};
