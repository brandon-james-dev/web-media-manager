import type { SysInfo } from "@/lib/sync/ipod";
import type { SyncArtwork, SyncPlaylist, SyncTrack } from ".";

export interface SyncDevice {
  id: string;
  name: string;
  type: SyncDeviceType;

  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;

  usb?: {
    vendorId: number;
    productId: number;
    manufacturerName: string | null;
    productName: string | null;
    serialNumber: string | null;
  };

  capabilities: {
    database: boolean;
    artwork: boolean;
    playlists: boolean;
    playbackStats: boolean;
  };

  sysInfo: SysInfo;

  media?: {
    tracks: SyncTrack[];
    artworks: SyncArtwork[];
    playlists: SyncPlaylist[];
  };

  storage?: {
    capacityBytes?: number;
    usedBytes?: number;
  };

  rootHandle?: FileSystemDirectoryHandle;
  connected: boolean;
}

export type SyncDeviceType =
  | "iPod"
  | "zune"
  | "mtp"
  | "mass-storage"
  | "unknown";
