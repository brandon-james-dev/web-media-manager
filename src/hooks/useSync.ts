import { createContext, useContext } from "react";
import type { Song, SyncDevice } from "@/models";
import type { UsbDeviceInfo } from "@/lib/sync";

export interface SyncContextValue {
  devices: SyncDevice[];
  setDevices(devices: SyncDevice[]): void;
  addDevice: (
    usbDevice?: UsbDeviceInfo,
    rootDirectory?: FileSystemDirectoryHandle
  ) => Promise<SyncDevice>;
  removeDevice(id: string): void;
  updateDevice(updatedDevice: SyncDevice): void;

  refreshDevices(): Promise<void>;

  isSyncing: boolean;
  syncQueue(syncDevice: SyncDevice): Promise<void>;

  queuedSongs: Song[];
  queueSongs(songs: Song[]): void;
  removeQueuedSong(songId: string): void;
  clearQueue(): void;
}

export const SyncContext = createContext<SyncContextValue | undefined>(
  undefined
);

export function useSync() {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error("useSync must be used within SyncProvider");
  }

  return context;
}
