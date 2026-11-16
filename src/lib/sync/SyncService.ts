import type { Playlist, Song, SyncDevice } from "@/models";
import type { SyncMusicSource } from "@/core/contracts/sources";
import { DexieSyncDeviceStore } from "../persistence/dexie/DexieSyncDeviceStore";
import { DeviceScanner } from "./DeviceScanner";
import { type UsbDeviceInfo } from "./usb";
import {
  mapSyncDeviceToRecord,
  restoreSyncDevice,
  waitForMount,
} from "./helpers";
import type {
  ISyncStrategy,
  SyncProgressHandler,
  SyncSummary,
} from "./writers/ISyncStrategy";

export class SyncService {
  private scanner = new DeviceScanner();
  private deviceStore = new DexieSyncDeviceStore();

  /* The iPod writer pulls in Node-only (sharp/itunesdb-ts) code, so it's
   * lazily loaded only when an iPod actually needs syncing — keeping the
   * node-builtin chain out of the main browser bundle. The Zune writer is
   * loaded the same way for symmetry and to keep its MTP stack out of the
   * initial bundle. */
  private async getStrategy(
    device: SyncDevice
  ): Promise<ISyncStrategy | undefined> {
    const { IpodSyncStrategy } = await import("./writers/IpodSyncStrategy");
    const { ZuneSyncStrategy } = await import("./writers/ZuneSyncStrategy");
    const options = [new IpodSyncStrategy(), new ZuneSyncStrategy()];
    return options.find((x) => x.canHandle(device));
  }

  async loadPersistedDevices() {
    const records = await this.deviceStore.getAll();

    // Show only devices physically connected right now: match persisted
    // records against the USB devices currently enumerated by the browser.
    // `addDevice` requires a serial number, so every saved record has one.
    // WebUSB (`navigator.usb`) is not available in all browsers (Safari,
    // Firefox) — when absent, there are no connected devices to match.
    const connectedSerials = new Set(
      "usb" in navigator
        ? (await navigator.usb.getDevices())
            .map((device) => device.serialNumber)
            .filter((serial): serial is string => typeof serial === "string")
        : []
    );

    const connectedRecords = records.filter((record) => {
      if (!record.usb?.serialNumber) return false;

      // A Zune has no root handle: its library is read over MTP, so it is
      // connected whenever its USB serial is still enumerated.
      if (!record.rootHandle) {
        return (
          record.type === "zune" &&
          connectedSerials.has(record.usb.serialNumber)
        );
      }

      return connectedSerials.has(record.usb.serialNumber);
    });

    for (const record of connectedRecords) {
      if (record.rootHandle) await waitForMount(record.rootHandle);
    }

    // Read each device independently: one unreadable record (mid-eject,
    // unsupported model) must not blank out every other connected device.
    const devices = await Promise.all(
      connectedRecords.map(async (record) => {
        try {
          return await restoreSyncDevice(record);
        } catch (error) {
          console.warn(`[SyncService] Unable to read "${record.name}":`, error);
          return null;
        }
      })
    );

    return devices.filter((device): device is SyncDevice => device !== null);
  }

  async addDevice(
    rootHandle?: FileSystemDirectoryHandle,
    usbInfo?: UsbDeviceInfo
  ): Promise<SyncDevice> {
    if (!usbInfo) {
      throw new Error("The device cannot be added without USB information");
    }

    // An MTP device (a Zune) has no directory to pick, so a missing root
    // handle is only an error when the device is not one of those.
    const device = await this.scanner.scan(rootHandle, usbInfo);

    if (!device.usb || !device.usb.serialNumber) {
      throw new Error("Unable to get USB info for device");
    }

    await this.deviceStore.save(
      device.usb.serialNumber,
      mapSyncDeviceToRecord(device)
    );

    return device;
  }

  /**
   * Re-read a device that is already a source and persist what changed
   * (name, model, type). Used by `SyncMusicSourceStrategy.sync()` so the
   * source record reflects the device as it is now.
   */
  async refreshSource(source: SyncMusicSource): Promise<void> {
    // A Zune has no mountable filesystem: its library is read over MTP, so
    // there is no directory permission to request. Returning early here made a
    // refresh of a Zune source do nothing at all, silently.
    if (!source.rootHandle) {
      if (source.type !== "zune") {
        console.warn(
          `[SyncService] Cannot refresh "${source.name}": no directory handle`
        );
        return;
      }

      const scanned = await this.scanner.scan(undefined, source.usb);
      const { getSourcesStore } = await import("@/core/ports");

      await getSourcesStore().saveSource({
        ...source,
        name: scanned.name || source.name,
        model: scanned.model ?? source.model,
        type: scanned.type,
        productId: scanned.productId ?? source.productId,
      });

      console.debug(
        `[SyncService] Refreshed "${scanned.name}" over MTP ` +
          `(model=${scanned.model ?? "-"}, type=${scanned.type})`
      );
      return;
    }

    const permission = await source.rootHandle.requestPermission({
      mode: "readwrite",
    });
    if (permission !== "granted") {
      console.warn(
        `[SyncService] Cannot refresh "${source.name}": permission not granted`
      );
      return;
    }

    const scanned = await this.scanner.scan(source.rootHandle, source.usb);
    const { getSourcesStore } = await import("@/core/ports");

    await getSourcesStore().saveSource({
      ...source,
      name: scanned.name || source.name,
      model: scanned.model ?? source.model,
      type: scanned.type,
      productId: scanned.productId ?? source.productId,
    });

    console.debug(
      `[SyncService] Refreshed "${scanned.name}" ` +
        `(model=${scanned.model ?? "-"}, type=${scanned.type})`
    );
  }

  /** Detect mass-storage devices — those needing a directory prompt (e.g. iPod). */
  requiresRootDirectory(usbInfo: UsbDeviceInfo): boolean {
    // Apple iPods (vendor 0x05ac) expose a mass-storage filesystem and so
    // require a directory picker. MTP/PTP devices (Zune, etc.) do not.
    return usbInfo.vendorId === 0x05ac;
  }

  async sync(
    device: SyncDevice,
    songs: Song[],
    playlists: Playlist[],
    onProgress?: SyncProgressHandler
  ): Promise<SyncSummary> {
    const strategy = await this.getStrategy(device);

    if (!strategy) {
      throw new Error(`Unable to sync to "${device.type}".`);
    }

    return strategy.sync(device, songs, playlists, onProgress);
  }

  /**
   * Delete tracks from a device by their on-device ids (`SyncTrack.id`).
   * Throws when the device type cannot delete individual tracks.
   */
  async removeTracks(
    device: SyncDevice,
    trackIds: number[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const strategy = await this.getStrategy(device);

    if (!strategy) {
      throw new Error(`Unable to manage "${device.type}".`);
    }

    if (!strategy.removeTracks) {
      throw new Error(
        `Removing individual tracks is not supported for "${device.type}".`
      );
    }

    await strategy.removeTracks(device, trackIds, onProgress);
  }
}
