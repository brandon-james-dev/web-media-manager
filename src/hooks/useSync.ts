import { createContext, useContext, useEffect } from "react";
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
  /** How far the running sync has got, or null when nothing is syncing. */
  syncProgress: { completed: number; total: number } | null;
  /** Stop the running sync; the queue is left in place for a retry. */
  cancelSync(): void;
  /** Queued songs confirmed on the device by the last run. */
  syncedSongIds: string[];
  /** True once a run finished; the queue stays ticked until it is cleared. */
  syncCompleted: boolean;
  queuedSongs: Song[];
  /**
   * Mark a sync surface (the sidebar queue or the sync page) as mounted.
   * Returns the cleanup that unmarks it. A sync that finishes with no surface
   * mounted reports through a notification instead of silent progress.
   */
  registerSyncUi(): () => void;
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

/**
 * Declare that this component is a visible sync surface. While at least one
 * is mounted, a finished sync updates the on-screen progress instead of
 * raising a notification.
 */
export function useSyncUiVisible(): void {
  const { registerSyncUi } = useSync();

  useEffect(() => registerSyncUi(), [registerSyncUi]);
}
