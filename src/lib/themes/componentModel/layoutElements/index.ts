import { LAYOUT_ELEMENT } from "./Layout";
import { SHELL_ELEMENT } from "./Shell";
import { PAGE_ELEMENT } from "./Page";
import { PAGE_HOST_ELEMENT } from "./PageHost";
import { PANEL_ELEMENT } from "./Panel";
import { STACK_ELEMENT } from "./Stack";
import { DOCK_PANEL_ELEMENT } from "./DockPanel";
import { GRID_ELEMENT } from "./Grid";
import { TABS_ELEMENT } from "./Tabs";
import { TAB_ELEMENT } from "./Tab";
import { TAB_STRIP_END_ELEMENT } from "./TabStripEnd";
import { BUTTON_ELEMENT } from "./Button";
import { TEXT_ELEMENT } from "./Text";
import { IMAGE_ELEMENT } from "./Image";
import { LIBRARY_BROWSER_ELEMENT } from "./LibraryBrowser";
import { TRACK_LIST_ELEMENT } from "./TrackList";
import { COLLECTION_SUMMARY_ELEMENT } from "./CollectionSummary";
import { PLAYLIST_ELEMENT } from "./Playlist";
import { METADATA_EDITOR_ELEMENT } from "./MetadataEditor";
import { SYNC_QUEUE_ELEMENT } from "./SyncQueue";
import { DEVICE_PANEL_ELEMENT } from "./DevicePanel";
import { SEARCH_BOX_ELEMENT } from "./SearchBox";
import { ARTWORK_ELEMENT } from "./Artwork";
import { TRACK_INFO_ELEMENT } from "./TrackInfo";
import { PLAYBACK_TIME_ELEMENT } from "./PlaybackTime";
import { SEEK_BAR_ELEMENT } from "./SeekBar";
import { VOLUME_CONTROL_ELEMENT } from "./VolumeControl";
import { PLAY_QUEUE_ELEMENT } from "./PlayQueue";
import { LYRICS_ELEMENT } from "./Lyrics";
import { VISUALIZER_ELEMENT } from "./Visualizer";
import { BACKDROP_ELEMENT } from "./Backdrop";
import { NOW_PLAYING_ELEMENT } from "./NowPlaying";
import type { ElementDef } from "../types";

/**
 * Every element a v1 layout file may contain, keyed by its exact XML element
 * name. The validator reads each definition to check category, attributes,
 * children, parents, minimum size and per-page cardinality. A name missing
 * from this table is an unknown element.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell>
 *     <DockPanel>
 *       <LibraryBrowser dock="start" width="220" />
 *       <TrackList dock="fill" />
 *     </DockPanel>
 *   </Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * const def = getElementDef(node.name);
 * if (!def) {
 *   reportUnknownElement(node);
 * }
 * ```
 */
export const LAYOUT_ELEMENTS: Readonly<Record<string, ElementDef>> = {
  Layout: LAYOUT_ELEMENT,
  Shell: SHELL_ELEMENT,
  Page: PAGE_ELEMENT,
  PageHost: PAGE_HOST_ELEMENT,
  Panel: PANEL_ELEMENT,
  Stack: STACK_ELEMENT,
  DockPanel: DOCK_PANEL_ELEMENT,
  Grid: GRID_ELEMENT,
  Tabs: TABS_ELEMENT,
  Tab: TAB_ELEMENT,
  TabStripEnd: TAB_STRIP_END_ELEMENT,
  Button: BUTTON_ELEMENT,
  Text: TEXT_ELEMENT,
  Image: IMAGE_ELEMENT,
  LibraryBrowser: LIBRARY_BROWSER_ELEMENT,
  TrackList: TRACK_LIST_ELEMENT,
  CollectionSummary: COLLECTION_SUMMARY_ELEMENT,
  Playlist: PLAYLIST_ELEMENT,
  MetadataEditor: METADATA_EDITOR_ELEMENT,
  SyncQueue: SYNC_QUEUE_ELEMENT,
  DevicePanel: DEVICE_PANEL_ELEMENT,
  SearchBox: SEARCH_BOX_ELEMENT,
  Artwork: ARTWORK_ELEMENT,
  TrackInfo: TRACK_INFO_ELEMENT,
  PlaybackTime: PLAYBACK_TIME_ELEMENT,
  SeekBar: SEEK_BAR_ELEMENT,
  VolumeControl: VOLUME_CONTROL_ELEMENT,
  PlayQueue: PLAY_QUEUE_ELEMENT,
  Lyrics: LYRICS_ELEMENT,
  Visualizer: VISUALIZER_ELEMENT,
  Backdrop: BACKDROP_ELEMENT,
  NowPlaying: NOW_PLAYING_ELEMENT,
};

export { TRACK_INFO_FIELDS } from "./TrackInfo";
