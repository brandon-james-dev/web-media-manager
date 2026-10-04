import type { SysInfo } from "@/lib/sync/ipod/parsers/parseSysInfo";

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
