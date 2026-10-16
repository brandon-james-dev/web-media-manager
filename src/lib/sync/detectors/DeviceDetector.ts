import type { SyncDevice } from "@/models";
import type { UsbDeviceInfo } from "../usb";

export interface DeviceDetector {
  detect(
    root: FileSystemDirectoryHandle,
    usb?: UsbDeviceInfo
  ): Promise<SyncDevice | undefined>;
}
