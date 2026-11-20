import type { IMusicSourceStrategy } from "./IMusicSourceStrategy";
import { LocalMusicSourceStrategy } from "./file/LocalMusicSourceStrategy";
import { SubsonicMusicSourceStrategy } from "./subsonic/SubsonicMusicSourceStrategy";
import { SyncMusicSourceStrategy } from "./sync/SyncMusicSourceStrategy";

/**
 * Registry of music source types the app can add. The selection UI iterates
 * this list to render one card per strategy and dispatches `add()` on the
 * chosen one.
 *
 * Sync devices are deliberately absent: they are sources (so the Sync page
 * can treat them as targets) but they are attached through the device
 * picker, never through "add a music source".
 */
export const musicSourceStrategies: IMusicSourceStrategy[] = [
  new LocalMusicSourceStrategy(),
  new SubsonicMusicSourceStrategy(),
];

/**
 * Every strategy, including kinds that are not user-addable. Dispatch by
 * `kind` (playback, resync, source filter) must use this list, or a sync
 * source resolves to no strategy.
 */
export const allMusicSourceStrategies: IMusicSourceStrategy[] = [
  ...musicSourceStrategies,
  new SyncMusicSourceStrategy(),
];

export * from "./config";
export { resyncAllSources } from "./resync";
export type {
  IMusicSourceStrategy,
  MusicSourceProbe,
  MusicSourceProbeExtension,
} from "./IMusicSourceStrategy";
export type { MusicSourceConfigField } from "./MusicSourceConfigField";
export { LocalMusicSourceStrategy } from "./file/LocalMusicSourceStrategy";
export { SyncMusicSourceStrategy } from "./sync/SyncMusicSourceStrategy";
export type { SubsonicSourceConfig } from "./subsonic/SubsonicMusicSourceStrategy";
export { SubsonicMusicSourceStrategy } from "./subsonic/SubsonicMusicSourceStrategy";
