import type { SyncDevice } from "@/models";
import type { UsbDeviceInfo } from "..";

export interface DeviceDetector {
  detect(
    usb?: UsbDeviceInfo,
    root?: FileSystemDirectoryHandle
  ): Promise<SyncDevice | undefined>;
}
