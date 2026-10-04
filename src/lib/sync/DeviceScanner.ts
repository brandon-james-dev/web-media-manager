import type { SyncDevice } from "@/models";
import { detectors } from "./detectors";
import { mapUsbDevice } from "./usb/mapUsbDevice";
import type { UsbDeviceInfo } from "./usb/UsbDeviceInfo";

export class DeviceScanner {
  async scan(
    root: FileSystemDirectoryHandle,
    usb?: UsbDeviceInfo
  ): Promise<SyncDevice> {
    for (const detector of detectors) {
      const device = await detector.detect(root);

      if (!device) {
        continue;
      }

      if (!usb) {
        usb = await this.tryGetUsbInfo();
      }

      if (usb) {
        device.usb = usb;
      }

      return device;
    }

    throw new Error(`"${root.name}" is not a supported device.`);
  }

  private async tryGetUsbInfo() {
    try {
      const usbDevice = await navigator.usb.requestDevice({
        filters: [
          { classCode: 0x06 }, // MTP/PTP
          { classCode: 0x08 }, // Mass Storage
        ],
      });

      return mapUsbDevice(usbDevice);
    } catch {
      return undefined;
    }
  }
}
