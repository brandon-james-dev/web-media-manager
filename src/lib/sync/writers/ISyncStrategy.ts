import type { Playlist, Song, SyncDevice } from "@/models";

export interface ISyncStrategy {
  canHandle(device: SyncDevice): boolean;
  /**
   * Sync a device: write the given songs and playlists together in one
   * pass. Already-present tracks are skipped; playlists are upserted by
   * name with their song order preserved (entries whose songs are not yet
   * on the device are skipped).
   *
   * Devices that cannot store playlists (e.g. MTP) simply ignore the
   * playlists argument.
   */
  sync(
    device: SyncDevice,
    songs: Song[],
    playlists: Playlist[]
  ): Promise<void>;
  /**
   * Remove tracks from the device by their on-device track ids
   * (`SyncTrack.id`). Optional: devices whose tracks cannot be addressed
   * this way (MTP) leave it unimplemented.
   */
  removeTracks?(device: SyncDevice, trackIds: number[]): Promise<void>;
}
