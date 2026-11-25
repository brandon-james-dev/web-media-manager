import type { SyncDevice } from "@/models";
import type { UsbDeviceInfo } from "../usb";

/** How far a device library read has got, counted in tracks. */
export type DeviceReadProgress = (completed: number, total: number) => void;

export interface DeviceDetector {
  detect(
    root: FileSystemDirectoryHandle | undefined,
    usb?: UsbDeviceInfo,
    onProgress?: DeviceReadProgress
  ): Promise<SyncDevice | undefined>;
}
