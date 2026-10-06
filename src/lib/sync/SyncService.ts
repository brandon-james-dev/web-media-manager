import type { Song, SyncDevice } from "@/models";
import { DexieSyncDeviceStore } from "../dexie-utils/DexieSyncDeviceStore";
import { DeviceScanner } from "./DeviceScanner";
import { mapUsbDevice, type UsbDeviceInfo } from "./usb";
import {
  mapSyncDeviceToRecord,
  DirectoryPickerRequiredError,
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

    for (const rec of records) {
      if (!rec.rootHandle) continue;
      await waitForMount(rec.rootHandle);
    }

    const devices = await Promise.all(
      records.map((record) => restoreSyncDevice(record))
    );

    return devices.filter((device): device is SyncDevice => device !== null);
  }

  async addDevice(
    rootHandle?: FileSystemDirectoryHandle,
    usbInfo?: UsbDeviceInfo
  ): Promise<SyncDevice> {
    if (!usbInfo) {
      const usbDevice = await navigator.usb.requestDevice({
        filters: [
          { classCode: 0x06 }, // MTP/PTP
          { classCode: 0x08 }, // Mass Storage
        ],
      });

      usbInfo = mapUsbDevice(usbDevice);

      const isMassStorage = usbDevice.configurations.some((configuration) =>
        configuration.interfaces.some(
          (iface) => iface.alternate.interfaceClass === 0x08
        )
      );

      if (isMassStorage) {
        throw new DirectoryPickerRequiredError(usbInfo);
      }
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

  async syncSongs(device: SyncDevice, songs: Song[]): Promise<void> {
    const strategy = this.strategies.find((x) => x.canHandle(device));

    if (!strategy) {
      throw new Error(`Unable to sync to "${device.type}".`);
    }

    await strategy.syncSongs(device, songs);
  }
}
