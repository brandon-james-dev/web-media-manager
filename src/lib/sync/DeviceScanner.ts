import type { SyncDevice } from "@/models";
import { getDetectors } from "./detectors";
import { mapUsbDevice, USB_DEVICE_FILTERS } from "./usb";
import type { UsbDeviceInfo } from "./usb/UsbDeviceInfo";

export class DeviceScanner {
  async scan(
    root: FileSystemDirectoryHandle | undefined,
    usb?: UsbDeviceInfo
  ): Promise<SyncDevice> {
    for (const detector of await getDetectors()) {
      const device = await detector.detect(root, usb);

      if (!device) {
        continue;
      }

      if (!usb) {
        usb = await this.tryGetUsbInfo();
      }

      if (usb) {
        device.usb = usb;
      }

      // An MTP device (a Zune) has no mountable filesystem, so there is no
      // root handle to attach; its library is read over the MTP session.
      if (root) {
        device.rootHandle = root;
      }

      return device;
    }

    throw new Error(`"${root?.name ?? "device"}" is not a supported device.`);
  }

  private async tryGetUsbInfo() {
    try {
      const usbDevice = await navigator.usb.requestDevice({
        filters: USB_DEVICE_FILTERS,
      });

      return mapUsbDevice(usbDevice);
    } catch {
      return undefined;
    }
  }
}
