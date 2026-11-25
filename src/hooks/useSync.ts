import { createContext, useContext, useEffect, useMemo } from "react";
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
  /**
   * True while a device library is being read. Reading an iTunesDB or a ZMDB
   * can take seconds on a large device, and the scan used to run with no
   * indication at all, so the page looked idle.
   */
  isReadingDevices: boolean;
  /** Name of the device being read, or null when nothing is being read. */
  readingDeviceName: string | null;
  /**
   * How far the device read has got, or null when the count is unknown.
   * Reading several devices reports one step per device.
   */
  readingProgress: { completed: number; total: number } | null;
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
   * Delete tracks from a device by their on-device ids, then rescan so every
   * surface sees the new library.
   */
  removeTracksFromDevice(
    device: SyncDevice,
    trackIds: number[]
  ): Promise<void>;
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
 * Source ids that belong to a sync device.
 *
 * A device track is read from the device and never imported into the library,
 * so library-only affordances (favorite, hide, edit) are withheld for it.
 */
export function useDeviceSourceIds(): ReadonlySet<string> {
  const { devices } = useSync();

  return useMemo(() => new Set(devices.map((device) => device.id)), [devices]);
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
