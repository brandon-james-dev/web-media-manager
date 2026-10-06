import type { SyncDeviceRecord, SyncLibrary } from ".";

export interface SyncDevice extends SyncDeviceRecord {
  model?: string;
  connected: boolean;

  media: SyncLibrary;

  capabilities: {
    database: boolean;
    artwork: boolean;
    playlists: boolean;
    playbackStats: boolean;
  };

  storage?: {
    capacityBytes?: number;
    usedBytes?: number;
  };
}

export type SyncDeviceType =
  | "iPod"
  | "zune"
  | "mtp"
  | "mass-storage"
  | "unknown";
