import type { Song, SyncDevice } from "@/models";

export interface ISyncStrategy {
  canHandle(device: SyncDevice): boolean;
  syncSongs(device: SyncDevice, songs: Song[]): Promise<void>;
}
