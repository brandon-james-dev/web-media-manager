import type { SyncDevice } from "@/models";
import { DeviceScanner } from "./DeviceScanner";
import { mapUsbDevice } from "./usb/mapUsbDevice";
import { DirectoryPickerRequiredError } from "./helpers";
import type { UsbDeviceInfo } from "./usb/UsbDeviceInfo";

export class SyncService {
  private readonly scanner = new DeviceScanner();

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

    device.usb = usbInfo;

    return device;
  }
}
