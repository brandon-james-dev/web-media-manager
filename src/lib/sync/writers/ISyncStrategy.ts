import type { Song, SyncDevice } from "@/models";

export interface ISyncStrategy {
  canHandle(device: SyncDevice): boolean;
  sync(device: SyncDevice, songs: Song[]): Promise<void>;
}
