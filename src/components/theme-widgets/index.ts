import {
  registerThemeWidgets,
  type ElementComponent,
} from "@/lib/themes/render/browser";
import { ThemeArtwork } from "./playback/Artwork";
import { ThemeBackdrop } from "./playback/Backdrop";
import { ThemeLyrics } from "./playback/Lyrics";
import { ThemeNowPlaying } from "./playback/NowPlaying";
import { ThemePlaybackTime } from "./playback/PlaybackTime";
import { ThemePlayQueue } from "./playback/PlayQueue";
import { ThemeSeekBar } from "./playback/SeekBar";
import { ThemeTrackInfo } from "./playback/TrackInfo";
import { ThemeVisualizer } from "./playback/Visualizer";
import { ThemeVolumeControl } from "./playback/VolumeControl";
import { ThemeCollectionSummary } from "./library/CollectionSummary";
import { ThemeDevicePanel } from "./library/DevicePanel";
import { ThemeLibraryBrowser } from "./library/LibraryBrowser";
import { ThemeMetadataEditor } from "./library/MetadataEditor";
import { ThemePlaylist } from "./library/Playlist";
import { ThemeSearchBox } from "./library/SearchBox";
import { ThemeSyncQueue } from "./library/SyncQueue";
import { ThemeTrackList } from "./library/TrackList";

/**
 * The playback widgets the app renders for a theme layout, keyed by the
 * element name the component model declares.
 *
 * @example
 * ```xml
 * <SeekBar grow="1" slider="@slider/seek" />
 * <TrackInfo fields="title artist" />
 * ```
 * @example
 * ```ts
 * const seekBar = THEME_PLAYBACK_WIDGETS.SeekBar;
 * ```
 */
export const THEME_PLAYBACK_WIDGETS: Record<string, ElementComponent> = {
  SeekBar: ThemeSeekBar,
  VolumeControl: ThemeVolumeControl,
  PlaybackTime: ThemePlaybackTime,
  TrackInfo: ThemeTrackInfo,
  Artwork: ThemeArtwork,
  PlayQueue: ThemePlayQueue,
  Lyrics: ThemeLyrics,
  Visualizer: ThemeVisualizer,
  Backdrop: ThemeBackdrop,
  NowPlaying: ThemeNowPlaying,
};

/**
 * The library and sync widgets the app renders for a theme layout, keyed by
 * the element name the component model declares.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="artists albums songs" initialView="artists" />
 * <TrackList variant="table" columns="title artist album duration" />
 * ```
 * @example
 * ```ts
 * const trackList = THEME_LIBRARY_WIDGETS.TrackList;
 * ```
 */
export const THEME_LIBRARY_WIDGETS: Record<string, ElementComponent> = {
  SearchBox: ThemeSearchBox,
  TrackList: ThemeTrackList,
  LibraryBrowser: ThemeLibraryBrowser,
  CollectionSummary: ThemeCollectionSummary,
  Playlist: ThemePlaylist,
  MetadataEditor: ThemeMetadataEditor,
  SyncQueue: ThemeSyncQueue,
  DevicePanel: ThemeDevicePanel,
};

/**
 * Registers the app's widgets with the theme renderer and returns the
 * disposer that removes them again. Extra records spread in on top of the
 * playback and library sets.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const dispose = registerAppThemeWidgets();
 * import.meta.hot?.dispose(dispose);
 * ```
 */
export function registerAppThemeWidgets(
  extra: Readonly<Record<string, ElementComponent>> = {}
): () => void {
  return registerThemeWidgets({
    ...THEME_PLAYBACK_WIDGETS,
    ...THEME_LIBRARY_WIDGETS,
    ...extra,
  });
}
