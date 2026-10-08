import type { UsbDeviceInfo } from "@/lib/sync";
import type { SyncDeviceType } from "./SyncDevice";

export interface SyncDeviceRecord {
  id: string;
  name: string;
  createdAt: number;
  productId?: number;
  usb?: UsbDeviceInfo;

  type: SyncDeviceType;
  rootHandle?: FileSystemDirectoryHandle;
}
