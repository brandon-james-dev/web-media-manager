import { createContext, useContext } from "react";
import type { Song, SyncDevice } from "@/models";
import type { UsbDeviceInfo } from "@/lib/sync";

export interface SyncContextValue {
  devices: SyncDevice[];
  /** Query/value-returning orchestration calls are intentionally not events:
   *  addDevice is a wizard flow returning the new device; refreshDevices
   *  returns state. All other sync actions are bus commands (wmm.sync.*). */
  addDevice: (
    usbDevice?: UsbDeviceInfo,
    rootDirectory?: FileSystemDirectoryHandle
  ) => Promise<SyncDevice>;
  refreshDevices(): Promise<void>;
  isSyncing: boolean;
  queuedSongs: Song[];
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
