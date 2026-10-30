import type { Song, SyncDevice } from "@/models";

export interface ISyncStrategy {
  canHandle(device: SyncDevice): boolean;
  /** Add the given songs to the device. Already-present tracks are skipped. */
  sync(device: SyncDevice, songs: Song[]): Promise<void>;
  /**
   * Remove tracks from the device by their on-device track ids
   * (`SyncTrack.id`). Optional: devices whose tracks cannot be addressed
   * this way (MTP) leave it unimplemented.
   */
  removeTracks?(device: SyncDevice, trackIds: number[]): Promise<void>;
}
