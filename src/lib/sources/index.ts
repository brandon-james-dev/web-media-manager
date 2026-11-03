import type { IMusicSourceStrategy } from "./IMusicSourceStrategy";
import { LocalMusicSourceStrategy } from "./file/LocalMusicSourceStrategy";
import { SubsonicMusicSourceStrategy } from "./subsonic/SubsonicMusicSourceStrategy";

/**
 * Registry of music source types the app can add. The selection UI iterates
 * this list to render one card per strategy and dispatches `add()` on the
 * chosen one.
 */
export const musicSourceStrategies: IMusicSourceStrategy[] = [
  new LocalMusicSourceStrategy(),
  new SubsonicMusicSourceStrategy(),
];

export * from "./config";
export { resyncAllSources } from "./resync";
export type { IMusicSourceStrategy } from "./IMusicSourceStrategy";
export type { MusicSourceConfigField } from "./MusicSourceConfigField";
export { LocalMusicSourceStrategy } from "./file/LocalMusicSourceStrategy";
export type { SubsonicSourceConfig } from "./subsonic/SubsonicMusicSourceStrategy";
export { SubsonicMusicSourceStrategy } from "./subsonic/SubsonicMusicSourceStrategy";
