import type { Song, SyncDevice } from "@/models";
import { DexieSyncDeviceStore } from "../persistence/dexie/DexieSyncDeviceStore";
import { DeviceScanner } from "./DeviceScanner";
import { type UsbDeviceInfo } from "./usb";
import {
  mapSyncDeviceToRecord,
  restoreSyncDevice,
  waitForMount,
} from "./helpers";
import { IpodSyncStrategy } from "./writers";

export class SyncService {
  private readonly scanner = new DeviceScanner();
  private readonly deviceStore = new DexieSyncDeviceStore();
  private readonly strategies = [new IpodSyncStrategy()];

  async loadPersistedDevices() {
    const records = await this.deviceStore.getAll();

    // Show only devices physically connected right now: match persisted
    // records against the USB devices currently enumerated by the browser.
    // `addDevice` requires a serial number, so every saved record has one.
    const connectedSerials = new Set(
      (await navigator.usb.getDevices())
        .map((device) => device.serialNumber)
        .filter((serial): serial is string => typeof serial === "string")
    );

    const connectedRecords = records.filter((record) => {
      if (!record.rootHandle || !record.usb?.serialNumber) return false;

      return connectedSerials.has(record.usb.serialNumber);
    });

    for (const record of connectedRecords) {
      await waitForMount(record.rootHandle!);
    }

    // Read each device independently: one unreadable record (mid-eject,
    // unsupported model) must not blank out every other connected device.
    const devices = await Promise.all(
      connectedRecords.map(async (record) => {
        try {
          return await restoreSyncDevice(record);
        } catch (error) {
          console.warn(
            `[SyncService] Unable to read "${record.name}":`,
            error
          );
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

    if (!rootHandle) {
      throw new Error("The selected directory is invalid");
    }

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

  /** Detect mass-storage devices — those needing a directory prompt (e.g. iPod). */
  requiresRootDirectory(usbInfo: UsbDeviceInfo): boolean {
    // Apple iPods (vendor 0x05ac) expose a mass-storage filesystem and so
    // require a directory picker. MTP/PTP devices (Zune, etc.) do not.
    return usbInfo.vendorId === 0x05ac;
  }

  async syncSongs(device: SyncDevice, songs: Song[]): Promise<void> {
    const strategy = this.strategies.find((x) => x.canHandle(device));

    if (!strategy) {
      throw new Error(`Unable to sync to "${device.type}".`);
    }

    await strategy.sync(device, songs);
  }

  /**
   * Delete tracks from a device by their on-device ids (`SyncTrack.id`).
   * Throws when the device type cannot delete individual tracks.
   */
  async removeTracks(
    device: SyncDevice,
    trackIds: number[]
  ): Promise<void> {
    const strategy = this.strategies.find((x) => x.canHandle(device));

    if (!strategy) {
      throw new Error(`Unable to manage "${device.type}".`);
    }

    if (!strategy.removeTracks) {
      throw new Error(
        `Removing individual tracks is not supported for "${device.type}".`
      );
    }

    await strategy.removeTracks(device, trackIds);
  }
}
