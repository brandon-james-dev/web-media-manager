import type { SyncDevice } from "@/models";
import { detectors } from "./detectors";
import type { UsbDeviceInfo } from "./usb/UsbDeviceInfo";

export class DeviceScanner {
  async scan(
    usb?: UsbDeviceInfo,
    root?: FileSystemDirectoryHandle
  ): Promise<SyncDevice> {
    for (const detector of detectors) {
      const device = await detector.detect(usb, root);

      if (!device) {
        continue;
      }

      return device;
    }

    throw new Error(`The device is not supported.`);
  }
}
