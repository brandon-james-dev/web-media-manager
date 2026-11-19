import {
  ReferenceKind,
  ValueType,
  defineWidget,
} from "@/core/themes/widgetKit";

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
 * @see [ThemePlaylist](./Playlist.tsx)
 */
export const PLAYLIST_ELEMENT = defineWidget({
  name: "Playlist",
  attributes: {
    artwork: { type: ValueType.Boolean },
    editable: { type: ValueType.Boolean, default: "true" },
    rowText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  minSize: { width: 160, height: 120 },
  perPage: 1,
});
